import React, { useMemo } from 'react'
import './UnitEconomics.css'

export default function UnitEconomics({ stats }) {
  if (!stats) return null

  const economics = useMemo(() => {
    // Estimated costs based on Dreams Router and x402 research
    const routerCostPerDecision = 0.01 // $0.01 per LLM decision
    const researchCostPerQuery = 0.05 // $0.05 per x402 research query
    const estimatedDecisions = stats.totalTrades * 2 // 2 decisions per trade
    const estimatedResearchQueries = stats.totalTrades // 1 research query per trade

    const totalRouterCost = estimatedDecisions * routerCostPerDecision
    const totalResearchCost = estimatedResearchQueries * researchCostPerQuery
    const totalServiceCost = totalRouterCost + totalResearchCost

    const grossProfit = stats.totalProfit
    const netProfit = grossProfit - totalServiceCost
    const profitMargin = grossProfit > 0 ? (netProfit / grossProfit * 100) : 0
    const costPerTrade = stats.totalTrades > 0 ? totalServiceCost / stats.totalTrades : 0
    const profitPerTrade = stats.totalTrades > 0 ? netProfit / stats.totalTrades : 0

    return {
      totalRouterCost,
      totalResearchCost,
      totalServiceCost,
      grossProfit,
      netProfit,
      profitMargin,
      costPerTrade,
      profitPerTrade,
      roi: grossProfit > 0 ? ((netProfit / totalServiceCost) * 100) : 0
    }
  }, [stats])

  return (
    <div className="unit-economics">
      <h3>Unit Economics</h3>
      <div className="economics-grid">
        <div className="econ-item">
          <span className="econ-label">Dreams Router Cost</span>
          <span className="econ-value">${economics.totalRouterCost.toFixed(2)}</span>
          <span className="econ-detail">{(economics.totalRouterCost / stats.totalTrades).toFixed(4)}/trade</span>
        </div>
        <div className="econ-item">
          <span className="econ-label">x402 Research Cost</span>
          <span className="econ-value">${economics.totalResearchCost.toFixed(2)}</span>
          <span className="econ-detail">{(economics.totalResearchCost / stats.totalTrades).toFixed(4)}/trade</span>
        </div>
        <div className="econ-item">
          <span className="econ-label">Total Service Cost</span>
          <span className="econ-value">${economics.totalServiceCost.toFixed(2)}</span>
          <span className="econ-detail">{economics.costPerTrade.toFixed(4)}/trade</span>
        </div>
        <div className="econ-item">
          <span className="econ-label">Gross Profit</span>
          <span className={`econ-value ${economics.grossProfit >= 0 ? 'positive' : 'negative'}`}>
            ${economics.grossProfit.toFixed(2)}
          </span>
          <span className="econ-detail">{(economics.grossProfit / stats.totalTrades).toFixed(4)}/trade</span>
        </div>
        <div className="econ-item">
          <span className="econ-label">Net Profit</span>
          <span className={`econ-value ${economics.netProfit >= 0 ? 'positive' : 'negative'}`}>
            ${economics.netProfit.toFixed(2)}
          </span>
          <span className="econ-detail">{economics.profitPerTrade.toFixed(4)}/trade</span>
        </div>
        <div className="econ-item">
          <span className="econ-label">Profit Margin</span>
          <span className={`econ-value ${economics.profitMargin >= 0 ? 'positive' : 'negative'}`}>
            {economics.profitMargin.toFixed(1)}%
          </span>
          <span className="econ-detail">Net/Gross</span>
        </div>
      </div>
    </div>
  )
}
