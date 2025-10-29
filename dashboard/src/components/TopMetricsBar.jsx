import React from 'react'
import './TopMetricsBar.css'

export default function TopMetricsBar({ stats, portfolio }) {
  const metrics = [
    {
      label: 'Account Value',
      value: portfolio?.balances ? calculateTotalBalance(portfolio.balances) : '$0.00',
      format: 'currency'
    },
    {
      label: 'Return %',
      value: stats?.returnPercent || '0.00',
      format: 'percent',
      color: (stats?.returnPercent || 0) >= 0 ? 'positive' : 'negative'
    },
    {
      label: 'Total P&L',
      value: stats?.totalProfit || '$0.00',
      format: 'currency',
      color: (stats?.totalProfit || 0) >= 0 ? 'positive' : 'negative'
    },
    {
      label: 'Fees',
      value: stats?.totalFees || '$0.00',
      format: 'currency'
    },
    {
      label: 'Win Rate',
      value: stats?.winRate || '0',
      format: 'percent'
    },
    {
      label: 'Biggest Win',
      value: stats?.biggestWin || '$0.00',
      format: 'currency',
      color: 'positive'
    },
    {
      label: 'Biggest Loss',
      value: stats?.biggestLoss || '$0.00',
      format: 'currency',
      color: 'negative'
    },
    {
      label: 'Sharpe',
      value: stats?.sharpe || '0.00',
      format: 'number'
    },
    {
      label: 'Trades',
      value: stats?.totalTrades || '0',
      format: 'number'
    }
  ]

  function calculateTotalBalance(balances) {
    let total = 0
    Object.entries(balances).forEach(([chain, data]) => {
      if (data && typeof data === 'object' && typeof data.balance === 'number') {
        const balance = data.balance
        const gasToken = data.gasToken
        
        if (gasToken === 'USDC') total += balance
        else if (gasToken === 'ETH') total += balance * 2500
        else if (gasToken === 'SOL') total += balance * 200
        else if (gasToken === 'BNB') total += balance * 600
      }
    })
    return `$${total.toFixed(2)}`
  }

  return (
    <div className="top-metrics-bar">
      {metrics.map((metric, idx) => (
        <div key={idx} className="metric-item">
          <span className="metric-label">{metric.label}</span>
          <span className={`metric-value ${metric.color || ''}`}>
            {metric.format === 'currency' && !metric.value.startsWith('$') ? '$' : ''}
            {metric.value}
            {metric.format === 'percent' && !metric.value.endsWith('%') ? '%' : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
