/**
 * x402 Payment Manager
 * Handles x402 micropayments for API calls
 * Tracks costs, maintains balances, and ensures sufficient funding
 */

import logger from '../utils/logger.js'
import config from '../config/index.js'

export interface PaymentRecord {
  service: string
  cost: number
  timestamp: number
  success: boolean
  description?: string
}

export interface PaymentStats {
  totalCost: number
  callCount: number
  averageCost: number
  lastCall: number
  records: PaymentRecord[]
}

export class X402PaymentManager {
  private stats: PaymentStats = {
    totalCost: 0,
    callCount: 0,
    averageCost: 0,
    lastCall: 0,
    records: []
  }

  private account: any
  private dreamsRouter: any

  constructor(account: any, dreamsRouter: any) {
    this.account = account
    this.dreamsRouter = dreamsRouter
    logger.info('✓ X402 Payment Manager initialized')
  }

  /**
   * Record a payment
   */
  recordPayment(service: string, cost: number, success: boolean = true, description?: string): void {
    const record: PaymentRecord = {
      service,
      cost,
      timestamp: Date.now(),
      success,
      description
    }

    this.stats.records.push(record)
    this.stats.lastCall = Date.now()

    if (success) {
      this.stats.totalCost += cost
      this.stats.callCount++
      this.stats.averageCost = this.stats.totalCost / this.stats.callCount
    }

    // Keep only last 1000 records
    if (this.stats.records.length > 1000) {
      this.stats.records = this.stats.records.slice(-1000)
    }

    logger.info(`💰 x402 Payment: ${service} - $${(cost / 100000).toFixed(4)} USDC (Total: $${(this.stats.totalCost / 100000).toFixed(2)})`)
  }

  /**
   * Get current balance
   */
  async getBalance(): Promise<number> {
    try {
      if (!this.account || !this.account.getBalance) {
        logger.warn('Account not available for balance check')
        return 0
      }

      const balance = await this.account.getBalance()
      logger.info(`💰 x402 Account Balance: ${balance}`)
      return balance
    } catch (error) {
      logger.error('Failed to get x402 balance:', error)
      return 0
    }
  }

  /**
   * Check if sufficient balance for call
   */
  async hasSufficientBalance(requiredAmount: number): Promise<boolean> {
    try {
      const balance = await this.getBalance()
      const hasSufficient = balance >= requiredAmount

      if (!hasSufficient) {
        logger.warn(`⚠️  Insufficient x402 balance: ${balance} < ${requiredAmount}`)
      }

      return hasSufficient
    } catch (error) {
      logger.error('Failed to check balance:', error)
      return false
    }
  }

  /**
   * Refill account if needed
   */
  async refillIfNeeded(minimumBalance: number = 1000000): Promise<boolean> {
    try {
      const balance = await this.getBalance()

      if (balance < minimumBalance) {
        logger.info(`🔄 Refilling x402 account (current: ${balance}, minimum: ${minimumBalance})`)

        if (this.account && this.account.refill) {
          const success = await this.account.refill(BigInt(minimumBalance * 2))
          if (success) {
            logger.info(`✓ x402 account refilled`)
            return true
          }
        }
      }

      return true
    } catch (error) {
      logger.error('Failed to refill x402 account:', error)
      return false
    }
  }

  /**
   * Get payment statistics
   */
  getStats(): PaymentStats {
    return { ...this.stats }
  }

  /**
   * Get recent payments
   */
  getRecentPayments(limit: number = 20): PaymentRecord[] {
    return this.stats.records.slice(-limit)
  }

  /**
   * Get cost breakdown by service
   */
  getCostBreakdown(): Record<string, { count: number; total: number; average: number }> {
    const breakdown: Record<string, { count: number; total: number; average: number }> = {}

    for (const record of this.stats.records) {
      if (!breakdown[record.service]) {
        breakdown[record.service] = { count: 0, total: 0, average: 0 }
      }

      if (record.success) {
        breakdown[record.service].count++
        breakdown[record.service].total += record.cost
        breakdown[record.service].average = breakdown[record.service].total / breakdown[record.service].count
      }
    }

    return breakdown
  }

  /**
   * Format cost for display
   */
  static formatCost(costInSmallestUnit: number): string {
    // Assuming 100000 = $0.01 USDC (6 decimals)
    return `$${(costInSmallestUnit / 100000).toFixed(4)}`
  }

  /**
   * Get monthly cost estimate
   */
  getMonthlyEstimate(): { estimated: number; actual: number } {
    const now = Date.now()
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000

    const monthlyRecords = this.stats.records.filter(r => r.timestamp > oneMonthAgo && r.success)
    const actualCost = monthlyRecords.reduce((sum, r) => sum + r.cost, 0)

    // Estimate based on call frequency
    const callsPerDay = monthlyRecords.length / 30
    const estimatedMonthly = callsPerDay * 30 * (this.stats.averageCost || 0)

    return {
      actual: actualCost,
      estimated: estimatedMonthly
    }
  }
}

// Cost constants (in smallest unit, e.g., 100000 = $0.01)
export const X402_COSTS = {
  LLM_CALL: 100000,        // $0.10 for GPT-4o
  QUESTFLOW_CALL: 50000,   // $0.05 for Questflow
  INDIGO_QUERY: 50000,     // $0.05 for Indigo AI
  PROJECT_SCREEN: 20000,   // $0.02 for project screening
}
