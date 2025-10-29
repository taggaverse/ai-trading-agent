import { context } from "../../types/daydreams.js"
import { z } from "zod"
import logger from "../../utils/logger.js"
import type { MarketContextState } from "./market.js"
import type { ResearchContextState } from "./research.js"
import type { PortfolioContextState } from "./portfolio.js"
import type { RiskContextState } from "./risk.js"
import type { SolanaContextState } from "./solana.js"
import type { BaseContextState } from "./base.js"
import type { HyperliquidContextState } from "./hyperliquid.js"
import type { BSCContextState } from "./bsc.js"

// Types
export interface TradingOpportunity {
  chain: "solana" | "base" | "hyperliquid" | "bsc"
  symbol: string
  signal: "buy" | "sell" | "hold"
  confidence: number // 0-1
  technicalScore: number // 0-1
  researchScore: number // 0-1
  riskScore: number // 0-1
  estimatedProfit: number
  estimatedLoss: number
  recommendedSize: number
  recommendedLeverage: number
  stopLoss: number
  takeProfit: number
  reasoning: string
  timestamp: number
}

export interface TradingDecision {
  opportunity: TradingOpportunity
  action: "execute" | "skip" | "monitor"
  reason: string
  timestamp: number
}

// Trading context schema
const tradingContextSchema = z.object({
  accountId: z.string(),
})

export type TradingContextArgs = z.infer<typeof tradingContextSchema>

// Trading context state - composes all contexts
export interface TradingContextState {
  accountId: string
  
  // Core contexts
  market: MarketContextState | null
  research: ResearchContextState | null
  portfolio: PortfolioContextState | null
  risk: RiskContextState | null
  
  // Chain contexts
  solana: SolanaContextState | null
  base: BaseContextState | null
  hyperliquid: HyperliquidContextState | null
  bsc: BSCContextState | null
  
  // Trading state
  opportunities: TradingOpportunity[]
  lastDecision: TradingDecision | null
  totalOpportunitiesFound: number
  totalExecuted: number
  successRate: number
  
  lastUpdate: number
}

// Create trading context
export const tradingContext = context({
  type: "trading",
  schema: tradingContextSchema,
  create: async (state: any): Promise<TradingContextState> => {
    logger.info(`Initializing trading context for ${state.args.accountId}`)

    return {
      accountId: state.args.accountId,
      market: null,
      research: null,
      portfolio: null,
      risk: null,
      solana: null,
      base: null,
      hyperliquid: null,
      bsc: null,
      opportunities: [],
      lastDecision: null,
      totalOpportunitiesFound: 0,
      totalExecuted: 0,
      successRate: 0,
      lastUpdate: 0,
    }
  },
})

// Helper functions
export function updateTradingContextWithCoreContexts(
  state: TradingContextState,
  market: MarketContextState,
  research: ResearchContextState,
  portfolio: PortfolioContextState,
  risk: RiskContextState
): TradingContextState {
  return {
    ...state,
    market,
    research,
    portfolio,
    risk,
    lastUpdate: Date.now(),
  }
}

export function updateTradingContextWithChainContexts(
  state: TradingContextState,
  solana: SolanaContextState | null,
  base: BaseContextState | null,
  hyperliquid: HyperliquidContextState | null,
  bsc: BSCContextState | null
): TradingContextState {
  return {
    ...state,
    solana,
    base,
    hyperliquid,
    bsc,
    lastUpdate: Date.now(),
  }
}

export function generateTradingOpportunities(
  state: TradingContextState
): TradingOpportunity[] {
  const opportunities: TradingOpportunity[] = []

  if (!state.market || !state.research || !state.portfolio || !state.risk) {
    logger.warn("Missing core contexts for opportunity generation")
    return opportunities
  }

  // Generate opportunities from market signals
  for (const signal of state.market.signals) {
    // Calculate technical score
    const technicalScore = signal.strength

    // Get research score
    const researchScore = state.research.alphaSignals.length > 0
      ? state.research.alphaSignals[0].confidence
      : 0.5

    // Calculate risk score
    const riskScore = Math.max(0, 1 - (state.risk.metrics.portfolioDrawdown / state.risk.limits.maxDrawdown))

    // Combined confidence
    const confidence = (technicalScore * 0.4 + researchScore * 0.4 + riskScore * 0.2)

    // Only generate opportunity if confidence is high enough
    if (confidence > 0.6) {
      const opportunity: TradingOpportunity = {
        chain: selectBestChain(state),
        symbol: state.market.symbol,
        signal: signal.type === "bullish" ? "buy" : signal.type === "bearish" ? "sell" : "hold",
        confidence,
        technicalScore,
        researchScore,
        riskScore,
        estimatedProfit: calculateEstimatedProfit(state, confidence),
        estimatedLoss: calculateEstimatedLoss(state),
        recommendedSize: calculateRecommendedSize(state),
        recommendedLeverage: calculateRecommendedLeverage(state, confidence),
        stopLoss: calculateStopLoss(state),
        takeProfit: calculateTakeProfit(state),
        reasoning: generateReasoning(signal, state.research, confidence),
        timestamp: Date.now(),
      }

      opportunities.push(opportunity)
    }
  }

  return opportunities
}

