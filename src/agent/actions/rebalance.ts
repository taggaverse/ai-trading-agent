import logger from "../../utils/logger.js"
import type { PortfolioContextState, Position } from "../contexts/portfolio.js"
import type { RiskContextState } from "../contexts/risk.js"

export interface RebalanceInput {
  portfolio: PortfolioContextState
  risk: RiskContextState
  targetAllocation: Record<string, number> // e.g., { "solana": 0.25, "base": 0.25, "hyperliquid": 0.30, "bsc": 0.20 }
}

export interface RebalanceOutput {
  success: boolean
  message: string
  actions: RebalanceAction[]
  totalRebalanced: number
  timestamp: number
}

export interface RebalanceAction {
  type: "hold" | "increase" | "decrease" | "close"
  chain: string
  symbol: string
  currentAllocation: number
  targetAllocation: number
  adjustmentAmount: number
  reason: string
}

export async function rebalancePortfolio(
  input: RebalanceInput
): Promise<RebalanceOutput> {
  const { portfolio, risk, targetAllocation } = input

  try {
    logger.info("Starting portfolio rebalancing...")

    const actions: RebalanceAction[] = []
    let totalRebalanced = 0

    // Calculate current allocations
    const currentAllocations = calculateAllocations(portfolio)

    // Generate rebalance actions
    for (const [chain, targetAlloc] of Object.entries(targetAllocation)) {
      const currentAlloc = currentAllocations[chain] || 0
      const difference = targetAlloc - currentAlloc

      if (Math.abs(difference) > 0.02) { // 2% threshold
        const adjustmentAmount = portfolio.balance * difference

        let action: RebalanceAction

        if (difference > 0) {
          // Need to increase allocation
          action = {
            type: "increase",
            chain,
            symbol: "MULTI", // Multiple positions
            currentAllocation: currentAlloc,
            targetAllocation: targetAlloc,
            adjustmentAmount,
            reason: `Increase ${chain} allocation from ${(currentAlloc * 100).toFixed(1)}% to ${(targetAlloc * 100).toFixed(1)}%`,
          }
        } else {
          // Need to decrease allocation
          action = {
            type: "decrease",
            chain,
            symbol: "MULTI",
            currentAllocation: currentAlloc,
            targetAllocation: targetAlloc,
            adjustmentAmount: Math.abs(adjustmentAmount),
            reason: `Decrease ${chain} allocation from ${(currentAlloc * 100).toFixed(1)}% to ${(targetAlloc * 100).toFixed(1)}%`,
          }
        }

        actions.push(action)
        totalRebalanced += Math.abs(adjustmentAmount)
      } else {
        // Hold current allocation
        actions.push({
          type: "hold",
          chain,
          symbol: "MULTI",
          currentAllocation: currentAlloc,
          targetAllocation: targetAlloc,
          adjustmentAmount: 0,
          reason: `${chain} allocation within tolerance (${(currentAlloc * 100).toFixed(1)}%)`,
        })
      }
    }

    logger.info(`Rebalancing complete: ${actions.length} actions, $${totalRebalanced.toFixed(2)} adjusted`)

    return {
      success: true,
      message: `Portfolio rebalanced: ${actions.filter(a => a.type !== "hold").length} adjustments made`,
      actions,
      totalRebalanced,
      timestamp: Date.now(),
    }
  } catch (error) {
    logger.error("Portfolio rebalancing failed:", error)
    throw error
  }
}

export function calculateAllocations(portfolio: PortfolioContextState): Record<string, number> {
  const allocations: Record<string, number> = {}
  const totalExposure = portfolio.positions.reduce(
    (sum, pos) => sum + pos.size * pos.currentPrice,
    0
  )

  if (totalExposure === 0) {
    return allocations
  }

  // Group by chain
  const chainExposures: Record<string, number> = {}
  for (const position of portfolio.positions) {
    if (!chainExposures[position.chain]) {
      chainExposures[position.chain] = 0
    }
    chainExposures[position.chain] += position.size * position.currentPrice
  }

  // Calculate percentages
  for (const [chain, exposure] of Object.entries(chainExposures)) {
    allocations[chain] = exposure / totalExposure
  }

  return allocations
}

