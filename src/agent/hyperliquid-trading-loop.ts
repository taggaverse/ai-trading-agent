/**
 * Hyperliquid Trading Loop
 * Main trading loop that runs continuously, fetches data, calls LLM, and executes trades
 */

import logger from '../utils/logger.js'
import { HyperliquidAPI } from './hyperliquid-api.js'
import { IndicatorsClient } from './indicators-client.js'
import { HYPERLIQUID_TRADING_SYSTEM_PROMPT } from './trading-system-prompt.js'
import { X402LLMClient } from './x402-llm-client.js'
import { X402PaymentManager, X402_COSTS } from './x402-payment-manager.js'
export interface TradeLoopConfig {
  tradingInterval: number // milliseconds
  assets: string[]
  maxPositionSize: number // as percentage (0.05 = 5%)
  maxLeverage: number
}

export interface TradeDecision {
  asset: string
  action: 'BUY' | 'SELL' | 'HOLD'
  rationale: string
  entryPrice?: number
  takeProfit?: number
  stopLoss?: number
  positionSize?: number
  exitPlan?: string
}

export interface TradeLoopState {
  iteration: number
  lastUpdate: number
  decisions: TradeDecision[]
  errors: string[]
  totalTrades: number
  totalPnL: number
}

export class HyperliquidTradingLoop {
  private hyperliquidAPI: HyperliquidAPI
  private indicatorsClient: IndicatorsClient
  private config: TradeLoopConfig
  private state: TradeLoopState
  private running: boolean = false
  private dreamsRouter: any
  private paymentManager?: X402PaymentManager

  constructor(
    hyperliquidAPI: HyperliquidAPI,
    indicatorsClient: IndicatorsClient,
    config: TradeLoopConfig,
    dreamsRouter?: any,
    paymentManager?: X402PaymentManager
  ) {
    this.hyperliquidAPI = hyperliquidAPI
    this.indicatorsClient = indicatorsClient
    this.config = config
    this.dreamsRouter = dreamsRouter
    this.paymentManager = paymentManager
    
    // Set payment manager on indicators client
    if (paymentManager) {
      this.indicatorsClient.setPaymentManager(paymentManager)
    }
    
    this.state = {
      iteration: 0,
      lastUpdate: 0,
      decisions: [],
      errors: [],
      totalTrades: 0,
      totalPnL: 0
    }
  }

  /**
   * Start the trading loop
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('Trading loop already running')
      return
    }

    this.running = true
    logger.info('🚀 Starting Hyperliquid trading loop...')
    logger.info(`   Assets: ${this.config.assets.join(', ')}`)
    logger.info(`   Interval: ${this.config.tradingInterval}ms`)
    logger.info(`   Max Position Size: ${(this.config.maxPositionSize * 100).toFixed(1)}%`)
    logger.info(`   Max Leverage: ${this.config.maxLeverage}x`)

    // Main loop
    while (this.running) {
      try {
        await this.iteration()
        await this.sleep(this.config.tradingInterval)
      } catch (error) {
        logger.error('Trading loop error:', error)
        this.state.errors.push(error instanceof Error ? error.message : String(error))
        await this.sleep(5000) // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Stop the trading loop
   */
  stop(): void {
    this.running = false
    logger.info('Trading loop stopped')
  }

