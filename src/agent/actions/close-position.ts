import logger from "../../utils/logger.js"
import type { Position, Trade } from "../contexts/portfolio.js"
import type { JupiterClient } from "../contexts/solana.js"
import type { UniswapV4Client } from "../contexts/base.js"
import type { HyperliquidClient } from "../contexts/hyperliquid.js"
import type { PancakeSwapClient } from "../contexts/bsc.js"

export interface ClosePositionInput {
  position: Position
  currentPrice: number
  jupiterClient?: JupiterClient
  uniswapClient?: UniswapV4Client
  hyperliquidClient?: HyperliquidClient
  pancakeswapClient?: PancakeSwapClient
}

export interface ClosePositionOutput {
  success: boolean
  orderId: string
  closedPosition: Position
  closingTrade: Trade
  exitPrice: number
  pnl: number
  pnlPercent: number
  fee: number
  message: string
}

export async function closePosition(
  input: ClosePositionInput
): Promise<ClosePositionOutput> {
  const { position, currentPrice } = input

  try {
    logger.info(`Closing position: ${position.symbol} on ${position.chain}`)

    let result: ClosePositionOutput

    switch (position.chain) {
      case "solana":
        result = await closeSolanaPosition(input)
        break
      case "base":
        result = await closeBasePosition(input)
        break
      case "arbitrum":
        result = await closeHyperliquidPosition(input)
        break
      case "bsc":
        result = await closeBSCPosition(input)
        break
      default:
        throw new Error(`Unknown chain: ${position.chain}`)
    }

    if (result.success) {
      logger.info(`Position closed successfully: ${result.orderId}`)
      logger.info(`P&L: $${result.pnl.toFixed(2)} (${result.pnlPercent.toFixed(2)}%)`)
    } else {
      logger.error(`Position closing failed: ${result.message}`)
    }

    return result
  } catch (error) {
    logger.error("Error closing position:", error)
    throw error
  }
}

async function closeSolanaPosition(input: ClosePositionInput): Promise<ClosePositionOutput> {
  const { position, currentPrice, jupiterClient } = input

  if (!jupiterClient) {
    throw new Error("Jupiter client required for Solana positions")
  }

  try {
    logger.info(`Closing Solana position via Jupiter...`)

    // Get quote for closing
    const quote = await jupiterClient.getQuote(
      "EPjFWaLb3odcccccccccccccccccccccccccccccccccc", // USDC
      "So11111111111111111111111111111111111111112", // SOL
      Math.floor(position.size * 1e6)
    )

    if (!quote) {
      throw new Error("Failed to get closing quote")
    }

    const orderId = `close_jupiter_${Date.now()}`
    const exitPrice = currentPrice
    const pnl = position.side === "long"
      ? (exitPrice - position.entryPrice) * position.size
      : (position.entryPrice - exitPrice) * position.size
    const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100
    const fee = parseFloat(quote.priceImpactPct) * position.size

    const closedPosition: Position = {
      ...position,
      currentPrice: exitPrice,
      pnl,
      pnlPercent,
      updatedAt: Date.now(),
    }

    const closingTrade: Trade = {
      id: orderId,
      symbol: position.symbol,
      chain: position.chain,
      venue: position.venue,
      side: position.side === "long" ? "sell" : "buy",
      size: position.size,
      price: exitPrice,
      fee,
      timestamp: Date.now(),
      status: "filled",
    }

    return {
      success: true,
      orderId,
      closedPosition,
      closingTrade,
      exitPrice,
      pnl,
      pnlPercent,
      fee,
      message: "Solana position closed successfully",
    }
  } catch (error) {
    logger.error("Solana position closing failed:", error)
    throw error
  }
}

