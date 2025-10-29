import { context } from "@daydreamsai/core"
import { z } from "zod"
import logger from "../../utils/logger.js"
import type { Position } from "./portfolio.js"

// Types
export interface RiskLimits {
  maxPositionSize: number
  maxLeverage: number
  maxDailyVolume: number
  maxDrawdown: number
  maxCorrelation: number
}

export interface RiskMetrics {
  totalExposure: number
  averageLeverage: number
  portfolioDrawdown: number
  correlationRisk: number
  venueConcentration: Record<string, number>
  chainConcentration: Record<string, number>
}

export interface RiskAlert {
  type: "warning" | "critical"
  message: string
  metric: string
  value: number
  limit: number
  timestamp: number
}

// Risk context schema
const riskContextSchema = z.object({
  accountId: z.string(),
})

export type RiskContextArgs = z.infer<typeof riskContextSchema>

// Risk context state
export interface RiskContextState {
  accountId: string
  limits: RiskLimits
  metrics: RiskMetrics
  alerts: RiskAlert[]
  lastUpdate: number
}

// Default risk limits
const DEFAULT_LIMITS: RiskLimits = {
  maxPositionSize: 50000,      // $50k per position
  maxLeverage: 20,             // 20x max leverage
  maxDailyVolume: 500000,      // $500k daily volume
  maxDrawdown: 0.25,           // 25% max drawdown
  maxCorrelation: 0.70,        // 70% max correlation
}

// Create risk context
export const riskContext = context({
  type: "risk-trading",
  schema: riskContextSchema,
  create: async (state): Promise<RiskContextState> => {
    logger.info(`Initializing risk context for ${state.args.accountId}`)
    
    return {
      accountId: state.args.accountId,
      limits: DEFAULT_LIMITS,
      metrics: {
        totalExposure: 0,
        averageLeverage: 0,
        portfolioDrawdown: 0,
        correlationRisk: 0,
        venueConcentration: {},
        chainConcentration: {},
      },
      alerts: [],
      lastUpdate: 0,
    }
  },
})

// Helper functions
export function validateTrade(
  position: Position,
  state: RiskContextState,
  currentBalance: number
): { valid: boolean; reason?: string } {
  const limits = state.limits

  // Check position size
  const positionValue = position.size * position.entryPrice
  if (positionValue > limits.maxPositionSize) {
    return {
      valid: false,
      reason: `Position size $${positionValue} exceeds limit $${limits.maxPositionSize}`,
    }
  }

  // Check leverage
  if (position.leverage > limits.maxLeverage) {
    return {
      valid: false,
      reason: `Leverage ${position.leverage}x exceeds limit ${limits.maxLeverage}x`,
    }
  }

  // Check margin availability
  const requiredMargin = (position.size * position.entryPrice) / position.leverage
  if (requiredMargin > currentBalance) {
    return {
      valid: false,
      reason: `Insufficient margin. Required: $${requiredMargin}, Available: $${currentBalance}`,
    }
  }

  // Check risk per trade (1% rule)
  const riskAmount = position.size * Math.abs(position.entryPrice - position.stopLoss)
  const riskPercent = (riskAmount / currentBalance) * 100
  if (riskPercent > 1) {
    return {
      valid: false,
      reason: `Risk per trade ${riskPercent.toFixed(2)}% exceeds 1% rule`,
    }
  }

  return { valid: true }
}

