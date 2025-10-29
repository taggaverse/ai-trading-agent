import { context } from "../../types/daydreams.js"
import { z } from "zod"
import logger from "../../utils/logger.js"

// Types (based on Nocturne patterns)
export interface HyperliquidPosition {
  symbol: string
  side: "long" | "short"
  size: number
  entryPrice: number
  currentPrice: number
  leverage: number
  liquidationPrice: number
  pnl: number
  pnlPercent: number
  funding: number
  timestamp: number
}

export interface HyperliquidOrder {
  id: string
  symbol: string
  side: "buy" | "sell"
  size: number
  price: number
  status: "open" | "filled" | "cancelled"
  timestamp: number
}

export interface HyperliquidAccountState {
  balance: number
  equity: number
  usedMargin: number
  availableMargin: number
  marginRatio: number
  positions: HyperliquidPosition[]
  orders: HyperliquidOrder[]
}

// Hyperliquid context schema
const hyperliquidContextSchema = z.object({
  symbol: z.string(),
  chain: z.string().default("arbitrum"),
})

export type HyperliquidContextArgs = z.infer<typeof hyperliquidContextSchema>

// Hyperliquid context state
export interface HyperliquidContextState {
  symbol: string
  chain: string
  wallet: string
  accountState: HyperliquidAccountState
  maxLeverage: number
  stopLossPct: number
  takeProfitPct: number
  lastUpdate: number
}

// Create Hyperliquid context
export const hyperliquidContext = context({
  type: "hyperliquid-trading",
  schema: hyperliquidContextSchema,
  create: async (state: any): Promise<HyperliquidContextState> => {
    logger.info(`Initializing Hyperliquid context for ${state.args.symbol}`)

    return {
      symbol: state.args.symbol,
      chain: "arbitrum",
      wallet: "",
      accountState: {
        balance: 0,
        equity: 0,
        usedMargin: 0,
        availableMargin: 0,
        marginRatio: 0,
        positions: [],
        orders: [],
      },
      maxLeverage: 20, // Conservative default (max is 50x)
      stopLossPct: 2,
      takeProfitPct: 3,
      lastUpdate: 0,
    }
  },
})

// Hyperliquid API client (based on Nocturne patterns)
export class HyperliquidClient {
  private privateKey: string
  private walletAddress: string
  private testnet: boolean

  constructor(privateKey: string, walletAddress: string, testnet: boolean = false) {
    this.privateKey = privateKey
    this.walletAddress = walletAddress
    this.testnet = testnet
    logger.info(`Hyperliquid client initialized for ${walletAddress}`)
  }

  async getAccountState(): Promise<HyperliquidAccountState> {
    try {
      logger.info("Fetching Hyperliquid account state...")

      // This would call the actual Hyperliquid API
      // For now, returning placeholder
      return {
        balance: 0,
        equity: 0,
        usedMargin: 0,
        availableMargin: 0,
        marginRatio: 0,
        positions: [],
        orders: [],
      }
    } catch (error) {
      logger.error("Failed to get account state:", error)
      throw error
    }
  }

  async getOpenPositions(): Promise<HyperliquidPosition[]> {
    try {
      logger.info("Fetching open positions...")

      const accountState = await this.getAccountState()
      return accountState.positions
    } catch (error) {
      logger.error("Failed to get open positions:", error)
      return []
    }
  }