export function suggestRebalancing(
  portfolio: PortfolioContextState,
  risk: RiskContextState
): RebalanceOutput {
  logger.info("Analyzing portfolio for rebalancing suggestions...")

  const actions: RebalanceAction[] = []

  // Check for concentration risk
  const allocations = calculateAllocations(portfolio)

  for (const [chain, allocation] of Object.entries(allocations)) {
    if (allocation > 0.5) {
      // More than 50% in one chain
      actions.push({
        type: "decrease",
        chain,
        symbol: "MULTI",
        currentAllocation: allocation,
        targetAllocation: 0.35,
        adjustmentAmount: portfolio.balance * (allocation - 0.35),
        reason: `High concentration risk: ${(allocation * 100).toFixed(1)}% in ${chain}`,
      })
    }
  }

  // Check for underutilized chains
  const activeChains = Object.keys(allocations).length
  if (activeChains < 3) {
    actions.push({
      type: "increase",
      chain: "solana",
      symbol: "MULTI",
      currentAllocation: allocations["solana"] || 0,
      targetAllocation: 0.25,
      adjustmentAmount: portfolio.balance * 0.25,
      reason: "Diversify into additional chains for risk reduction",
    })
  }

  // Check for leverage risk
  if (risk.metrics.averageLeverage > risk.limits.maxLeverage * 0.8) {
    actions.push({
      type: "decrease",
      chain: "hyperliquid",
      symbol: "MULTI",
      currentAllocation: allocations["arbitrum"] || 0,
      targetAllocation: (allocations["arbitrum"] || 0) * 0.7,
      adjustmentAmount: portfolio.balance * ((allocations["arbitrum"] || 0) * 0.3),
      reason: `High leverage risk: ${risk.metrics.averageLeverage.toFixed(1)}x average`,
    })
  }

  // Check for drawdown risk
  if (risk.metrics.portfolioDrawdown > risk.limits.maxDrawdown * 0.8) {
    actions.push({
      type: "decrease",
      chain: "hyperliquid",
      symbol: "MULTI",
      currentAllocation: allocations["arbitrum"] || 0,
      targetAllocation: 0.15,
      adjustmentAmount: portfolio.balance * 0.15,
      reason: `Portfolio drawdown approaching limit: ${(risk.metrics.portfolioDrawdown * 100).toFixed(1)}%`,
    })
  }

  return {
    success: true,
    message: `${actions.length} rebalancing suggestions generated`,
    actions,
    totalRebalanced: actions.reduce((sum, a) => sum + a.adjustmentAmount, 0),
    timestamp: Date.now(),
  }
}

export function getRebalancingStatus(
  portfolio: PortfolioContextState
): {
  isBalanced: boolean
  concentrationRisk: boolean
  diversificationScore: number
  recommendations: string[]
} {
  const allocations = calculateAllocations(portfolio)
  const recommendations: string[] = []

  // Check concentration
  let maxAllocation = 0
  for (const allocation of Object.values(allocations)) {
    maxAllocation = Math.max(maxAllocation, allocation)
  }
  const concentrationRisk = maxAllocation > 0.5

  if (concentrationRisk) {
    recommendations.push(`Reduce concentration in largest position (${(maxAllocation * 100).toFixed(1)}%)`)
  }

  // Check diversification
  const activeChains = Object.keys(allocations).length
  const diversificationScore = Math.min(activeChains / 4, 1) // 4 chains max

  if (activeChains < 3) {
    recommendations.push(`Diversify across more chains (currently ${activeChains}/4)`)
  }

  // Check for imbalance
  const targetAllocation = 0.25 // Equal weight
  let isBalanced = true
  for (const allocation of Object.values(allocations)) {
    if (Math.abs(allocation - targetAllocation) > 0.1) {
      isBalanced = false
      break
    }
  }

  if (!isBalanced) {
    recommendations.push("Rebalance to target allocations")
  }

  return {
    isBalanced,
    concentrationRisk,
    diversificationScore,
    recommendations,
  }
}
