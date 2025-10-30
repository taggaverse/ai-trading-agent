import React, { useState, useEffect } from 'react'
import './DecisionDiary.css'

export default function DecisionDiary({ diary }) {
  const [expandedId, setExpandedId] = useState(null)
  const [marketInsights, setMarketInsights] = useState({})
  const [loading, setLoading] = useState({})

  // Fetch market insights from aixbtc via x402
  const fetchMarketInsights = async (asset, index) => {
    if (marketInsights[index]) return // Already fetched
    
    setLoading(prev => ({ ...prev, [index]: true }))
    try {
      // Call backend endpoint that uses x402 to fetch aixbtc insights
      const response = await fetch(`http://localhost:3000/insights/${asset}`)
      const data = await response.json()
      setMarketInsights(prev => ({ ...prev, [index]: data }))
    } catch (error) {
      console.error('Failed to fetch market insights:', error)
      setMarketInsights(prev => ({ ...prev, [index]: { error: 'Failed to fetch insights' } }))
    } finally {
      setLoading(prev => ({ ...prev, [index]: false }))
    }
  }

  if (!diary || diary.length === 0) {
    return <div className="panel-empty">No model decisions yet</div>
  }

  return (
    <div className="decision-diary">
      <div className="diary-header">
        <h3>🤖 Nocturne Trading Decisions</h3>
        <span className="decision-count">{diary.length} decisions</span>
      </div>

      <div className="diary-entries">
        {diary.slice(-15).reverse().map((entry, idx) => (
          <div key={idx} className="diary-entry">
            <div 
              className="entry-header clickable"
              onClick={() => setExpandedId(expandedId === idx ? null : idx)}
            >
              <div className="entry-main">
                <span className="entry-time">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className="entry-asset">{entry.asset}</span>
                <span className={`entry-action ${entry.action?.toLowerCase()}`}>
                  {entry.action || 'HOLD'}
                </span>
                {entry.confidence && (
                  <span className="entry-confidence">
                    {(entry.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <span className="expand-icon">
                {expandedId === idx ? '▼' : '▶'}
              </span>
            </div>

            {expandedId === idx && (
              <div className="entry-details">
                <div className="detail-section">
                  <h4>Nocturne Reasoning</h4>
                  <p className="rationale">{entry.rationale}</p>
                </div>

                {entry.entryPrice && (
                  <div className="detail-section">
                    <h4>Trade Levels</h4>
                    <div className="price-grid">
                      <div className="price-item">
                        <span className="label">Entry</span>
                        <span className="value">${entry.entryPrice.toFixed(2)}</span>
                      </div>
                      <div className="price-item">
                        <span className="label">Take Profit</span>
                        <span className="value">${entry.takeProfit?.toFixed(2)}</span>
                      </div>
                      <div className="price-item">
                        <span className="label">Stop Loss</span>
                        <span className="value">${entry.stopLoss?.toFixed(2)}</span>
                      </div>
                      {entry.positionSize && (
                        <div className="price-item">
                          <span className="label">Size</span>
                          <span className="value">{(entry.positionSize * 100).toFixed(2)}%</span>
                        </div>
                      )}
                      {entry.leverage && (
                        <div className="price-item">
                          <span className="label">Leverage</span>
                          <span className="value">{entry.leverage}x</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {entry.indicators && (
                  <div className="detail-section">
                    <h4>Technical Indicators</h4>
                    <div className="indicators-grid">
                      {entry.indicators['5m'] && (
                        <>
                          <div className="indicator-item">
                            <span className="label">RSI (5m)</span>
                            <span className={`value rsi-${entry.indicators['5m'].rsi < 30 ? 'oversold' : entry.indicators['5m'].rsi > 70 ? 'overbought' : 'normal'}`}>
                              {entry.indicators['5m'].rsi.toFixed(2)}
                            </span>
                          </div>
                          <div className="indicator-item">
                            <span className="label">MACD (5m)</span>
                            <span className={`value ${entry.indicators['5m'].macd > entry.indicators['5m'].signal ? 'bullish' : 'bearish'}`}>
                              {entry.indicators['5m'].macd.toFixed(4)}
                            </span>
                          </div>
                          <div className="indicator-item">
                            <span className="label">EMA (5m)</span>
                            <span className="value">${entry.indicators['5m'].ema.toFixed(2)}</span>
                          </div>
                          <div className="indicator-item">
                            <span className="label">ATR (5m)</span>
                            <span className="value">${entry.indicators['5m'].atr.toFixed(4)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="detail-section">
                  <div className="insights-header">
                    <h4>Market Insights (via aixbtc)</h4>
                    {!marketInsights[idx] && (
                      <button 
                        className="insights-btn"
                        onClick={() => fetchMarketInsights(entry.asset, idx)}
                        disabled={loading[idx]}
                      >
                        {loading[idx] ? 'Loading...' : 'Fetch Insights'}
                      </button>
                    )}
                  </div>
                  
                  {loading[idx] && <p className="loading">Fetching market insights...</p>}
                  
                  {marketInsights[idx] && (
                    <div className="insights-content">
                      {marketInsights[idx].error ? (
                        <p className="error">{marketInsights[idx].error}</p>
                      ) : (
                        <>
                          {marketInsights[idx].sentiment && (
                            <div className="insight-item">
                              <span className="label">Sentiment</span>
                              <span className={`value sentiment-${marketInsights[idx].sentiment.toLowerCase()}`}>
                                {marketInsights[idx].sentiment}
                              </span>
                            </div>
                          )}
                          {marketInsights[idx].analysis && (
                            <div className="insight-item full-width">
                              <span className="label">Analysis</span>
                              <p className="analysis-text">{marketInsights[idx].analysis}</p>
                            </div>
                          )}
                          {marketInsights[idx].riskLevel && (
                            <div className="insight-item">
                              <span className="label">Risk Level</span>
                              <span className={`value risk-${marketInsights[idx].riskLevel.toLowerCase()}`}>
                                {marketInsights[idx].riskLevel}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {entry.exitPlan && (
                  <div className="detail-section">
                    <h4>Exit Plan</h4>
                    <p className="exit-plan">{entry.exitPlan}</p>
                  </div>
                )}

                {entry.fundingRate && (
                  <div className="detail-section">
                    <h4>Funding Rate</h4>
                    <p className="funding-rate">{(entry.fundingRate * 100).toFixed(4)}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
