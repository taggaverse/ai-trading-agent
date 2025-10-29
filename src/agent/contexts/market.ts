import { context } from "@daydreamsai/core"
import { z } from "zod"
import logger from "../../utils/logger.js"

// Types
export interface OHLCV {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Indicators {
  sma20: number
  sma50: number
  sma200: number
  ema12: number
  ema26: number
  rsi14: number
  macd: number
  macdSignal: number
  macdHistogram: number
  bollingerUpper: number
  bollingerMiddle: number
  bollingerLower: number
  atr14: number
}

export interface MarketSignal {
  type: "bullish" | "bearish" | "neutral"
  strength: number // 0-1
  indicators: string[]
  timestamp: number
}

// Indicator calculation functions
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0)
  return sum / period
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return 0
  
  const k = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k)
  }
  
  return ema
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 0
  
  let gains = 0
  let losses = 0
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }
  
  const avgGain = gains / period
  const avgLoss = losses / period
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  const macd = ema12 - ema26
  
  // Simplified signal line (should use EMA of MACD)
  const signal = macd * 0.7 // Placeholder
  const histogram = macd - signal
  
  return { macd, signal, histogram }
}

function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
  upper: number
  middle: number
  lower: number
} {
  const middle = calculateSMA(prices, period)
  if (middle === 0) return { upper: 0, middle: 0, lower: 0 }
  
  const recentPrices = prices.slice(-period)
  const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period
  const std = Math.sqrt(variance)
  
  return {
    upper: middle + std * stdDev,
    middle,
    lower: middle - std * stdDev,
  }
}

function calculateATR(ohlcv: OHLCV[], period: number = 14): number {
  if (ohlcv.length < period) return 0
  
  let trSum = 0
  for (let i = Math.max(0, ohlcv.length - period); i < ohlcv.length; i++) {
    const current = ohlcv[i]
    const previous = i > 0 ? ohlcv[i - 1] : current
    
    const tr1 = current.high - current.low
    const tr2 = Math.abs(current.high - previous.close)
    const tr3 = Math.abs(current.low - previous.close)
    
    trSum += Math.max(tr1, tr2, tr3)
  }
  
  return trSum / period
}

// Market context schema
const marketContextSchema = z.object({
  symbol: z.string(),
  chain: z.string(),
})

export type MarketContextArgs = z.infer<typeof marketContextSchema>

// Market context state
export interface MarketContextState {
  symbol: string
  chain: string
  currentPrice: number
  previousPrice: number
  priceChange: number
  priceChangePercent: number
  volume: number
  indicators: Indicators
  signals: MarketSignal[]
  ohlcv: OHLCV[]
  lastUpdate: number
}

// Create market context
export const marketContext = context({
  type: "market-trading",
  schema: marketContextSchema,
  create: async (state): Promise<MarketContextState> => {
    logger.info(`Initializing market context for ${state.args.symbol} on ${state.args.chain}`)
    
    return {
      symbol: state.args.symbol,
      chain: state.args.chain,
      currentPrice: 0,
      previousPrice: 0,
      priceChange: 0,
      priceChangePercent: 0,
      volume: 0,
      indicators: {
        sma20: 0,
        sma50: 0,
        sma200: 0,
        ema12: 0,
        ema26: 0,
        rsi14: 0,
        macd: 0,
        macdSignal: 0,
        macdHistogram: 0,
        bollingerUpper: 0,
        bollingerMiddle: 0,
        bollingerLower: 0,
        atr14: 0,
      },
      signals: [],
      ohlcv: [],
      lastUpdate: 0,
    }
  },
})

