/**
 * Fallback LLM Provider
 * Uses mock trading decisions for testing when Dreams Router is unavailable
 * Generates intelligent decisions based on technical indicators and regime
 */

import logger from '../utils/logger.js'

export interface MockDecision {
  asset: string
  action: 'BUY' | 'SELL' | 'HOLD'
  rationale: string
  entryPrice?: number
  takeProfit?: number
  stopLoss?: number
  positionSize?: number
  exitPlan?: string
}

export class FallbackLLMProvider {
  /**
   * Generate mock trading decisions based on indicators and regime
   */
  static generateDecisions(context: Record<string, any>): MockDecision[] {
    const decisions: MockDecision[] = []
    const regime = context.marketRegime
    const marketData = context.marketData || {}

    if (!regime) {
      logger.warn('[Fallback LLM] No regime detected, returning no decisions')
      return []
    }

    logger.info(`[Fallback LLM] Generating decisions for Regime ${regime.regime}: ${regime.name}`)

    // Regime 6 (Whipsaw) - AVOID ALL TRADES
    if (regime.regime === 6) {
      logger.info('[Fallback LLM] Regime 6 (Whipsaw) - Avoiding all trades')
      return []
    }

    // Process each asset
    for (const asset of context.config?.assets || ['BTC', 'ETH', 'XRP']) {
      const indicators = marketData[asset]?.['5m']
      if (!indicators) {
        logger.debug(`[Fallback LLM] No indicators for ${asset}, skipping`)
        continue
      }

      const rsi = indicators.rsi || 50
      const macd = indicators.macd?.value || 0
      const atr = indicators.atr || 0
      const ema20 = indicators.ema?.ema20 || 0
      const ema50 = indicators.ema?.ema50 || 0

      // Determine if we should trade based on regime and indicators
      const shouldTrade = this.shouldTrade(regime, rsi, macd, ema20, ema50)

      if (!shouldTrade) {
        logger.debug(`[Fallback LLM] ${asset} does not meet trading criteria for Regime ${regime.regime}`)
        continue
      }

      // Determine action based on regime and indicators
      const action = this.determineAction(regime, rsi, macd, ema20, ema50)

      if (action === 'HOLD') {
        continue
      }

      // Calculate position size based on regime multiplier
      const basePositionSize = context.config?.maxPositionSize || 0.02
      const positionSize = basePositionSize * regime.positionSizeMultiplier

      // Calculate entry price (use current price as proxy)
      const entryPrice = this.getAssetPrice(asset)

      // Calculate take profit and stop loss based on ATR
      const atrPercent = (atr / entryPrice) * 100
      const tpPercent = Math.max(1, atrPercent * 2)
      const slPercent = Math.max(0.5, atrPercent * 0.75)

      const takeProfit = action === 'BUY' 
        ? entryPrice * (1 + tpPercent / 100)
        : entryPrice * (1 - tpPercent / 100)

      const stopLoss = action === 'BUY'
        ? entryPrice * (1 - slPercent / 100)
        : entryPrice * (1 + slPercent / 100)

      const decision: MockDecision = {
        asset,
        action,
        rationale: this.generateRationale(regime, rsi, macd, action),
        entryPrice: Math.round(entryPrice * 100) / 100,
        takeProfit: Math.round(takeProfit * 100) / 100,
        stopLoss: Math.round(stopLoss * 100) / 100,
        positionSize: Math.round(positionSize * 10000) / 10000,
        exitPlan: this.generateExitPlan(regime, action)
      }

      decisions.push(decision)
      logger.info(`[Fallback LLM] Generated ${action} decision for ${asset}: ${decision.rationale}`)
    }

    logger.info(`[Fallback LLM] Generated ${decisions.length} trading decisions`)
    return decisions
  }

  /**
   * Determine if we should trade based on regime and indicators
   */
  private static shouldTrade(
    regime: any,
    rsi: number,
    macd: number,
    ema20: number,
    ema50: number
  ): boolean {
    // Regime 5 (Range) - Only trade at extremes
    if (regime.regime === 5) {
      return rsi < 35 || rsi > 65
    }

    // Regime 1-4 (Trends) - Trade with trend
    if (regime.regime <= 4) {
      if (regime.trend === 'up') {
        return rsi < 70 && macd > -0.0005
      } else if (regime.trend === 'down') {
        return rsi > 30 && macd < 0.0005
      }
    }

    // Regime 7-8 (Transitions) - Prepare for reversal
    if (regime.regime >= 7) {
      return rsi < 30 || rsi > 70
    }

    return false
  }