  async placeOrder(
    symbol: string,
    side: "buy" | "sell",
    size: number,
    leverage: number,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<{ orderId: string; status: string }> {
    try {
      logger.info(
        `Placing ${side} order: ${size} ${symbol} @ ${leverage}x leverage`
      )

      // This would call the actual Hyperliquid API
      // Following Nocturne pattern: place market order, then set SL/TP

      const orderId = `order_${Date.now()}`

      // Set stop-loss if provided
      if (stopLoss) {
        logger.info(`Setting stop-loss at ${stopLoss}`)
        // await this.setStopLoss(symbol, stopLoss)
      }

      // Set take-profit if provided
      if (takeProfit) {
        logger.info(`Setting take-profit at ${takeProfit}`)
        // await this.setTakeProfit(symbol, takeProfit)
      }

      return {
        orderId,
        status: "pending",
      }
    } catch (error) {
      logger.error("Failed to place order:", error)
      throw error
    }
  }

  async closePosition(symbol: string): Promise<{ status: string }> {
    try {
      logger.info(`Closing position: ${symbol}`)

      // Get current position
      const positions = await this.getOpenPositions()
      const position = positions.find(p => p.symbol === symbol)

      if (!position) {
        logger.warn(`No open position for ${symbol}`)
        return { status: "no_position" }
      }

      // Close position by selling/buying opposite
      const closeSide = position.side === "long" ? "sell" : "buy"
      const result = await this.placeOrder(symbol, closeSide, position.size, 1)

      return {
        status: "closed",
      }
    } catch (error) {
      logger.error("Failed to close position:", error)
      throw error
    }
  }

  async getMarketData(symbol: string): Promise<{
    price: number
    volume24h: number
    high24h: number
    low24h: number
  }> {
    try {
      logger.info(`Fetching market data for ${symbol}...`)

      // This would call the actual Hyperliquid API
      return {
        price: 0,
        volume24h: 0,
        high24h: 0,
        low24h: 0,
      }
    } catch (error) {
      logger.error("Failed to get market data:", error)
      throw error
    }
  }

  async getFundingRate(symbol: string): Promise<number> {
    try {
      // This would call the actual Hyperliquid API
      return 0
    } catch (error) {
      logger.error("Failed to get funding rate:", error)
      return 0
    }
  }
}

// Helper functions
export function validateHyperliquidTrade(
  state: HyperliquidContextState,
  symbol: string,
  side: "buy" | "sell",
  size: number,
  leverage: number,
  entryPrice: number
): { valid: boolean; reason?: string } {
  // Check leverage
  if (leverage > state.maxLeverage) {
    return {
      valid: false,
      reason: `Leverage ${leverage}x exceeds max ${state.maxLeverage}x`,
    }
  }

  // Check margin
  const requiredMargin = (size * entryPrice) / leverage
  if (requiredMargin > state.accountState.availableMargin) {
    return {
      valid: false,
      reason: `Insufficient margin. Required: $${requiredMargin}, Available: $${state.accountState.availableMargin}`,
    }
  }

  // Check risk per trade (1% rule)
  const stopLossPrice = entryPrice * (1 - state.stopLossPct / 100)
  const riskAmount = size * Math.abs(entryPrice - stopLossPrice)
  const riskPercent = (riskAmount / state.accountState.equity) * 100

  if (riskPercent > 1) {
    return {
      valid: false,
      reason: `Risk per trade ${riskPercent.toFixed(2)}% exceeds 1% rule`,
    }
  }

  return { valid: true }
}

export function calculateHyperliquidMetrics(
  state: HyperliquidContextState
): {
  totalExposure: number
  averageLeverage: number
  totalPnl: number
  winningPositions: number
  losingPositions: number
} {
  const positions = state.accountState.positions

  let totalExposure = 0
  let totalLeverage = 0
  let totalPnl = 0
  let winningPositions = 0
  let losingPositions = 0

  for (const position of positions) {
    totalExposure += position.size * position.currentPrice
    totalLeverage += position.leverage
    totalPnl += position.pnl

    if (position.pnl > 0) winningPositions++
    else if (position.pnl < 0) losingPositions++
  }

  const averageLeverage = positions.length > 0 ? totalLeverage / positions.length : 0

  return {
    totalExposure,
    averageLeverage,
    totalPnl,
    winningPositions,
    losingPositions,
  }
}

export function updateHyperliquidState(
  state: HyperliquidContextState,
  accountState: HyperliquidAccountState
): HyperliquidContextState {
  return {
    ...state,
    accountState,
    lastUpdate: Date.now(),
  }
}

// Common Hyperliquid symbols
export const HYPERLIQUID_SYMBOLS = [
  "BTC",
  "ETH",
  "SOL",
  "AVAX",
  "ARB",
  "OP",
  "DOGE",
  "XRP",
  "ADA",
  "LINK",
  "MATIC",
  "ATOM",
  "NEAR",
  "FTM",
  "AAVE",
]

// Nocturne-inspired trading parameters
export const HYPERLIQUID_DEFAULTS = {
  maxLeverage: 20,
  stopLossPct: 2,
  takeProfitPct: 3,
  riskPerTrade: 1, // 1% of equity
  minConfidence: 0.6, // 60% confidence threshold
}
