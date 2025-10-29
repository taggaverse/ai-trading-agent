import logger from "../../utils/logger.js"
import type { PortfolioContextState, Position } from "../contexts/portfolio.js"
import type { RiskContextState, RiskAlert } from "../contexts/risk.js"

export interface RiskManagementInput {
  portfolio: PortfolioContextState
  risk: RiskContextState
}

export interface RiskManagementOutput {
  success: boolean
  message: string
  actions: RiskAction[]
  alertsHandled: number
  timestamp: number
}

export interface RiskAction {
  type: "close_position" | "reduce_leverage" | "stop_trading" | "liquidate"
  priority: "low" | "medium" | "high" | "critical"
  symbol?: string
  chain?: string
  reason: string
  affectedPositions: number
  estimatedImpact: number
}

export async function manageRisk(
  input: RiskManagementInput
): Promise<RiskManagementOutput> {
  const { portfolio, risk } = input

  try {
    logger.info("Starting risk management assessment...")

    const actions: RiskAction[] = []
    let alertsHandled = 0

    // Process critical alerts
    for (const alert of risk.alerts) {
      if (alert.type === "critical") {
        alertsHandled++

        const action = generateRiskAction(alert, portfolio, risk)
        if (action) {
          actions.push(action)
        }
      }
    }

    // Check for emergency conditions
    const emergencyAction = checkEmergencyConditions(portfolio, risk)
    if (emergencyAction) {
      actions.push(emergencyAction)
      alertsHandled++
    }

    logger.info(`Risk management complete: ${actions.length} actions, ${alertsHandled} alerts handled`)

    return {
      success: true,
      message: `Risk management executed: ${actions.length} actions taken`,
      actions,
      alertsHandled,
      timestamp: Date.now(),
    }
  } catch (error) {
    logger.error("Risk management failed:", error)
    throw error
  }
}

function generateRiskAction(
  alert: RiskAlert,
  portfolio: PortfolioContextState,
  risk: RiskContextState
): RiskAction | null {
  logger.warn(`Processing critical alert: ${alert.message}`)

  switch (alert.metric) {
    case "averageLeverage":
      return {
        type: "reduce_leverage",
        priority: "critical",
        reason: `Average leverage ${alert.value.toFixed(1)}x exceeds limit ${alert.limit}x`,
        affectedPositions: portfolio.positions.filter(p => p.leverage > 1).length,
        estimatedImpact: calculateLeverageReductionImpact(portfolio),
      }

    case "portfolioDrawdown":
      return {
        type: "close_position",
        priority: "critical",
        reason: `Portfolio drawdown ${(alert.value * 100).toFixed(1)}% exceeds limit ${(alert.limit * 100).toFixed(1)}%`,
        affectedPositions: portfolio.positions.length,
        estimatedImpact: calculateDrawdownReductionImpact(portfolio),
      }

    case "venueConcentration":
      return {
        type: "close_position",
        priority: "high",
        reason: `Venue concentration ${(alert.value * 100).toFixed(1)}% exceeds limit ${(alert.limit * 100).toFixed(1)}%`,
        affectedPositions: portfolio.positions.filter(p => p.venue === alert.metric).length,
        estimatedImpact: calculateConcentrationReductionImpact(portfolio, alert.metric),
      }

    case "chainConcentration":
      return {
        type: "close_position",
        priority: "high",
        reason: `Chain concentration ${(alert.value * 100).toFixed(1)}% exceeds limit ${(alert.limit * 100).toFixed(1)}%`,
        affectedPositions: portfolio.positions.filter(p => p.chain === alert.metric).length,
        estimatedImpact: calculateConcentrationReductionImpact(portfolio, alert.metric),
      }

    default:
      return null
  }
}

function checkEmergencyConditions(
  portfolio: PortfolioContextState,
  risk: RiskContextState
): RiskAction | null {
  // Check for margin call risk
  if (risk.metrics.marginRatio < 0.1) {
    return {
      type: "liquidate",
      priority: "critical",
      reason: "Margin ratio critically low - liquidating positions to prevent margin call",
      affectedPositions: portfolio.positions.length,
      estimatedImpact: portfolio.balance * 0.5,
    }
  }

  // Check for extreme drawdown
  if (risk.metrics.portfolioDrawdown > risk.limits.maxDrawdown) {
    return {
      type: "stop_trading",
      priority: "critical",
      reason: `Portfolio drawdown ${(risk.metrics.portfolioDrawdown * 100).toFixed(1)}% exceeds maximum - stopping all trading`,
      affectedPositions: portfolio.positions.length,
      estimatedImpact: 0,
    }
  }

  // Check for extreme leverage
  if (risk.metrics.averageLeverage > risk.limits.maxLeverage * 1.5) {
    return {
      type: "liquidate",
      priority: "critical",
      reason: `Average leverage ${risk.metrics.averageLeverage.toFixed(1)}x far exceeds limit - liquidating`,
      affectedPositions: portfolio.positions.filter(p => p.leverage > 1).length,
      estimatedImpact: calculateLeverageReductionImpact(portfolio),
    }
  }

  return null
}

