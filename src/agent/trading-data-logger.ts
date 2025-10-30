/**
 * Trading Data Logger
 * Stores all trading decisions, market data, and outcomes for post-training analysis
 * Used for offline learning, strategy optimization, and agent improvement
 */

import fs from 'fs'
import path from 'path'
import logger from '../utils/logger.js'

export interface TradeRecord {
  timestamp: string
  iteration: number
  
  // Decision Info
  asset: string
  action: 'BUY' | 'SELL' | 'HOLD'
  rationale: string
  confidence?: number
  
  // Entry/Exit
  entryPrice?: number
  takeProfit?: number
  stopLoss?: number
  positionSize?: number
  leverage?: number
  
  // Market Data at Decision Time
  marketData: {
    rsi5m?: number
    rsi4h?: number
    macd5m?: number
    macd4h?: number
    signal5m?: number
    signal4h?: number
    ema5m?: number
    ema4h?: number
    atr5m?: number
    atr4h?: number
    fundingRate?: number
    currentPrice?: number
  }
  
  // Account State at Decision Time
  accountState: {
    balance: number
    totalTrades: number
    totalPnL: number
    openPositions: number
  }
  
  // System Prompt & Context
  systemPrompt: string
  userPrompt: string
  
  // Outcome (filled after trade closes)
  outcome?: {
    exitPrice?: number
    realizedPnL?: number
    pnlPercent?: number
    holdTime?: number // milliseconds
    exitReason?: string
  }
}

export class TradingDataLogger {
  private logDir: string
  private currentSession: TradeRecord[] = []
  private sessionStartTime: number = Date.now()