async function closeBasePosition(input: ClosePositionInput): Promise<ClosePositionOutput> {
  const { position, currentPrice, uniswapClient } = input

  if (!uniswapClient) {
    throw new Error("Uniswap client required for Base positions")
  }

  try {
    logger.info(`Closing Base position via Uniswap V4...`)

    // Get quote for closing
    const quote = await uniswapClient.getQuote(
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // ETH
      position.size.toString()
    )

    if (!quote) {
      throw new Error("Failed to get closing quote")
    }

    const orderId = `close_uniswap_${Date.now()}`
    const exitPrice = currentPrice
    const pnl = position.side === "long"
      ? (exitPrice - position.entryPrice) * position.size
      : (position.entryPrice - exitPrice) * position.size
    const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100
    const fee = parseFloat(quote.priceImpact.toString()) * position.size

    const closedPosition: Position = {
      ...position,
      currentPrice: exitPrice,
      pnl,
      pnlPercent,
      updatedAt: Date.now(),
    }

    const closingTrade: Trade = {
      id: orderId,
      symbol: position.symbol,
      chain: position.chain,
      venue: position.venue,
      side: position.side === "long" ? "sell" : "buy",
      size: position.size,
      price: exitPrice,
      fee,
      timestamp: Date.now(),
      status: "filled",
    }

    return {
      success: true,
      orderId,
      closedPosition,
      closingTrade,
      exitPrice,
      pnl,
      pnlPercent,
      fee,
      message: "Base position closed successfully",
    }
  } catch (error) {
    logger.error("Base position closing failed:", error)
    throw error
  }
}

async function closeHyperliquidPosition(input: ClosePositionInput): Promise<ClosePositionOutput> {
  const { position, currentPrice, hyperliquidClient } = input

  if (!hyperliquidClient) {
    throw new Error("Hyperliquid client required for perpetual positions")
  }

  try {
    logger.info(`Closing Hyperliquid perpetual position...`)

    // Close position
    const closeResult = await hyperliquidClient.closePosition(position.symbol)

    const orderId = `close_hyperliquid_${Date.now()}`
    const exitPrice = currentPrice
    const pnl = position.side === "long"
      ? (exitPrice - position.entryPrice) * position.size
      : (position.entryPrice - exitPrice) * position.size
    const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100
    const fee = exitPrice * position.size * 0.0005 // 0.05% fee

    const closedPosition: Position = {
      ...position,
      currentPrice: exitPrice,
      pnl,
      pnlPercent,
      updatedAt: Date.now(),
    }

    const closingTrade: Trade = {
      id: orderId,
      symbol: position.symbol,
      chain: position.chain,
      venue: position.venue,
      side: position.side === "long" ? "sell" : "buy",
      size: position.size,
      price: exitPrice,
      fee,
      timestamp: Date.now(),
      status: "filled",
    }

    return {
      success: true,
      orderId,
      closedPosition,
      closingTrade,
      exitPrice,
      pnl,
      pnlPercent,
      fee,
      message: "Hyperliquid position closed successfully",
    }
  } catch (error) {
    logger.error("Hyperliquid position closing failed:", error)
    throw error
  }
}

async function closeBSCPosition(input: ClosePositionInput): Promise<ClosePositionOutput> {
  const { position, currentPrice, pancakeswapClient } = input

  if (!pancakeswapClient) {
    throw new Error("PancakeSwap client required for BSC positions")
  }

  try {
    logger.info(`Closing BSC position via PancakeSwap...`)

    // Get quote for closing
    const quote = await pancakeswapClient.getQuote(
      "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", // BUSD
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // BNB
      position.size.toString()
    )

    if (!quote) {
      throw new Error("Failed to get closing quote")
    }

    const orderId = `close_pancakeswap_${Date.now()}`
    const exitPrice = currentPrice
    const pnl = position.side === "long"
      ? (exitPrice - position.entryPrice) * position.size
      : (position.entryPrice - exitPrice) * position.size
    const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100
    const fee = parseFloat(quote.priceImpact.toString()) * position.size

    const closedPosition: Position = {
      ...position,
      currentPrice: exitPrice,
      pnl,
      pnlPercent,
      updatedAt: Date.now(),
    }

    const closingTrade: Trade = {
      id: orderId,
      symbol: position.symbol,
      chain: position.chain,
      venue: position.venue,
      side: position.side === "long" ? "sell" : "buy",
      size: position.size,
      price: exitPrice,
      fee,
      timestamp: Date.now(),
      status: "filled",
    }

    return {
      success: true,
      orderId,
      closedPosition,
      closingTrade,
      exitPrice,
      pnl,
      pnlPercent,
      fee,
      message: "BSC position closed successfully",
    }
  } catch (error) {
    logger.error("BSC position closing failed:", error)
    throw error
  }
}
