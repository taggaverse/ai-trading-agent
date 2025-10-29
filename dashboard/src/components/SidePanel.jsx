import React, { useState } from 'react'
import './SidePanel.css'

export default function SidePanel({ diary, portfolio, stats }) {
  const [activeTab, setActiveTab] = useState('modelchat')
  const [sortBy, setSortBy] = useState('recent')

  const renderModelChat = () => {
    if (!diary || diary.length === 0) {
      return <div className="panel-empty">No model decisions yet</div>
    }

    return (
      <div className="panel-content">
        {diary.slice(-10).reverse().map((entry, idx) => (
          <div key={idx} className="chat-entry">
            <div className="entry-header">
              <span className="entry-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              <span className={`entry-action ${entry.action?.toLowerCase()}`}>
                {entry.action || 'HOLD'}
              </span>
            </div>
            <div className="entry-asset">{entry.asset}</div>
            <div className="entry-rationale">{entry.rationale}</div>
            {entry.entryPrice && (
              <div className="entry-prices">
                <span>Entry: ${entry.entryPrice.toFixed(2)}</span>
                <span>TP: ${entry.takeProfit?.toFixed(2)}</span>
                <span>SL: ${entry.stopLoss?.toFixed(2)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderPositions = () => {
    const positions = portfolio?.positions || []
    
    if (positions.length === 0) {
      return <div className="panel-empty">No open positions</div>
    }

    return (
      <div className="panel-content">
        <div className="positions-card">
          <div className="positions-header">Open Positions</div>
          {positions.map((pos, idx) => (
            <div key={idx} className="position-item">
              <div className="position-header">
                <span className="position-asset">{pos.asset}</span>
                <span className={`position-side ${pos.side?.toLowerCase()}`}>
                  {pos.side}
                </span>
              </div>
              <div className="position-details">
                <span>Leverage: {pos.leverage}x</span>
                <span className={`position-pnl ${(pos.unrealizedPnL || 0) >= 0 ? 'positive' : 'negative'}`}>
                  P&L: ${(pos.unrealizedPnL || 0).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="trades-header">
          <span>Recent Trades</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
            <option value="recent">Most Recent</option>
            <option value="pnl">Top Trades</option>
          </select>
        </div>

        <div className="trades-list">
          {(diary || [])
            .sort((a, b) => {
              if (sortBy === 'pnl') {
                return (b.pnl || 0) - (a.pnl || 0)
              }
              return new Date(b.timestamp) - new Date(a.timestamp)
            })
            .slice(0, 10)
            .map((trade, idx) => (
              <div key={idx} className="trade-item">
                <div className="trade-header">
                  <span className="trade-asset">{trade.asset}</span>
                  <span className={`trade-pnl ${(trade.pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(trade.pnl || 0) >= 0 ? '+' : ''}{(trade.pnl || 0).toFixed(2)}
                  </span>
                </div>
                <div className="trade-time">
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
        </div>
      </div>
    )
  }

  const renderReadme = () => {
    return (
      <div className="panel-content">
        <div className="readme-content">
          <h3>Hyperliquid Trading Agent</h3>
          <p>Real-time trading dashboard with live P&L tracking and position management.</p>
          
          <h4>Features</h4>
          <ul>
            <li>Live portfolio tracking</li>
            <li>Real-time P&L updates</li>
            <li>Position management</li>
            <li>Trade history</li>
            <li>Model decisions</li>
          </ul>

          <h4>Status</h4>
          <p>Agent: <span className="status-active">●</span> Running</p>
          <p>Trades: {stats?.totalTrades || 0}</p>
          <p>Win Rate: {stats?.winRate || 0}%</p>
        </div>
      </div>
    )
  }

  return (
    <div className="side-panel">
      <div className="panel-tabs">
        <button
          className={`tab-btn ${activeTab === 'modelchat' ? 'active' : ''}`}
          onClick={() => setActiveTab('modelchat')}
        >
          ModelChat
        </button>
        <button
          className={`tab-btn ${activeTab === 'positions' ? 'active' : ''}`}
          onClick={() => setActiveTab('positions')}
        >
          Positions
        </button>
        <button
          className={`tab-btn ${activeTab === 'readme' ? 'active' : ''}`}
          onClick={() => setActiveTab('readme')}
        >
          Readme
        </button>
      </div>

      <div className="panel-body">
        {activeTab === 'modelchat' && renderModelChat()}
        {activeTab === 'positions' && renderPositions()}
        {activeTab === 'readme' && renderReadme()}
      </div>
    </div>
  )
}