  constructor(logDir: string = './trading-logs') {
    this.logDir = logDir
    this.ensureLogDirectory()
    logger.info(`[Trading Logger] Initialized with log directory: ${logDir}`)
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
      logger.info(`[Trading Logger] Created log directory: ${this.logDir}`)
    }
  }

  /**
   * Log a trading decision
   */
  logDecision(record: TradeRecord): void {
    try {
      this.currentSession.push(record)
      
      // Log to console
      logger.info(`[Trading Logger] Decision logged: ${record.asset} ${record.action}`)
      
      // Auto-save every 10 decisions
      if (this.currentSession.length % 10 === 0) {
        this.saveSession()
      }
    } catch (error) {
      logger.error('[Trading Logger] Failed to log decision:', error)
    }
  }

  /**
   * Update trade outcome after execution
   */
  updateOutcome(
    assetAndAction: string, // "BTC_BUY"
    outcome: TradeRecord['outcome']
  ): void {
    try {
      // Find the most recent matching decision
      const record = this.currentSession
        .reverse()
        .find(r => `${r.asset}_${r.action}` === assetAndAction)
      
      if (record && outcome) {
        record.outcome = outcome
        logger.info(`[Trading Logger] Outcome updated: ${assetAndAction} PnL: $${outcome.realizedPnL?.toFixed(2)}`)
      } else {
        logger.warn(`[Trading Logger] Could not find record for: ${assetAndAction}`)
      }
    } catch (error) {
      logger.error('[Trading Logger] Failed to update outcome:', error)
    }
  }

  /**
   * Save current session to file
   */
  saveSession(): void {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `trading-session-${timestamp}.json`
      const filepath = path.join(this.logDir, filename)
      
      const sessionData = {
        startTime: new Date(this.sessionStartTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: Date.now() - this.sessionStartTime,
        recordCount: this.currentSession.length,
        records: this.currentSession
      }
      
      fs.writeFileSync(filepath, JSON.stringify(sessionData, null, 2))
      logger.info(`[Trading Logger] Session saved: ${filename} (${this.currentSession.length} records)`)
    } catch (error) {
      logger.error('[Trading Logger] Failed to save session:', error)
    }
  }

  /**
   * Export data for analysis (CSV format)
   */
  exportToCSV(outputPath: string = './trading-analysis.csv'): void {
    try {
      const headers = [
        'timestamp',
        'asset',
        'action',
        'rationale',
        'entryPrice',
        'takeProfit',
        'stopLoss',
        'positionSize',
        'rsi5m',
        'macd5m',
        'fundingRate',
        'balance',
        'totalPnL',
        'exitPrice',
        'realizedPnL',
        'pnlPercent',
        'holdTime'
      ]
      
      const rows = this.currentSession.map(record => [
        record.timestamp,
        record.asset,
        record.action,
        record.rationale.substring(0, 50), // Truncate
        record.entryPrice || '',
        record.takeProfit || '',
        record.stopLoss || '',
        record.positionSize || '',
        record.marketData.rsi5m || '',
        record.marketData.macd5m || '',
        record.marketData.fundingRate || '',
        record.accountState.balance,
        record.accountState.totalPnL,
        record.outcome?.exitPrice || '',
        record.outcome?.realizedPnL || '',
        record.outcome?.pnlPercent || '',
        record.outcome?.holdTime || ''
      ])
      
      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')
      
      fs.writeFileSync(outputPath, csv)
      logger.info(`[Trading Logger] Exported to CSV: ${outputPath}`)
    } catch (error) {
      logger.error('[Trading Logger] Failed to export CSV:', error)
    }
  }

  /**
   * Generate analysis report
   */
  generateReport(): {
    totalTrades: number
    winRate: number
    averagePnL: number
    bestTrade: TradeRecord | null
    worstTrade: TradeRecord | null
    assetStats: Record<string, any>
  } {
    try {
      const tradesWithOutcome = this.currentSession.filter(r => r.outcome)
      const wins = tradesWithOutcome.filter(r => (r.outcome?.realizedPnL || 0) > 0)
      const losses = tradesWithOutcome.filter(r => (r.outcome?.realizedPnL || 0) < 0)
      
      const bestTrade = tradesWithOutcome.reduce((best, current) => {
        const currentPnL = current.outcome?.realizedPnL || 0
        const bestPnL = best.outcome?.realizedPnL || 0
        return currentPnL > bestPnL ? current : best
      }, tradesWithOutcome[0] || null)
      
      const worstTrade = tradesWithOutcome.reduce((worst, current) => {
        const currentPnL = current.outcome?.realizedPnL || 0
        const worstPnL = worst.outcome?.realizedPnL || 0
        return currentPnL < worstPnL ? current : worst
      }, tradesWithOutcome[0] || null)
      
      const totalPnL = tradesWithOutcome.reduce((sum, r) => sum + (r.outcome?.realizedPnL || 0), 0)
      const averagePnL = tradesWithOutcome.length > 0 ? totalPnL / tradesWithOutcome.length : 0
      
      // Per-asset stats
      const assetStats: Record<string, any> = {}
      for (const asset of new Set(this.currentSession.map(r => r.asset))) {
        const assetTrades = tradesWithOutcome.filter(r => r.asset === asset)
        const assetWins = assetTrades.filter(r => (r.outcome?.realizedPnL || 0) > 0)
        const assetPnL = assetTrades.reduce((sum, r) => sum + (r.outcome?.realizedPnL || 0), 0)
        
        assetStats[asset] = {
          trades: assetTrades.length,
          wins: assetWins.length,
          winRate: assetTrades.length > 0 ? (assetWins.length / assetTrades.length) * 100 : 0,
          totalPnL: assetPnL,
          averagePnL: assetTrades.length > 0 ? assetPnL / assetTrades.length : 0
        }
      }
      
      const report = {
        totalTrades: tradesWithOutcome.length,
        winRate: tradesWithOutcome.length > 0 ? (wins.length / tradesWithOutcome.length) * 100 : 0,
        averagePnL,
        bestTrade,
        worstTrade,
        assetStats
      }
      
      logger.info('[Trading Logger] Report generated')
      logger.info(`  Total Trades: ${report.totalTrades}`)
      logger.info(`  Win Rate: ${report.winRate.toFixed(1)}%`)
      logger.info(`  Average PnL: $${report.averagePnL.toFixed(2)}`)
      
      return report
    } catch (error) {
      logger.error('[Trading Logger] Failed to generate report:', error)
      return {
        totalTrades: 0,
        winRate: 0,
        averagePnL: 0,
        bestTrade: null,
        worstTrade: null,
        assetStats: {}
      }
    }
  }

  /**
   * Get current session data
   */
  getSessionData(): TradeRecord[] {
    return this.currentSession
  }

  /**
   * Clear session (start new session)
   */
  clearSession(): void {
    this.saveSession()
    this.currentSession = []
    this.sessionStartTime = Date.now()
    logger.info('[Trading Logger] Session cleared, new session started')
  }

  /**
   * Get log directory
   */
  getLogDirectory(): string {
    return this.logDir
  }
}
