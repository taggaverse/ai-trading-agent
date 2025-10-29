import React, { useState, useEffect } from 'react'
import './TickerTape.css'

export default function TickerTape({ diary }) {
  const [trades, setTrades] = useState([])
  const [animatingPrices, setAnimatingPrices] = useState({})

  useEffect(() => {
    if (!diary || diary.length === 0) return

    // Get last 5 trades
    const recentTrades = diary.slice(-5).reverse().map((trade, idx) => ({
      ...trade,
      id: `${trade.timestamp}-${idx}`,
      displayPrice: trade.exitPrice || trade.entryPrice || 0
    }))

    setTrades(recentTrades)
  }, [diary])

  // Animate prices every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatingPrices(prev => {
        const updated = { ...prev }
        trades.forEach(trade => {
          // Simulate price movement (last 3 digits rolling)
          const currentPrice = updated[trade.id] || trade.displayPrice
          const variation = (Math.random() - 0.5) * 10 // ±5 variation
          updated[trade.id] = currentPrice + variation
        })
        return updated
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [trades])

  const getAssetIcon = (asset) => {
    const icons = {
      'BTC': '₿',
      'ETH': 'Ξ',
      'SOL': '◎',
      'BNB': '⬟'
    }
    return icons[asset] || '○'
  }

  return (
    <div className="ticker-tape">
      <div className="ticker-header">Recent Trades</div>
      <div className="ticker-scroll">
        {trades.length > 0 ? (
          trades.map(trade => {
            const displayPrice = animatingPrices[trade.id] || trade.displayPrice
            const pnl = trade.pnl || 0
            const isProfitable = pnl >= 0

            return (
              <div key={trade.id} className="ticker-item">
                <div className="ticker-asset">
                  <span className="asset-icon">{getAssetIcon(trade.asset)}</span>
                  <span className="asset-name">{trade.asset}</span>
                </div>
                <div className="ticker-price">
                  <span className="price-label">Price:</span>
                  <span className="price-value">${displayPrice.toFixed(2)}</span>
                </div>
                <div className={`ticker-pnl ${isProfitable ? 'positive' : 'negative'}`}>
                  <span className="pnl-label">P&L:</span>
                  <span className="pnl-value">
                    {isProfitable ? '+' : ''}{pnl.toFixed(2)}
                  </span>
                </div>
                <div className="ticker-time">
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )
          })
        ) : (
          <div className="ticker-empty">No trades yet</div>
        )}
      </div>
    </div>
  )
}
