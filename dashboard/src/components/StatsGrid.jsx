import React from 'react'
import './StatsGrid.css'

export default function StatsGrid({ stats, portfolio }) {
  if (!stats || !portfolio) return null

  // Calculate total balance from USDC across all chains
  const totalBalance = Object.values(portfolio.balances || {}).reduce((sum, balance) => {
    return sum + (typeof balance === 'number' ? balance : (balance.usdc || 0))
  }, 0)
  
  const usedMargin = Object.values(portfolio.positions || {}).reduce((sum, pos) => sum + (pos.margin || 0), 0)
  const winRate = stats.totalTrades > 0 ? ((stats.totalTrades - Math.abs(stats.totalProfit < 0 ? 1 : 0)) / stats.totalTrades * 100).toFixed(1) : 0

  const statCards = [
    {
      title: 'Total Balance',
      value: `$${totalBalance.toFixed(2)}`,
      change: stats.totalProfit,
      icon: '💰'
    },
    {
      title: 'Total P&L',
      value: `$${stats.totalProfit.toFixed(2)}`,
      change: stats.totalProfit,
      icon: '📈'
    },
    {
      title: 'Total Trades',
      value: stats.totalTrades,
      icon: '🔄'
    },
    {
      title: 'Win Rate',
      value: `${winRate}%`,
      icon: '🎯'
    },
    {
      title: 'Used Margin',
      value: `$${usedMargin.toFixed(2)}`,
      icon: '⚖️'
    },
    {
      title: 'Available Margin',
      value: `$${(totalBalance - usedMargin).toFixed(2)}`,
      icon: '💵'
    }
  ]

  return (
    <div className="stats-grid">
      {statCards.map((card, idx) => (
        <div key={idx} className="stat-card">
          <div className="stat-icon">{card.icon}</div>
          <div className="stat-content">
            <p className="stat-label">{card.title}</p>
            <p className="stat-value">{card.value}</p>
            {card.change !== undefined && (
              <p className={`stat-change ${card.change >= 0 ? 'positive' : 'negative'}`}>
                {card.change >= 0 ? '+' : ''}{card.change.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