  /**
   * Single iteration of the trading loop
   */
  private async iteration(): Promise<void> {
    this.state.iteration++
    const startTime = Date.now()

    logger.info(`\n=== Trading Iteration ${this.state.iteration} ===`)

    try {
      // Step 1: Fetch portfolio state
      logger.info('Step 1: Fetching portfolio state...')
      let portfolioState
      try {
        portfolioState = await this.hyperliquidAPI.getUserState()
        logger.info(`   Balance: $${portfolioState.balance}`)
        logger.info(`   Positions: ${portfolioState.positions.length}`)
      } catch (rpcError) {
        logger.warn('   ⚠️  Failed to fetch live portfolio, using cached state')
        // Use cached state or mock state
        portfolioState = {
          balance: 10000,
          positions: [],
          timestamp: Date.now()
        }
      }

      // Step 2: Fetch technical indicators for each asset
      logger.info('Step 2: Fetching technical indicators...')
      const indicators: Record<string, any> = {}
      for (const asset of this.config.assets) {
        try {
          indicators[asset] = {
            '5m': await this.indicatorsClient.getIndicators(asset, '5m'),
            '4h': await this.indicatorsClient.getIndicators(asset, '4h')
          }
          logger.info(`   ✓ ${asset} indicators fetched`)
        } catch (error) {
          logger.warn(`   ✗ Failed to fetch ${asset} indicators, using mock:`, error)
          // Use mock indicators
          indicators[asset] = {
            '5m': { rsi: 50, macd: 0, signal: 0 },
            '4h': { rsi: 50, macd: 0, signal: 0 }
          }
        }
      }

      // Step 3: Build context for LLM
      logger.info('Step 3: Building LLM context...')
      const context = this.buildContext(portfolioState, indicators)

      // Step 4: Call LLM with system prompt
      logger.info('Step 4: Calling LLM for trading decisions...')
      const decisions = await this.callLLM(context)
      logger.info(`   Decisions received: ${decisions.length}`)

      // Step 5: Execute decisions
      logger.info(`Step 5: Executing trading decisions... (${decisions.length} decisions)`)
      if (!decisions || decisions.length === 0) {
        logger.warn('   ⚠️  No decisions to execute')
      }
      for (const decision of decisions) {
        try {
          await this.executeDecision(decision, portfolioState)
          if (decision.action !== 'HOLD') {
            this.state.totalTrades++
          }
        } catch (error) {
          logger.error(`   Failed to execute ${decision.asset} ${decision.action}:`, error)
        }
        // Always record decision, even if execution failed
        this.state.decisions.push(decision)
        logger.info(`   📝 Decision recorded: ${decision.asset} ${decision.action} (Total: ${this.state.decisions.length})`)
      }

      // Step 6: Update state
      this.state.lastUpdate = Date.now()
      const duration = Date.now() - startTime
      logger.info(`✓ Iteration complete (${duration}ms)`)
    } catch (error) {
      logger.error('Iteration failed:', error)
      throw error
    }
  }