// Helper functions to update market context
export function calculateIndicators(ohlcv: OHLCV[]): Indicators {
  if (ohlcv.length === 0) {
    return {
      sma20: 0,
      sma50: 0,
      sma200: 0,
      ema12: 0,
      ema26: 0,
      rsi14: 0,
      macd: 0,
      macdSignal: 0,
      macdHistogram: 0,
      bollingerUpper: 0,
      bollingerMiddle: 0,
      bollingerLower: 0,
      atr14: 0,
    }
  }

  const prices = ohlcv.map(c => c.close)
  
  const sma20 = calculateSMA(prices, 20)
  const sma50 = calculateSMA(prices, 50)
  const sma200 = calculateSMA(prices, 200)
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  const rsi14 = calculateRSI(prices, 14)
  
  const { macd, signal: macdSignal, histogram: macdHistogram } = calculateMACD(prices)
  
  const { upper: bollingerUpper, middle: bollingerMiddle, lower: bollingerLower } = calculateBollingerBands(prices)
  
  const atr14 = calculateATR(ohlcv, 14)

  return {
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    rsi14,
    macd,
    macdSignal,
    macdHistogram,
    bollingerUpper,
    bollingerMiddle,
    bollingerLower,
    atr14,
  }
}

export function generateSignals(indicators: Indicators, currentPrice: number): MarketSignal[] {
  const signals: MarketSignal[] = []
  const indicatorsList: string[] = []
  let bullishCount = 0
  let bearishCount = 0

  // SMA signals
  if (indicators.sma20 > 0 && indicators.sma50 > 0) {
    if (indicators.sma20 > indicators.sma50) {
      bullishCount++
      indicatorsList.push("SMA20 > SMA50")
    } else {
      bearishCount++
      indicatorsList.push("SMA20 < SMA50")
    }
  }

  if (indicators.sma50 > 0 && indicators.sma200 > 0) {
    if (indicators.sma50 > indicators.sma200) {
      bullishCount++
      indicatorsList.push("SMA50 > SMA200")
    } else {
      bearishCount++
      indicatorsList.push("SMA50 < SMA200")
    }
  }

  // RSI signals
  if (indicators.rsi14 > 0) {
    if (indicators.rsi14 > 70) {
      bearishCount++
      indicatorsList.push("RSI > 70 (Overbought)")
    } else if (indicators.rsi14 < 30) {
      bullishCount++
      indicatorsList.push("RSI < 30 (Oversold)")
    }
  }

  // MACD signals
  if (indicators.macd > 0 && indicators.macdSignal > 0) {
    if (indicators.macd > indicators.macdSignal) {
      bullishCount++
      indicatorsList.push("MACD > Signal")
    } else {
      bearishCount++
      indicatorsList.push("MACD < Signal")
    }
  }

  // Bollinger Bands signals
  if (indicators.bollingerUpper > 0 && indicators.bollingerLower > 0) {
    if (currentPrice > indicators.bollingerUpper) {
      bearishCount++
      indicatorsList.push("Price > Upper BB")
    } else if (currentPrice < indicators.bollingerLower) {
      bullishCount++
      indicatorsList.push("Price < Lower BB")
    }
  }

  // Determine overall signal
  const totalIndicators = bullishCount + bearishCount
  if (totalIndicators > 0) {
    const bullishRatio = bullishCount / totalIndicators
    
    if (bullishRatio > 0.6) {
      signals.push({
        type: "bullish",
        strength: bullishRatio,
        indicators: indicatorsList,
        timestamp: Date.now(),
      })
    } else if (bullishRatio < 0.4) {
      signals.push({
        type: "bearish",
        strength: 1 - bullishRatio,
        indicators: indicatorsList,
        timestamp: Date.now(),
      })
    } else {
      signals.push({
        type: "neutral",
        strength: 0.5,
        indicators: indicatorsList,
        timestamp: Date.now(),
      })
    }
  }

  return signals
}

export function updateMarketState(
  state: MarketContextState,
  ohlcv: OHLCV[]
): MarketContextState {
  if (ohlcv.length === 0) return state

  const latestCandle = ohlcv[ohlcv.length - 1]
  const previousCandle = ohlcv.length > 1 ? ohlcv[ohlcv.length - 2] : latestCandle

  const currentPrice = latestCandle.close
  const previousPrice = previousCandle.close
  const priceChange = currentPrice - previousPrice
  const priceChangePercent = (priceChange / previousPrice) * 100

  const indicators = calculateIndicators(ohlcv)
  const signals = generateSignals(indicators, currentPrice)

  return {
    ...state,
    currentPrice,
    previousPrice,
    priceChange,
    priceChangePercent,
    volume: latestCandle.volume,
    indicators,
    signals,
    ohlcv,
    lastUpdate: Date.now(),
  }
}