  /**
   * Determine trading action based on regime and indicators
   */
  private static determineAction(
    regime: any,
    rsi: number,
    macd: number,
    ema20: number,
    ema50: number
  ): 'BUY' | 'SELL' | 'HOLD' {
    // Check trading bias
    if (regime.tradingBias === 'avoid') {
      return 'HOLD'
    }

    // Regime 5 (Range) - Buy at support, sell at resistance
    if (regime.regime === 5) {
      if (rsi < 35) return 'BUY'
      if (rsi > 65) return 'SELL'
      return 'HOLD'
    }

    // Regime 1-2 (Uptrend)
    if (regime.regime === 1 || regime.regime === 2) {
      if (regime.tradingBias === 'short_only') return 'HOLD'
      if (rsi < 70 && macd > 0) return 'BUY'
      return 'HOLD'
    }

    // Regime 3-4 (Downtrend)
    if (regime.regime === 3 || regime.regime === 4) {
      if (regime.tradingBias === 'long_only') return 'HOLD'
      if (rsi > 30 && macd < 0) return 'SELL'
      return 'HOLD'
    }

    // Regime 7 (Capitulation) - Prepare for reversal up
    if (regime.regime === 7) {
      if (rsi < 30) return 'BUY'
      return 'HOLD'
    }

    // Regime 8 (Euphoria) - Prepare for reversal down
    if (regime.regime === 8) {
      if (rsi > 70) return 'SELL'
      return 'HOLD'
    }

    return 'HOLD'
  }

  /**
   * Generate rationale for the trading decision
   */
  private static generateRationale(
    regime: any,
    rsi: number,
    macd: number,
    action: string
  ): string {
    const regimeName = regime.name
    const trendText = regime.trend.toUpperCase()
    const volText = regime.volatility.toUpperCase()

    if (action === 'HOLD') {
      return `Regime ${regime.regime} (${regimeName}): Waiting for clearer signals. Trend: ${trendText}, Vol: ${volText}`
    }

    if (action === 'BUY') {
      return `Regime ${regime.regime} (${regimeName}): RSI=${rsi.toFixed(0)}, MACD=${macd.toFixed(4)}. Bullish setup with ${regimeName} regime. Position size: ${regime.positionSizeMultiplier}x, Leverage: ${regime.leverageMultiplier}x`
    }

    if (action === 'SELL') {
      return `Regime ${regime.regime} (${regimeName}): RSI=${rsi.toFixed(0)}, MACD=${macd.toFixed(4)}. Bearish setup with ${regimeName} regime. Position size: ${regime.positionSizeMultiplier}x, Leverage: ${regime.leverageMultiplier}x`
    }

    return `Regime ${regime.regime} (${regimeName}): No clear signal`
  }

  /**
   * Generate exit plan based on regime
   */
  private static generateExitPlan(regime: any, action: string): string {
    if (regime.regime === 5) {
      return 'Range trade: Exit at resistance/support or when RSI reaches 50'
    }

    if (regime.regime === 1 || regime.regime === 2) {
      return 'Uptrend: Exit on RSI > 70 or MACD bearish divergence'
    }

    if (regime.regime === 3 || regime.regime === 4) {
      return 'Downtrend: Exit on RSI < 30 or MACD bullish divergence'
    }

    if (regime.regime === 7) {
      return 'Capitulation: Exit when RSI > 30 and price above EMA20'
    }

    if (regime.regime === 8) {
      return 'Euphoria: Exit when RSI < 70 and price below EMA20'
    }

    return 'Exit on stop loss or take profit'
  }

  /**
   * Get approximate asset price (mock data)
   */
  private static getAssetPrice(asset: string): number {
    const prices: Record<string, number> = {
      'BTC': 45000,
      'ETH': 2500,
      'XRP': 2.50
    }
    return prices[asset] || 1000
  }
}
