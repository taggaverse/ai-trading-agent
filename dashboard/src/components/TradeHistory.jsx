import React from 'react'
import './TradeHistory.css'

export default function TradeHistory({ portfolio }) {
  if (!portfolio) return null

  const positions = Object.entries(portfolio.positions || {})
  const balances = portfolio.balances || {}

  const getGasTokenStatus = (chain, gasAmount) => {
    const minRequired = {
      base: 0.01,
      solana: 0.1,
      bsc: 0.01,
      hyperliquid: 0
    }
    
    const required = minRequired[chain] || 0
    const hasEnough = gasAmount >= required
    
    return {
      hasEnough,
      required,
      status: hasEnough ? '✓' : '⚠️'
    }
  }

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
        <h3>Wallet Balances & Gas Tokens</h3>
        {Object.keys(balances).length > 0 ? (
          <div className="balances-list">
            {Object.entries(balances).map(([chain, data], idx) => {
              const gasToken = data.gasToken || (chain === 'base' ? 'ETH' : chain === 'solana' ? 'SOL' : chain === 'bsc' ? 'BNB' : 'USDC')
              const gasAmount = data[gasToken.toLowerCase()] || 0
              const usdcAmount = data.usdc || 0
              const status = getGasTokenStatus(chain, gasAmount)
              
              return (
                <div key={idx} className="balance-card">
                  <div className="balance-header">
                    <span className="chain-name">{chain.toUpperCase()}</span>
                    <span className={`gas-status ${status.hasEnough ? 'ready' : 'warning'}`}>
                      {status.status} {status.hasEnough ? 'Ready' : 'Low Gas'}
                    </span>
                  </div>
                  
                  <div className="balance-tokens">
                    <div className="token-row">
                      <span className="token-label">{gasToken} (Gas Token)</span>
                      <span className={`token-amount ${status.hasEnough ? 'positive' : 'negative'}`}>
                        {gasAmount.toFixed(6)} {gasToken}
                      </span>
                    </div>
                    {chain !== 'hyperliquid' && (
                      <div className="token-row">
                        <span className="token-label">USDC (Trading)</span>
                        <span className="token-amount">${usdcAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {chain === 'hyperliquid' && (
                      <div className="token-row">
                        <span className="token-label">USDC (Balance)</span>
                        <span className="token-amount">${usdcAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="balance-requirements">
                    <span className="requirement-label">Min Gas Required:</span>
                    <span className="requirement-value">{status.required} {gasToken}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="empty-state">No balances</p>
        )}
      </div>
    </div>
  )
}
