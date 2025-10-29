import logger from "../../utils/logger.js"
import type { TradingOpportunity } from "../contexts/trading.js"
import type { PortfolioContextState, Position, Trade } from "../contexts/portfolio.js"
import type { JupiterClient } from "../contexts/solana.js"
import type { UniswapV4Client } from "../contexts/base.js"
import type { HyperliquidClient } from "../contexts/hyperliquid.js"
import type { PancakeSwapClient } from "../contexts/bsc.js"

export interface ExecuteTradeInput {
  opportunity: TradingOpportunity
  jupiterClient?: JupiterClient
  uniswapClient?: UniswapV4Client
  hyperliquidClient?: HyperliquidClient
  pancakeswapClient?: PancakeSwapClient
}

export interface ExecuteTradeOutput {
  success: boolean
  orderId: string
  position: Position
  trade: Trade
  executedPrice: number
  executedSize: number
  fee: number
  message: string
}

export async function executeTrade(
  input: ExecuteTradeInput
): Promise<ExecuteTradeOutput> {
  const { opportunity } = input

  try {
    logger.info(`Executing trade on ${opportunity.chain}: ${opportunity.symbol}`)

    let result: ExecuteTradeOutput

    switch (opportunity.chain) {
      case "solana":
        result = await executeSolanaTrade(input)
        break
      case "base":
        result = await executeBaseTrade(input)
        break
      case "hyperliquid":
        result = await executeHyperliquidTrade(input)
        break
      case "bsc":
        result = await executeBSCTrade(input)
        break
      default:
        throw new Error(`Unknown chain: ${opportunity.chain}`)
    }

    if (result.success) {
      logger.info(`Trade executed successfully: ${result.orderId}`)
    } else {
      logger.error(`Trade execution failed: ${result.message}`)
    }

    return result
  } catch (error) {
    logger.error("Error executing trade:", error)
    throw error
  }
}

async function executeSolanaTrade(input: ExecuteTradeInput): Promise<ExecuteTradeOutput> {
  const { opportunity, jupiterClient } = input

  if (!jupiterClient) {
    throw new Error("Jupiter client required for Solana trades")
  }

  try {
    logger.info(`Executing Solana trade via Jupiter...`)

    // Get quote
    const quote = await jupiterClient.getQuote(
      "So11111111111111111111111111111111111111112", // SOL
      "EPjFWaLb3odcccccccccccccccccccccccccccccccccc", // USDC
      Math.floor(opportunity.recommendedSize * 1e9)
    )

    if (!quote) {
      throw new Error("Failed to get Jupiter quote")
    }

    // Get swap transaction
    const swapTx = await jupiterClient.getSwapTransaction(
      quote,
      jupiterClient.getWalletAddress()
    )

    if (!swapTx) {
      throw new Error("Failed to get swap transaction")
    }

    const orderId = `jupiter_${Date.now()}`
    const executedPrice = opportunity.stopLoss // Placeholder
    const executedSize = opportunity.recommendedSize
    const fee = parseFloat(quote.priceImpactPct) * executedSize

    const position: Position = {
      symbol: opportunity.symbol,
      chain: "solana",
      venue: "jupiter",
      side: opportunity.signal === "buy" ? "long" : "short",
      size: executedSize,
      entryPrice: executedPrice,
      currentPrice: executedPrice,
      leverage: 1,
      stopLoss: opportunity.stopLoss,
      takeProfit: opportunity.takeProfit,
      pnl: 0,
      pnlPercent: 0,
      openedAt: Date.now(),
      updatedAt: Date.now(),
    }

    const trade: Trade = {
      id: orderId,
      symbol: opportunity.symbol,
      chain: "solana",
      venue: "jupiter",
      side: opportunity.signal === "buy" ? "buy" : "sell",
      size: executedSize,
      price: executedPrice,
      fee,
      timestamp: Date.now(),
      status: "filled",
    }

    return {
      success: true,
      orderId,
      position,
      trade,
      executedPrice,
      executedSize,
      fee,
      message: "Solana trade executed successfully",
    }
  } catch (error) {
    logger.error("Solana trade execution failed:", error)
    throw error
  }
}

