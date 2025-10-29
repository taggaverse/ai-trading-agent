import React from 'react'
import './Header.css'

export default function Header({ health, chains }) {
  if (!health) return null

  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1>🤖 AI Trading Agent</h1>
          <div className="status-badge">
            <span className="status-dot"></span>
            <span>Live</span>
          </div>
        </div>
        <div className="header-right">
          <div className="info-item">
            <span className="label">Uptime</span>
            <span className="value">{formatUptime(health.uptime)}</span>
          </div>
          <div className="info-item">
            <span className="label">Chains Active</span>
            <span className="value">{chains.length}</span>
          </div>
          <div className="chains-list">
            {chains.map(chain => (
              <span key={chain} className="chain-badge">{chain}</span>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