export function calculateMetrics(
  positions: Position[],
  currentBalance: number
): RiskMetrics {
  let totalExposure = 0
  let totalLeverage = 0
  const venueConcentration: Record<string, number> = {}
  const chainConcentration: Record<string, number> = {}

  for (const position of positions) {
    const exposure = position.size * position.currentPrice
    totalExposure += exposure
    totalLeverage += position.leverage

    // Track venue concentration
    venueConcentration[position.venue] = (venueConcentration[position.venue] || 0) + exposure

    // Track chain concentration
    chainConcentration[position.chain] = (chainConcentration[position.chain] || 0) + exposure
  }

  const averageLeverage = positions.length > 0 ? totalLeverage / positions.length : 0
  const portfolioDrawdown = currentBalance > 0 ? Math.max(0, (totalExposure - currentBalance) / currentBalance) : 0

  // Normalize concentrations to percentages
  const normalizedVenueConcentration: Record<string, number> = {}
  const normalizedChainConcentration: Record<string, number> = {}

  if (totalExposure > 0) {
    for (const [venue, exposure] of Object.entries(venueConcentration)) {
      normalizedVenueConcentration[venue] = exposure / totalExposure
    }
    for (const [chain, exposure] of Object.entries(chainConcentration)) {
      normalizedChainConcentration[chain] = exposure / totalExposure
    }
  }

  return {
    totalExposure,
    averageLeverage,
    portfolioDrawdown,
    correlationRisk: 0, // Placeholder - would calculate actual correlation
    venueConcentration: normalizedVenueConcentration,
    chainConcentration: normalizedChainConcentration,
  }
}

export function checkRiskLimits(
  state: RiskContextState,
  positions: Position[],
  currentBalance: number
): RiskAlert[] {
  const alerts: RiskAlert[] = []
  const metrics = calculateMetrics(positions, currentBalance)

  // Check average leverage
  if (metrics.averageLeverage > state.limits.maxLeverage * 0.8) {
    alerts.push({
      type: "warning",
      message: `Average leverage ${metrics.averageLeverage.toFixed(1)}x approaching limit`,
      metric: "averageLeverage",
      value: metrics.averageLeverage,
      limit: state.limits.maxLeverage,
      timestamp: Date.now(),
    })
  }

  if (metrics.averageLeverage > state.limits.maxLeverage) {
    alerts.push({
      type: "critical",
      message: `Average leverage ${metrics.averageLeverage.toFixed(1)}x exceeds limit`,
      metric: "averageLeverage",
      value: metrics.averageLeverage,
      limit: state.limits.maxLeverage,
      timestamp: Date.now(),
    })
  }

  // Check drawdown
  if (metrics.portfolioDrawdown > state.limits.maxDrawdown * 0.8) {
    alerts.push({
      type: "warning",
      message: `Portfolio drawdown ${(metrics.portfolioDrawdown * 100).toFixed(2)}% approaching limit`,
      metric: "portfolioDrawdown",
      value: metrics.portfolioDrawdown,
      limit: state.limits.maxDrawdown,
      timestamp: Date.now(),
    })
  }

  if (metrics.portfolioDrawdown > state.limits.maxDrawdown) {
    alerts.push({
      type: "critical",
      message: `Portfolio drawdown ${(metrics.portfolioDrawdown * 100).toFixed(2)}% exceeds limit`,
      metric: "portfolioDrawdown",
      value: metrics.portfolioDrawdown,
      limit: state.limits.maxDrawdown,
      timestamp: Date.now(),
    })
  }

  // Check venue concentration
  for (const [venue, concentration] of Object.entries(metrics.venueConcentration)) {
    if (concentration > 0.5) {
      alerts.push({
        type: "warning",
        message: `Venue ${venue} concentration ${(concentration * 100).toFixed(1)}% exceeds 50%`,
        metric: "venueConcentration",
        value: concentration,
        limit: 0.5,
        timestamp: Date.now(),
      })
    }
  }

  // Check chain concentration
  for (const [chain, concentration] of Object.entries(metrics.chainConcentration)) {
    if (concentration > 0.5) {
      alerts.push({
        type: "warning",
        message: `Chain ${chain} concentration ${(concentration * 100).toFixed(1)}% exceeds 50%`,
        metric: "chainConcentration",
        value: concentration,
        limit: 0.5,
        timestamp: Date.now(),
      })
    }
  }

  return alerts
}

export function updateRiskState(
  state: RiskContextState,
  positions: Position[],
  currentBalance: number
): RiskContextState {
  const metrics = calculateMetrics(positions, currentBalance)
  const alerts = checkRiskLimits(state, positions, currentBalance)

  return {
    ...state,
    metrics,
    alerts,
    lastUpdate: Date.now(),
  }
}

export function setCustomLimits(
  state: RiskContextState,
  limits: Partial<RiskLimits>
): RiskContextState {
  return {
    ...state,
    limits: { ...state.limits, ...limits },
  }
}
