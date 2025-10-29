import React from 'react'
import './TradeHistory.css'

export default function TradeHistory({ portfolio }) {
  if (!portfolio) return null

  const positions = Object.entries(portfolio.positions || {})
  const balances = Object.entries(portfolio.balances || {})

  return (
    <div className="trade-history">
      <div className="history-section">
        <h3>Active Positions</h3>
        {positions.length > 0 ? (
          <div className="positions-table">
            <div className="table-header">
              <div>Symbol</div>
              <div>Size</div>
              <div>Entry Price</div>
              <div>Current Price</div>
              <div>P&L</div>
              <div>Chain</div>
            </div>
            {positions.map(([symbol, pos], idx) => (
              <div key={idx} className="table-row">
                <div className="symbol">{symbol}</div>
                <div>{pos.size?.toFixed(4)}</div>
                <div>${pos.entryPrice?.toFixed(2)}</div>
                <div>${pos.currentPrice?.toFixed(2)}</div>
                <div className={`pnl ${pos.pnl >= 0 ? 'positive' : 'negative'}`}>
                  ${pos.pnl?.toFixed(2)}
                </div>
                <div className="chain-badge">{pos.chain}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No active positions</p>
        )}
      </div>

      <div className="history-section">
        <h3>Wallet Balances</h3>
        {balances.length > 0 ? (
          <div className="balances-table">
            <div className="table-header">
              <div>Chain</div>
              <div>Balance</div>
              <div>USD Value</div>
            </div>
            {balances.map(([chain, balance], idx) => (
              <div key={idx} className="table-row">
                <div className="chain-badge">{chain}</div>
                <div>{balance?.amount?.toFixed(4)} {balance?.symbol}</div>
                <div>${balance?.usdValue?.toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No balances</p>
        )}
      </div>
    </div>
  )
}