export function selectBestChain(state: TradingContextState): "solana" | "base" | "hyperliquid" | "bsc" {
  // Hyperliquid for leverage trades
  if (state.market && state.market.indicators.rsi14 > 70) {
    return "hyperliquid"
  }

  // Solana for high-frequency
  if (state.market && state.market.priceChangePercent > 5) {
    return "solana"
  }

  // Base for low-fee trades
  if (state.portfolio && state.portfolio.balance < 10000) {
    return "base"
  }

  // BSC for volume
  return "bsc"
}

export function calculateEstimatedProfit(state: TradingContextState, confidence: number): number {
  if (!state.market || !state.portfolio) return 0

  const baseProfit = state.market.currentPrice * 0.03 // 3% target
  return baseProfit * confidence * (state.portfolio.balance / 10000)
}

export function calculateEstimatedLoss(state: TradingContextState): number {
  if (!state.market || !state.portfolio) return 0

  const baseLoss = state.market.currentPrice * 0.02 // 2% stop loss
  return baseLoss * (state.portfolio.balance / 10000)
}

export function calculateRecommendedSize(state: TradingContextState): number {
  if (!state.portfolio || !state.risk) return 0

  // Risk 1% of portfolio per trade
  const riskAmount = state.portfolio.balance * 0.01
  const availableMargin = state.risk.metrics.availableMargin ?? state.portfolio.balance

  return Math.min(riskAmount, availableMargin)
}

export function calculateRecommendedLeverage(state: TradingContextState, confidence: number): number {
  if (!state.risk) return 1

  // Higher confidence = higher leverage
  const baseLeverage = 1 + confidence * 19 // 1x to 20x
  return Math.min(baseLeverage, state.risk.limits.maxLeverage)
}

export function calculateStopLoss(state: TradingContextState): number {
  if (!state.market || !state.risk) return 0

  const stopLossPct = state.risk.limits.maxDrawdown * 100
  return state.market.currentPrice * (1 - stopLossPct / 100)
}

export function calculateTakeProfit(state: TradingContextState): number {
  if (!state.market) return 0

  // 3% take profit
  return state.market.currentPrice * 1.03
}

export function generateReasoning(signal: any, research: ResearchContextState, confidence: number): string {
  const parts: string[] = []

  if (signal.type === "bullish") {
    parts.push("Technical analysis shows bullish signals")
  } else if (signal.type === "bearish") {
    parts.push("Technical analysis shows bearish signals")
  }

  if (research.alphaSignals.length > 0) {
    const alphaSignal = research.alphaSignals[0]
    parts.push(`Research indicates ${alphaSignal.signal} signal`)
  }

  parts.push(`Confidence: ${(confidence * 100).toFixed(1)}%`)

  return parts.join(". ")
}

export function evaluateTradingDecision(
  opportunity: TradingOpportunity,
  state: TradingContextState
): TradingDecision {
  let action: "execute" | "skip" | "monitor" = "skip"
  let reason = ""

  // Check if we should execute
  if (opportunity.confidence > 0.7) {
    // Validate against risk limits
    if (state.risk) {
      const { valid, reason: validationReason } = validateOpportunityAgainstRisk(
        opportunity,
        state.risk
      )

      if (valid) {
        action = "execute"
        reason = "High confidence and risk validation passed"
      } else {
        action = "skip"
        reason = validationReason || "Risk validation failed"
      }
    } else {
      action = "execute"
      reason = "High confidence opportunity"
    }
  } else if (opportunity.confidence > 0.5) {
    action = "monitor"
    reason = "Moderate confidence - monitoring for better entry"
  } else {
    action = "skip"
    reason = "Low confidence opportunity"
  }

  return {
    opportunity,
    action,
    reason,
    timestamp: Date.now(),
  }
}

