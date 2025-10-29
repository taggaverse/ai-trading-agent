import { context } from "@daydreamsai/core"
import { z } from "zod"
import logger from "../../utils/logger.js"

// Types
export interface Position {
  symbol: string
  chain: string
  venue: string
  side: "long" | "short"
  size: number
  entryPrice: number
  currentPrice: number
  leverage: number
  stopLoss: number
  takeProfit: number
  pnl: number
  pnlPercent: number
  openedAt: number
  updatedAt: number
}

export interface Trade {
  id: string
  symbol: string
  chain: string
  venue: string
  side: "buy" | "sell"
  size: number
  price: number
  fee: number
  timestamp: number
  status: "pending" | "filled" | "cancelled"
}

// Portfolio context schema
const portfolioContextSchema = z.object({
  accountId: z.string(),
})

export type PortfolioContextArgs = z.infer<typeof portfolioContextSchema>

// Portfolio context state
export interface PortfolioContextState {
  accountId: string
  balance: number
  usedMargin: number
  availableMargin: number
  positions: Position[]
  trades: Trade[]
  totalPnl: number
  totalPnlPercent: number
  lastUpdate: number
}

// Create portfolio context
export const portfolioContext = context({
  type: "portfolio-trading",
  schema: portfolioContextSchema,
  create: async (state): Promise<PortfolioContextState> => {
    logger.info(`Initializing portfolio context for ${state.args.accountId}`)
    
    return {
      accountId: state.args.accountId,
      balance: 0,
      usedMargin: 0,
      availableMargin: 0,
      positions: [],
      trades: [],
      totalPnl: 0,
      totalPnlPercent: 0,
      lastUpdate: 0,
    }
  },
})

// Helper functions
export function addPosition(
  state: PortfolioContextState,
  position: Position
): PortfolioContextState {
  const existingIndex = state.positions.findIndex(
    p => p.symbol === position.symbol && p.chain === position.chain && p.venue === position.venue
  )

  let updatedPositions: Position[]
  if (existingIndex >= 0) {
    // Update existing position
    updatedPositions = [...state.positions]
    updatedPositions[existingIndex] = position
  } else {
    // Add new position
    updatedPositions = [...state.positions, position]
  }

  return {
    ...state,
    positions: updatedPositions,
    lastUpdate: Date.now(),
  }
}

export function closePosition(
  state: PortfolioContextState,
  symbol: string,
  chain: string,
  venue: string
): PortfolioContextState {
  const updatedPositions = state.positions.filter(
    p => !(p.symbol === symbol && p.chain === chain && p.venue === venue)
  )

  return {
    ...state,
    positions: updatedPositions,
    lastUpdate: Date.now(),
  }
}

export function addTrade(
  state: PortfolioContextState,
  trade: Trade
): PortfolioContextState {
  return {
    ...state,
    trades: [...state.trades, trade],
    lastUpdate: Date.now(),
  }
}

export function updateBalance(
  state: PortfolioContextState,
  newBalance: number
): PortfolioContextState {
  return {
    ...state,
    balance: newBalance,
    lastUpdate: Date.now(),
  }
}

export function calculateMarginUsage(
  state: PortfolioContextState
): { usedMargin: number; availableMargin: number } {
  let usedMargin = 0

  for (const position of state.positions) {
    const positionMargin = (position.size * position.entryPrice) / position.leverage
    usedMargin += positionMargin
  }

  const availableMargin = state.balance - usedMargin

  return { usedMargin, availableMargin }
}

export function calculatePnL(state: PortfolioContextState): { totalPnl: number; totalPnlPercent: number } {
  let totalPnl = 0

  for (const position of state.positions) {
    totalPnl += position.pnl
  }

  const totalPnlPercent = state.balance > 0 ? (totalPnl / state.balance) * 100 : 0

  return { totalPnl, totalPnlPercent }
}

export function updatePositionPrices(
  state: PortfolioContextState,
  priceUpdates: Record<string, number>
): PortfolioContextState {
  const updatedPositions = state.positions.map(position => {
    const key = `${position.symbol}-${position.chain}`
    const newPrice = priceUpdates[key] || position.currentPrice

    const pnl = position.side === "long"
      ? (newPrice - position.entryPrice) * position.size
      : (position.entryPrice - newPrice) * position.size

    const pnlPercent = ((newPrice - position.entryPrice) / position.entryPrice) * 100

    return {
      ...position,
      currentPrice: newPrice,
      pnl,
      pnlPercent,
      updatedAt: Date.now(),
    }
  })

  const { totalPnl, totalPnlPercent } = calculatePnL({
    ...state,
    positions: updatedPositions,
  })

  const { usedMargin, availableMargin } = calculateMarginUsage({
    ...state,
    positions: updatedPositions,
  })

  return {
    ...state,
    positions: updatedPositions,
    totalPnl,
    totalPnlPercent,
    usedMargin,
    availableMargin,
    lastUpdate: Date.now(),
  }
}

export function getPositionSummary(state: PortfolioContextState): {
  totalPositions: number
  totalExposure: number
  averageLeverage: number
  winningPositions: number
  losingPositions: number
} {
  const totalPositions = state.positions.length
  const totalExposure = state.positions.reduce((sum, p) => sum + (p.size * p.currentPrice), 0)
  const averageLeverage = totalPositions > 0
    ? state.positions.reduce((sum, p) => sum + p.leverage, 0) / totalPositions
    : 0
  const winningPositions = state.positions.filter(p => p.pnl > 0).length
  const losingPositions = state.positions.filter(p => p.pnl < 0).length

  return {
    totalPositions,
    totalExposure,
    averageLeverage,
    winningPositions,
    losingPositions,
  }
}

export function getRecentTrades(state: PortfolioContextState, limit: number = 10): Trade[] {
  return state.trades.slice(-limit)
}