function calculateLeverageReductionImpact(portfolio: PortfolioContextState): number {
  let impact = 0
  for (const position of portfolio.positions) {
    if (position.leverage > 1) {
      // Reduce leverage by 50%
      impact += position.size * position.currentPrice * 0.5
    }
  }
  return impact
}

function calculateDrawdownReductionImpact(portfolio: PortfolioContextState): number {
  // Close 30% of positions to reduce drawdown
  return portfolio.positions.reduce((sum, p) => sum + p.size * p.currentPrice, 0) * 0.3
}

function calculateConcentrationReductionImpact(
  portfolio: PortfolioContextState,
  metric: string
): number {
  // Close positions in concentrated venue/chain
  return portfolio.positions
    .filter(p => p.venue === metric || p.chain === metric)
    .reduce((sum, p) => sum + p.size * p.currentPrice, 0) * 0.5
}

export function getPositionsToClose(
  portfolio: PortfolioContextState,
  reason: string
): Position[] {
  const positions: Position[] = []

  if (reason.includes("drawdown")) {
    // Close losing positions first
    positions.push(
      ...portfolio.positions
        .filter(p => p.pnl < 0)
        .sort((a, b) => a.pnl - b.pnl)
        .slice(0, Math.ceil(portfolio.positions.length * 0.3))
    )
  } else if (reason.includes("leverage")) {
    // Close leveraged positions first
    positions.push(
      ...portfolio.positions
        .filter(p => p.leverage > 1)
        .sort((a, b) => b.leverage - a.leverage)
    )
  } else if (reason.includes("concentration")) {
    // Close concentrated positions
    positions.push(...portfolio.positions.slice(0, Math.ceil(portfolio.positions.length * 0.5)))
  }

  return positions
}

export function getPositionsToReduceLeverage(
  portfolio: PortfolioContextState
): Position[] {
  return portfolio.positions
    .filter(p => p.leverage > 1)
    .sort((a, b) => b.leverage - a.leverage)
}

export function assessRiskLevel(risk: RiskContextState): {
  level: "low" | "medium" | "high" | "critical"
  score: number
  factors: string[]
} {
  const factors: string[] = []
  let score = 0

  // Leverage risk (0-25 points)
  const leverageRatio = risk.metrics.averageLeverage / risk.limits.maxLeverage
  score += Math.min(leverageRatio * 25, 25)
  if (leverageRatio > 0.8) {
    factors.push(`High leverage: ${risk.metrics.averageLeverage.toFixed(1)}x`)
  }

  // Drawdown risk (0-25 points)
  const drawdownRatio = risk.metrics.portfolioDrawdown / risk.limits.maxDrawdown
  score += Math.min(drawdownRatio * 25, 25)
  if (drawdownRatio > 0.8) {
    factors.push(`High drawdown: ${(risk.metrics.portfolioDrawdown * 100).toFixed(1)}%`)
  }

  // Concentration risk (0-25 points)
  const maxConcentration = Math.max(...Object.values(risk.metrics.venueConcentration))
  const concentrationRatio = maxConcentration / 0.5
  score += Math.min(concentrationRatio * 25, 25)
  if (maxConcentration > 0.4) {
    factors.push(`High concentration: ${(maxConcentration * 100).toFixed(1)}%`)
  }

  // Alert count (0-25 points)
  score += Math.min(risk.alerts.length * 5, 25)
  if (risk.alerts.length > 0) {
    factors.push(`${risk.alerts.length} active alerts`)
  }

  // Determine level
  let level: "low" | "medium" | "high" | "critical"
  if (score >= 75) {
    level = "critical"
  } else if (score >= 50) {
    level = "high"
  } else if (score >= 25) {
    level = "medium"
  } else {
    level = "low"
  }

  return { level, score, factors }
}

export function shouldStopTrading(risk: RiskContextState): boolean {
  // Stop if critical alerts exist
  if (risk.alerts.some(a => a.type === "critical")) {
    return true
  }

  // Stop if drawdown exceeds limit
  if (risk.metrics.portfolioDrawdown > risk.limits.maxDrawdown) {
    return true
  }

  // Stop if average leverage exceeds limit
  if (risk.metrics.averageLeverage > risk.limits.maxLeverage) {
    return true
  }

  return false
}