export function validateOpportunityAgainstRisk(
  opportunity: TradingOpportunity,
  risk: RiskContextState
): { valid: boolean; reason?: string } {
  // Check position size
  if (opportunity.recommendedSize > risk.limits.maxPositionSize) {
    return {
      valid: false,
      reason: `Position size exceeds limit`,
    }
  }

  // Check leverage
  if (opportunity.recommendedLeverage > risk.limits.maxLeverage) {
    return {
      valid: false,
      reason: `Leverage exceeds limit`,
    }
  }

  // Check drawdown
  if (risk.metrics.portfolioDrawdown > risk.limits.maxDrawdown) {
    return {
      valid: false,
      reason: `Portfolio drawdown exceeds limit`,
    }
  }

  return { valid: true }
}

export function updateTradingStats(
  state: TradingContextState,
  decision: TradingDecision
): TradingContextState {
  const newState = {
    ...state,
    lastDecision: decision,
    totalOpportunitiesFound: state.totalOpportunitiesFound + 1,
  }

  if (decision.action === "execute") {
    newState.totalExecuted = state.totalExecuted + 1
  }

  if (newState.totalExecuted > 0) {
    newState.successRate = newState.totalExecuted / newState.totalOpportunitiesFound
  }

  return newState
}

export function getTradingContextSummary(state: TradingContextState): {
  totalBalance: number
  totalExposure: number
  totalPnl: number
  activeOpportunities: number
  successRate: number
  riskLevel: string
} {
  let totalBalance = 0
  let totalExposure = 0
  let totalPnl = 0

  if (state.portfolio) {
    totalBalance = state.portfolio.balance
    totalPnl = state.portfolio.totalPnl
  }

  if (state.risk) {
    totalExposure = state.risk.metrics.totalExposure
  }

  const riskLevel =
    state.risk && state.risk.metrics.portfolioDrawdown > 0.2
      ? "high"
      : state.risk && state.risk.metrics.portfolioDrawdown > 0.1
        ? "medium"
        : "low"

  return {
    totalBalance,
    totalExposure,
    totalPnl,
    activeOpportunities: state.opportunities.length,
    successRate: state.successRate,
    riskLevel,
  }
}

export function getChainSpecificData(
  state: TradingContextState,
  chain: "solana" | "base" | "hyperliquid" | "bsc"
): any {
  switch (chain) {
    case "solana":
      return state.solana
    case "base":
      return state.base
    case "hyperliquid":
      return state.hyperliquid
    case "bsc":
      return state.bsc
    default:
      return null
  }
}

export function getAllChainData(state: TradingContextState): Record<string, any> {
  return {
    solana: state.solana,
    base: state.base,
    hyperliquid: state.hyperliquid,
    bsc: state.bsc,
  }
}

// Logging helpers
export function logTradingContext(state: TradingContextState): void {
  const summary = getTradingContextSummary(state)

  logger.info("=== Trading Context Summary ===")
  logger.info(`Balance: $${summary.totalBalance.toFixed(2)}`)
  logger.info(`Exposure: $${summary.totalExposure.toFixed(2)}`)
  logger.info(`P&L: $${summary.totalPnl.toFixed(2)}`)
  logger.info(`Active Opportunities: ${summary.activeOpportunities}`)
  logger.info(`Success Rate: ${(summary.successRate * 100).toFixed(1)}%`)
  logger.info(`Risk Level: ${summary.riskLevel}`)

  if (state.lastDecision) {
    logger.info(`Last Decision: ${state.lastDecision.action} (${state.lastDecision.reason})`)
  }
}

export function logTradingOpportunity(opportunity: TradingOpportunity): void {
  logger.info("=== Trading Opportunity ===")
  logger.info(`Chain: ${opportunity.chain}`)
  logger.info(`Symbol: ${opportunity.symbol}`)
  logger.info(`Signal: ${opportunity.signal}`)
  logger.info(`Confidence: ${(opportunity.confidence * 100).toFixed(1)}%`)
  logger.info(`Technical Score: ${(opportunity.technicalScore * 100).toFixed(1)}%`)
  logger.info(`Research Score: ${(opportunity.researchScore * 100).toFixed(1)}%`)
  logger.info(`Risk Score: ${(opportunity.riskScore * 100).toFixed(1)}%`)
  logger.info(`Est. Profit: $${opportunity.estimatedProfit.toFixed(2)}`)
  logger.info(`Est. Loss: $${opportunity.estimatedLoss.toFixed(2)}`)
  logger.info(`Recommended Size: $${opportunity.recommendedSize.toFixed(2)}`)
  logger.info(`Recommended Leverage: ${opportunity.recommendedLeverage.toFixed(1)}x`)
  logger.info(`Stop Loss: $${opportunity.stopLoss.toFixed(2)}`)
  logger.info(`Take Profit: $${opportunity.takeProfit.toFixed(2)}`)
  logger.info(`Reasoning: ${opportunity.reasoning}`)
}