  /**
   * Build context payload for LLM
   */
  private buildContext(
    portfolioState: any,
    indicators: Record<string, any>
  ): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      iteration: this.state.iteration,
      account: {
        balance: portfolioState.balance,
        positions: portfolioState.positions,
        totalTrades: this.state.totalTrades,
        totalPnL: this.state.totalPnL
      },
      marketData: indicators,
      config: {
        assets: this.config.assets,
        maxPositionSize: this.config.maxPositionSize,
        maxLeverage: this.config.maxLeverage
      },
      systemPrompt: HYPERLIQUID_TRADING_SYSTEM_PROMPT
    }
  }

  /**
   * Call LLM with context via Dreams Router (x402 payments)
   */
  private async callLLM(context: Record<string, any>): Promise<TradeDecision[]> {
    try {
      logger.info('   [x402 LLM] Calling Dreams Router with x402 payment...')

      // Initialize x402 LLM client
      const llmClient = new X402LLMClient()

      // Build user prompt
      const userPrompt = llmClient.buildUserPrompt({
        balance: context.account?.balance || 0,
        positions: context.account?.positions || [],
        indicators: context.marketData || {}
      })

      // Call LLM via x402
      const llmDecisions = await llmClient.callLLM(
        HYPERLIQUID_TRADING_SYSTEM_PROMPT,
        userPrompt,
        0.1 // $0.10 USDC per call
      )

      // Convert to TradeDecision format
      const decisions: TradeDecision[] = llmDecisions.map((d: any) => ({
        asset: d.asset,
        action: d.action,
        rationale: d.rationale,
        entryPrice: d.entryPrice,
        takeProfit: d.takeProfit,
        stopLoss: d.stopLoss,
        positionSize: d.positionSize || this.config.maxPositionSize,
        exitPlan: d.exitPlan
      }))

      logger.info(`   ✓ LLM returned ${decisions.length} decisions`)
      
      // Record successful LLM call
      if (this.paymentManager) {
        this.paymentManager.recordPayment('llm', X402_COSTS.LLM_CALL, true, `Generated ${decisions.length} decisions`)
      }

      return decisions
    } catch (error) {
      logger.error('   ✗ LLM call failed:', error)
      if (this.paymentManager) {
        this.paymentManager.recordPayment('llm', X402_COSTS.LLM_CALL, false, `Error: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
      // Fall back to mock decisions
      return this.getMockDecisions(context)
    }
  }

  /**
   * Get mock decisions (fallback)
   */
  private getMockDecisions(context: Record<string, any>): TradeDecision[] {
    const decisions: TradeDecision[] = []

    for (const asset of this.config.assets) {
      const indicators = context.marketData[asset]?.['5m']
      if (!indicators) continue

      const rsi = indicators.rsi || 50
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'

      if (rsi < 30) {
        action = 'BUY'
      } else if (rsi > 70) {
        action = 'SELL'
      }

      decisions.push({
        asset,
        action,
        rationale: `RSI: ${rsi.toFixed(2)} - ${action === 'BUY' ? 'Oversold' : action === 'SELL' ? 'Overbought' : 'Neutral'}`,
        entryPrice: 42000 + Math.random() * 1000,
        takeProfit: 43000 + Math.random() * 1000,
        stopLoss: 41000 + Math.random() * 1000,
        positionSize: this.config.maxPositionSize,
        exitPlan: `Close if price breaks above TP or below SL`
      })
    }

    return decisions
  }

  /**
   * Execute a trading decision
   */
  private async executeDecision(
    decision: TradeDecision,
    portfolioState: any
  ): Promise<void> {
    if (decision.action === 'HOLD') {
      logger.info(`   ${decision.asset}: HOLD - ${decision.rationale}`)
      return
    }

    logger.info(`   ${decision.asset}: ${decision.action}`)
    logger.info(`      Rationale: ${decision.rationale}`)
    logger.info(`      Entry: $${decision.entryPrice?.toFixed(2)}`)
    logger.info(`      TP: $${decision.takeProfit?.toFixed(2)}`)
    logger.info(`      SL: $${decision.stopLoss?.toFixed(2)}`)

    try {
      // Check if position already exists
      const existingPosition = portfolioState.positions.find(
        (p: any) => p.asset === decision.asset
      )

      if (existingPosition && decision.action === 'BUY') {
        logger.warn(`      Already have ${decision.asset} position, skipping`)
        return
      }

      if (!existingPosition && decision.action === 'SELL') {
        logger.warn(`      No ${decision.asset} position to close, skipping`)
        return
      }

      // Execute order
      const isBuy = decision.action === 'BUY'
      const result = await this.hyperliquidAPI.placeOrder(
        decision.asset,
        isBuy,
        decision.positionSize || 0.01,
        decision.entryPrice
      )

      if (result.success) {
        logger.info(`      ✓ Order executed: ${result.orderId}`)
      } else {
        logger.error(`      ✗ Order failed: ${result.error}`)
      }
    } catch (error) {
      logger.error(`      ✗ Execution error:`, error)
      throw error
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get current state
   */
  getState(): TradeLoopState {
    return { ...this.state }
  }

  /**
   * Get recent decisions
   */
  getRecentDecisions(limit: number = 10): TradeDecision[] {
    return this.state.decisions.slice(-limit)
  }

  /**
   * Get statistics
   */
  getStats(): {
    iteration: number
    totalTrades: number
    totalPnL: number
    uptime: number
    errors: number
    paymentStats?: any
  } {
    return {
      iteration: this.state.iteration,
      totalTrades: this.state.totalTrades,
      totalPnL: this.state.totalPnL,
      uptime: Date.now() - this.state.lastUpdate,
      errors: this.state.errors.length,
      paymentStats: this.paymentManager?.getStats()
    }
  }

  /**
   * Get payment statistics
   */
  getPaymentStats() {
    return this.paymentManager?.getStats()
  }

  /**
   * Get cost breakdown
   */
  getCostBreakdown() {
    return this.paymentManager?.getCostBreakdown()
  }

  /**
   * Get monthly cost estimate
   */
  getMonthlyEstimate() {
    return this.paymentManager?.getMonthlyEstimate()
  }
}
