import config from "../config/index.js"
import logger from "../utils/logger.js"

export class BalanceManager {
  private account: any
  private minBalance: bigint
  private refillThreshold: bigint
  private refillAmount: bigint
  private costPerDecision: bigint = BigInt("100000") // $0.10

  constructor(account: any) {
    this.account = account
    this.minBalance = BigInt(Math.floor(parseFloat(config.MIN_BALANCE_USDC) * 1000000))
    this.refillThreshold = BigInt(Math.floor(parseFloat(config.REFILL_THRESHOLD_USDC) * 1000000))
    this.refillAmount = BigInt(Math.floor(parseFloat(config.REFILL_AMOUNT_USDC) * 1000000))
  }

  async getBalance(): Promise<number> {
    try {
      const balance = await this.account.getBalance()
      return Number(balance) / 1000000 // Convert to USDC
    } catch (error) {
      logger.error("Failed to get balance:", error)
      throw error
    }
  }

  async canMakeDecision(): Promise<boolean> {
    try {
      const balance = await this.account.getBalance()
      const canTrade = balance > this.minBalance + this.costPerDecision
      
      if (!canTrade) {
        logger.warn(`Insufficient balance for decision: $${Number(balance) / 1000000}`)
      }
      
      return canTrade
    } catch (error) {
      logger.error("Failed to check if can make decision:", error)
      return false
    }
  }

  async checkAndRefill(): Promise<boolean> {
    try {
      const balance = await this.account.getBalance()

      if (balance < this.refillThreshold) {
        logger.warn(`Balance low: $${Number(balance) / 1000000}. Attempting refill...`)

        try {
          await this.account.refill(this.refillAmount)
          logger.info(`Balance refilled to $${Number(this.refillAmount) / 1000000}`)
          return true
        } catch (error) {
          logger.error("Failed to refill balance:", error)
          return false
        }
      }

      return true
    } catch (error) {
      logger.error("Failed to check and refill balance:", error)
      return false
    }
  }

  async trackCost(decision: string, cost: bigint = this.costPerDecision): Promise<void> {
    try {
      const balance = await this.getBalance()
      logger.info(`Decision: ${decision} | Cost: $${Number(cost) / 1000000} | Balance: $${balance}`)
    } catch (error) {
      logger.error("Failed to track cost:", error)
    }
  }
}