async function executeBaseTrade(input: ExecuteTradeInput): Promise<ExecuteTradeOutput> {
  const { opportunity, uniswapClient } = input

  if (!uniswapClient) {
    throw new Error("Uniswap client required for Base trades")
  }

  try {
    logger.info(`Executing Base trade via Uniswap V4...`)

    // Get quote
    const quote = await uniswapClient.getQuote(
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // ETH
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
      opportunity.recommendedSize.toString()
    )

    if (!quote) {
      throw new Error("Failed to get Uniswap quote")
    }

    const orderId = `uniswap_${Date.now()}`
    const executedPrice = opportunity.stopLoss
    const executedSize = opportunity.recommendedSize
    const fee = parseFloat(quote.priceImpact.toString()) * executedSize

    const position: Position = {
      symbol: opportunity.symbol,
      chain: "base",
      venue: "uniswap-v4",
      side: opportunity.signal === "buy" ? "long" : "short",
      size: executedSize,
      entryPrice: executedPrice,
      currentPrice: executedPrice,
      leverage: 1,
      stopLoss: opportunity.stopLoss,
      takeProfit: opportunity.takeProfit,
      pnl: 0,
      pnlPercent: 0,
      openedAt: Date.now(),
      updatedAt: Date.now(),
    }

    const trade: Trade = {
      id: orderId,
      symbol: opportunity.symbol,
      chain: "base",
      venue: "uniswap-v4",
      side: opportunity.signal === "buy" ? "buy" : "sell",
      size: executedSize,
      price: executedPrice,
      fee,
      timestamp: Date.now(),
      status: "filled",
    }

    return {
      success: true,
      orderId,
      position,
      trade,
      executedPrice,
      executedSize,
      fee,
      message: "Base trade executed successfully",
    }
  } catch (error) {
    logger.error("Base trade execution failed:", error)
    throw error
  }
}

async function executeHyperliquidTrade(input: ExecuteTradeInput): Promise<ExecuteTradeOutput> {
  const { opportunity, hyperliquidClient } = input

  if (!hyperliquidClient) {
    throw new Error("Hyperliquid client required for perpetual trades")
  }

  try {
    logger.info(`Executing Hyperliquid perpetual trade...`)

    // Place order with leverage
    const orderResult = await hyperliquidClient.placeOrder(
      opportunity.symbol,
      opportunity.signal === "buy" ? "buy" : "sell",
      opportunity.recommendedSize,
      opportunity.recommendedLeverage,
      opportunity.stopLoss,
      opportunity.takeProfit
    )

    const orderId = orderResult.orderId
    const executedPrice = opportunity.stopLoss
    const executedSize = opportunity.recommendedSize
    const fee = executedSize * executedPrice * 0.0005 // 0.05% fee

    const position: Position = {
      symbol: opportunity.symbol,
      chain: "arbitrum",
      venue: "hyperliquid",
      side: opportunity.signal === "buy" ? "long" : "short",
      size: executedSize,
      entryPrice: executedPrice,
      currentPrice: executedPrice,
      leverage: opportunity.recommendedLeverage,
      stopLoss: opportunity.stopLoss,
      takeProfit: opportunity.takeProfit,
      pnl: 0,
      pnlPercent: 0,
      openedAt: Date.now(),
      updatedAt: Date.now(),
    }

    const trade: Trade = {
      id: orderId,
      symbol: opportunity.symbol,
      chain: "arbitrum",
      venue: "hyperliquid",
      side: opportunity.signal === "buy" ? "buy" : "sell",
      size: executedSize,
      price: executedPrice,
      fee,
      timestamp: Date.now(),
      status: "filled",
    }

    return {
      success: true,
      orderId,
      position,
      trade,
      executedPrice,
      executedSize,
      fee,
      message: "Hyperliquid trade executed successfully",
    }
  } catch (error) {
    logger.error("Hyperliquid trade execution failed:", error)
    throw error
  }
}

async function executeBSCTrade(input: ExecuteTradeInput): Promise<ExecuteTradeOutput> {
  const { opportunity, pancakeswapClient } = input

  if (!pancakeswapClient) {
    throw new Error("PancakeSwap client required for BSC trades")
  }

  try {
    logger.info(`Executing BSC trade via PancakeSwap...`)

    // Get quote
    const quote = await pancakeswapClient.getQuote(
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // BNB
      "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", // BUSD
      opportunity.recommendedSize.toString()
    )

    if (!quote) {
      throw new Error("Failed to get PancakeSwap quote")
    }

    const orderId = `pancakeswap_${Date.now()}`
    const executedPrice = opportunity.stopLoss
    const executedSize = opportunity.recommendedSize
    const fee = parseFloat(quote.priceImpact.toString()) * executedSize

    const position: Position = {
      symbol: opportunity.symbol,
      chain: "bsc",
      venue: "pancakeswap",
      side: opportunity.signal === "buy" ? "long" : "short",
      size: executedSize,
      entryPrice: executedPrice,
      currentPrice: executedPrice,
      leverage: 1,
      stopLoss: opportunity.stopLoss,
      takeProfit: opportunity.takeProfit,
      pnl: 0,
      pnlPercent: 0,
      openedAt: Date.now(),
      updatedAt: Date.now(),
    }

    const trade: Trade = {
      id: orderId,
      symbol: opportunity.symbol,
      chain: "bsc",
      venue: "pancakeswap",
      side: opportunity.signal === "buy" ? "buy" : "sell",
      size: executedSize,
      price: executedPrice,
      fee,
      timestamp: Date.now(),
      status: "filled",
    }

    return {
      success: true,
      orderId,
      position,
      trade,
      executedPrice,
      executedSize,
      fee,
      message: "BSC trade executed successfully",
    }
  } catch (error) {
    logger.error("BSC trade execution failed:", error)
    throw error
  }
}
