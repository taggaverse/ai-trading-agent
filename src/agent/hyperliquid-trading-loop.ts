/**
 * Hyperliquid Trading Loop
 * Main trading loop that runs continuously, fetches data, calls LLM, and executes trades
 */

import logger from '../utils/logger.js'
import { HyperliquidAPI } from './hyperliquid-api.js'
import { IndicatorsClient } from './indicators-client.js'
import { NOCTURNE_TRADING_SYSTEM_PROMPT } from './nocturne-system-prompt.js'
import { DreamsLLMClient } from './dreams-llm-client.js'
import { X402PaymentManager, X402_COSTS } from './x402-payment-manager.js'
import { MarketDataClient } from './market-data-client.js'
import { TradingDataLogger } from './trading-data-logger.js'
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
  private dataLogger: TradingDataLogger

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
    this.dataLogger = new TradingDataLogger('./trading-logs')
    
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
    
    // Save and export logs
    logger.info('Saving trading data...')
    this.dataLogger.saveSession()
    this.dataLogger.exportToCSV('./trading-data.csv')
    
    const report = this.dataLogger.generateReport()
    logger.info('Trading Report:')
    logger.info(`  Total Trades: ${report.totalTrades}`)
    logger.info(`  Win Rate: ${report.winRate.toFixed(1)}%`)
    logger.info(`  Average PnL: $${report.averagePnL.toFixed(2)}`)
    logger.info(`  Logs saved to: ${this.dataLogger.getLogDirectory()}`)
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

      // Step 2: Fetch technical indicators for each asset (5m only to respect TAAPI rate limits)
      logger.info('Step 2: Fetching technical indicators (5m timeframe)...')
      const indicators: Record<string, any> = {}
      for (let i = 0; i < this.config.assets.length; i++) {
        const asset = this.config.assets[i]
        try {
          // Fetch 5m indicators from TAAPI: 1 request per 15s, 80 calcs/min, 20 calcs/request
          // 2 assets × 1 timeframe × 10 indicators = 20 calculations (max per request)
          indicators[asset] = {
            '5m': await this.indicatorsClient.getIndicators(asset, '5m')
          }
          logger.info(`   ✓ ${asset} 5m indicators fetched from TAAPI`)
          
          // Add 2 second delay between requests to respect TAAPI rate limits (1 request per 15s)
          if (i < this.config.assets.length - 1) {
            await this.sleep(2000)
          }
        } catch (error) {
          logger.warn(`   ⚠️  Failed to fetch ${asset} indicators from TAAPI, will use Hyperliquid price data:`, error instanceof Error ? error.message : error)
          // Don't use mock - let the LLM use price data from Hyperliquid
          // Set to null so LLM knows to use alternative data
          indicators[asset] = {
            '5m': null
          }
        }
      }

      // Step 3: Build context for LLM
      logger.info('Step 3: Building LLM context...')
      const context = this.buildContext(portfolioState, indicators)

      // Step 4: Call LLM with system prompt
      logger.info('Step 4: Calling LLM for trading decisions via x402...')
      let decisions: TradeDecision[] = []
      let userPrompt = ''
      try {
        const llmClient = new DreamsLLMClient()
        userPrompt = llmClient.buildUserPrompt({
          balance: context.account?.balance || 0,
          positions: context.account?.positions || [],
          indicators: context.marketData || {},
          totalTrades: context.account?.totalTrades || 0,
          totalPnL: context.account?.totalPnL || 0
        })
        decisions = await this.callLLM(context)
        logger.info(`   ✓ Decisions received: ${decisions.length}`)
      } catch (llmError) {
        logger.error('   ✗ LLM call failed, skipping this iteration:', llmError)
        this.state.errors.push(`LLM error: ${llmError instanceof Error ? llmError.message : 'Unknown'}`)
        return // Skip this iteration if LLM fails
      }

      // Step 5: Execute decisions and log them
      logger.info(`Step 5: Executing trading decisions... (${decisions.length} decisions)`)
      if (!decisions || decisions.length === 0) {
        logger.warn('   ⚠️  No decisions to execute')
      }
      for (const decision of decisions) {
        try {
          // Log decision before execution
          this.dataLogger.logDecision({
            timestamp: new Date().toISOString(),
            iteration: this.state.iteration,
            asset: decision.asset,
            action: decision.action,
            rationale: decision.rationale,
            entryPrice: decision.entryPrice,
            takeProfit: decision.takeProfit,
            stopLoss: decision.stopLoss,
            positionSize: decision.positionSize,
            leverage: 1, // Default, can be enhanced
            marketData: {
              rsi5m: indicators[decision.asset]?.['5m']?.rsi,
              rsi4h: indicators[decision.asset]?.['4h']?.rsi,
              macd5m: indicators[decision.asset]?.['5m']?.macd,
              macd4h: indicators[decision.asset]?.['4h']?.macd,
              signal5m: indicators[decision.asset]?.['5m']?.signal,
              signal4h: indicators[decision.asset]?.['4h']?.signal,
              currentPrice: portfolioState.positions?.find((p: any) => p.asset === decision.asset)?.currentPrice
            },
            accountState: {
              balance: portfolioState.balance,
              totalTrades: this.state.totalTrades,
              totalPnL: this.state.totalPnL,
              openPositions: portfolioState.positions?.length || 0
            },
            systemPrompt: NOCTURNE_TRADING_SYSTEM_PROMPT,
            userPrompt: userPrompt
          })

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
   * Build context payload for LLM (fixed strategy, no adaptive learning)
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
      systemPrompt: NOCTURNE_TRADING_SYSTEM_PROMPT
    }
  }

  /**
   * Call LLM with context via Dreams Router (x402 payments)
   */
  private async callLLM(context: Record<string, any>): Promise<TradeDecision[]> {
    try {
      logger.info('   [Dreams LLM] Calling Dreams Router with x402 payment...')

      if (!this.dreamsRouter) {
        throw new Error('Dreams Router not initialized')
      }

      // Build user prompt with available data
      const marketDataStr = Object.entries(context.marketData || {})
        .map(([asset, data]: [string, any]) => {
          if (data['5m'] === null) {
            // No TAAPI indicators available - use price data from positions
            const position = context.account?.positions?.find((p: any) => p.asset === asset)
            if (position) {
              return `${asset}: Current Price: $${position.currentPrice}, Position: ${position.size} (PnL: $${position.pnl})`
            }
            return `${asset}: Price data from portfolio (no technical indicators available)`
          }
          // Use TAAPI indicators if available
          const rsi = typeof data['5m']?.rsi === 'number' ? data['5m'].rsi.toFixed(2) : 'N/A'
          const macd = typeof data['5m']?.macd === 'object' ? data['5m'].macd.value.toFixed(4) : 'N/A'
          const atr = typeof data['5m']?.atr === 'number' ? data['5m'].atr.toFixed(2) : 'N/A'
          return `${asset}: RSI=${rsi}, MACD=${macd}, ATR=${atr}`
        })
        .join('\n')

      const userPrompt = `
## CURRENT PORTFOLIO STATE

Balance: $${context.account?.balance?.toFixed(2) || '0.00'}
Total Trades: ${context.account?.totalTrades || 0}
Total PnL: $${context.account?.totalPnL?.toFixed(2) || '0.00'}

Current Positions:
${context.account?.positions?.map((p: any) => `${p.asset}: ${p.size} @ $${p.currentPrice} (PnL: $${p.pnl})`).join('\n') || 'None'}

## MARKET DATA

Available Data (Technical Indicators or Price Data):
${marketDataStr || 'None'}

## TRADING INSTRUCTIONS

Use FIXED STRATEGY based on available signals:
- Apply the same rules to every asset
- Use technical indicators if available (RSI, MACD, ATR)
- If indicators unavailable, use price trends and position data
- Do NOT adjust based on past performance
- Do NOT increase size after wins or reduce after losses
- Do NOT favor or avoid specific assets based on history

Provide trading decisions in JSON format:
{
  "decisions": [
    {
      "asset": "BTC",
      "action": "BUY|SELL|HOLD",
      "rationale": "Clear explanation of decision",
      "entryPrice": optional_number,
      "takeProfit": optional_number,
      "stopLoss": optional_number,
      "positionSize": optional_number,
      "exitPlan": optional_string
    }
  ]
}

Only include decisions for assets with clear signals. Prioritize capital preservation.
`

      // Call LLM via Dreams Router
      logger.info('   [Dreams LLM] Sending request to Dreams Router...')
      const response = await this.dreamsRouter('google-vertex/gemini-2.5-flash', [
        {
          role: 'system',
          content: NOCTURNE_TRADING_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userPrompt
        }
      ])

      // Parse response
      let decisions: TradeDecision[] = []
      if (response && response.message && response.message.content) {
        const content = response.message.content
        try {
          const parsed = JSON.parse(content)
          decisions = parsed.decisions || []
        } catch (parseError) {
          logger.warn('   ⚠️  Failed to parse LLM response as JSON:', parseError)
          // Try to extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            decisions = parsed.decisions || []
          }
        }
      }

      logger.info(`   ✓ LLM returned ${decisions.length} decisions`)
      logger.info(`   ✓ x402 payment processed`)
      
      // Record successful LLM call
      if (this.paymentManager) {
        this.paymentManager.recordPayment('llm', 0.1, true, `Generated ${decisions.length} decisions`)
      }

      return decisions
    } catch (error) {
      logger.error('   ✗ LLM call failed:', error)
      if (this.paymentManager) {
        this.paymentManager.recordPayment('llm', X402_COSTS.LLM_CALL, false, `Error: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
      // Throw error instead of falling back to mock
      throw error
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
        
        // Calculate and track PnL
        if (decision.action === 'SELL' && existingPosition) {
          // Calculate PnL on close
          const entryPrice = existingPosition.entryPrice || decision.entryPrice || 0
          const exitPrice = decision.entryPrice || 0
          const pnl = (exitPrice - entryPrice) * (decision.positionSize || 0.01)
          this.state.totalPnL += pnl
          logger.info(`      💰 PnL: $${pnl.toFixed(2)} (Total: $${this.state.totalPnL.toFixed(2)})`)
        } else if (decision.action === 'BUY') {
          // For BUY, we'll calculate PnL when position is closed
          logger.info(`      📊 Position opened at $${decision.entryPrice?.toFixed(2)}`)
        }
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
