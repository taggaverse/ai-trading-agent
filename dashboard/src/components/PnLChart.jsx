import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Area, AreaChart } from 'recharts'
import './PnLChart.css'

export default function PnLChart({ diary, portfolio, stats }) {
  const [chartData, setChartData] = useState([])
  const [timeframe, setTimeframe] = useState('all') // all, 24h, 7d, 30d
  const [currentValue, setCurrentValue] = useState(0)
  const [pnlPercent, setPnlPercent] = useState(0)
  const [highestValue, setHighestValue] = useState(0)
  const [lowestValue, setLowestValue] = useState(0)
  const [initialBalance, setInitialBalance] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)

  // Helper function to calculate total balance from portfolio
  const calculateTotalBalance = (portfolioData) => {
    let totalBalance = 0
    
    if (!portfolioData || !portfolioData.balances) {
      return totalBalance
    }
    
    Object.entries(portfolioData.balances).forEach(([chain, data]) => {
      if (data && typeof data === 'object') {
        // If it has a balance property (new structure)
        if (typeof data.balance === 'number') {
          const balance = data.balance
          const gasToken = data.gasToken
          
          // Convert to USDC equivalent based on token type
          if (gasToken === 'USDC') {
            totalBalance += balance
          } else if (gasToken === 'ETH') {
            totalBalance += balance * 2500 // Approximate ETH price
          } else if (gasToken === 'SOL') {
            totalBalance += balance * 100 // Approximate SOL price
          } else if (gasToken === 'BNB') {
            totalBalance += balance * 600 // Approximate BNB price
          }
        } else {
          // Old structure: check for specific tokens
          if (data.usdc) totalBalance += data.usdc
          if (data.eth) totalBalance += data.eth * 2500
          if (data.sol) totalBalance += data.sol * 100
          if (data.bnb) totalBalance += data.bnb * 600
        }
      }
    })
    
    return totalBalance
  }

  useEffect(() => {
    // Initialize on first load - set initial balance to current balance
    if (!isInitialized && portfolio) {
      const balance = calculateTotalBalance(portfolio)
      if (balance > 0) {
        setInitialBalance(balance)
        setCurrentValue(balance)
        setHighestValue(balance)
        setLowestValue(balance)
        setIsInitialized(true)
      }
    }
  }, [portfolio, isInitialized])

  useEffect(() => {
    // Update current value and P&L
    if (!isInitialized || initialBalance === 0) return
    
    const actualBalance = calculateTotalBalance(portfolio)
    
    if (actualBalance > 0) {
      setCurrentValue(actualBalance)
      
      // Update high/low
      setHighestValue(prev => Math.max(prev, actualBalance))
      setLowestValue(prev => Math.min(prev, actualBalance))
      
      // Calculate P&L
      const pnl = actualBalance - initialBalance
      const pnlPercentage = initialBalance > 0 ? Math.round((pnl / initialBalance) * 10000) / 100 : 0
      setPnlPercent(pnlPercentage)
    }
  }, [portfolio, initialBalance, isInitialized])

  useEffect(() => {
    if (!isInitialized || initialBalance === 0) return

    const data = []
    const now = Date.now()

    // Filter by timeframe
    let filteredDiary = diary || []
    if (timeframe === '24h') {
      filteredDiary = filteredDiary.filter(d => now - new Date(d.timestamp).getTime() < 24 * 60 * 60 * 1000)
    } else if (timeframe === '7d') {
      filteredDiary = filteredDiary.filter(d => now - new Date(d.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000)
    } else if (timeframe === '30d') {
      filteredDiary = filteredDiary.filter(d => now - new Date(d.timestamp).getTime() < 30 * 24 * 60 * 60 * 1000)
    }

    // Add initial point
    data.push({
      timestamp: new Date(now - 7 * 24 * 60 * 60 * 1000).toLocaleString(),
      value: initialBalance,
      pnl: 0,
      pnlPercent: 0,
      time: new Date(now - 7 * 24 * 60 * 60 * 1000).getTime()
    })

    let maxValue = initialBalance
    let minValue = initialBalance

    // Process diary entries
    if (filteredDiary && filteredDiary.length > 0) {
      filteredDiary.forEach((entry, idx) => {
        const timestamp = new Date(entry.timestamp)
        
        // Use actual current value for all points (since we don't have historical balance data)
        // In a real scenario, this would come from historical balance snapshots
        const runningBalance = currentValue
        
        maxValue = Math.max(maxValue, runningBalance)
        minValue = Math.min(minValue, runningBalance)

        data.push({
          timestamp: timestamp.toLocaleString(),
          value: Math.round(runningBalance * 100) / 100,
          pnl: Math.round((runningBalance - initialBalance) * 100) / 100,
          pnlPercent: initialBalance > 0 ? Math.round(((runningBalance - initialBalance) / initialBalance) * 10000) / 100 : 0,
          time: timestamp.getTime()
        })
      })
    }

    // Add current value (use actual balance from portfolio)
    data.push({
      timestamp: new Date().toLocaleString(),
      value: Math.round(currentValue * 100) / 100,
      pnl: Math.round((currentValue - initialBalance) * 100) / 100,
      pnlPercent: initialBalance > 0 ? Math.round(((currentValue - initialBalance) / initialBalance) * 10000) / 100 : 0,
      time: Date.now()
    })

    maxValue = Math.max(maxValue, currentValue)
    minValue = Math.min(minValue, currentValue)

    setChartData(data)
    setHighestValue(maxValue)
    setLowestValue(minValue)
  }, [diary, timeframe, currentValue, initialBalance, isInitialized])

  const isProfitable = pnlPercent >= 0

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="pnl-tooltip">
          <p className="tooltip-time">{data.timestamp}</p>
          <p className="tooltip-value">${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className={`tooltip-pnl ${data.pnl >= 0 ? 'positive' : 'negative'}`}>
            {data.pnl >= 0 ? '+' : ''}{data.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({data.pnlPercent >= 0 ? '+' : ''}{data.pnlPercent}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="pnl-chart-container">
      <div className="pnl-header">
        <div className="pnl-title-section">
          <h3>Total Account Value</h3>
          <div className="pnl-status">
            {isProfitable ? (
              <span className="status-badge profitable">BACK TO ALL</span>
            ) : (
              <span className="status-badge loss">IN LOSS</span>
            )}
          </div>
        </div>

        <div className="pnl-timeframe">
          <button 
            className={`timeframe-btn ${timeframe === 'all' ? 'active' : ''}`}
            onClick={() => setTimeframe('all')}
          >
            ALL
          </button>
          <button 
            className={`timeframe-btn ${timeframe === '24h' ? 'active' : ''}`}
            onClick={() => setTimeframe('24h')}
          >
            24H
          </button>
          <button 
            className={`timeframe-btn ${timeframe === '7d' ? 'active' : ''}`}
            onClick={() => setTimeframe('7d')}
          >
            7D
          </button>
          <button 
            className={`timeframe-btn ${timeframe === '30d' ? 'active' : ''}`}
            onClick={() => setTimeframe('30d')}
          >
            30D
          </button>
        </div>
      </div>

      <div className="pnl-stats">
        <div className="stat-item">
          <span className="stat-label">Current Value</span>
          <span className="stat-value">${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">P&L</span>
          <span className={`stat-value ${isProfitable ? 'positive' : 'negative'}`}>
            {isProfitable ? '+' : ''}{(currentValue - 10000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Return</span>
          <span className={`stat-value ${isProfitable ? 'positive' : 'negative'}`}>
            {isProfitable ? '+' : ''}{pnlPercent}%
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">High</span>
          <span className="stat-value">${highestValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Low</span>
          <span className="stat-value">${lowestValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="pnl-chart">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isProfitable ? '#10b981' : '#ef4444'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isProfitable ? '#10b981' : '#ef4444'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                interval={Math.floor(chartData.length / 6)}
              />
              <YAxis 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                domain={['dataMin - 100', 'dataMax + 100']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={isProfitable ? '#10b981' : '#ef4444'} 
                fillOpacity={1} 
                fill="url(#colorValue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="pnl-empty">
            <p>No trading data yet. Start trading to see your P&L history!</p>
          </div>
        )}
      </div>

      <div className="pnl-footer">
        <div className="footer-item">
          <span className="footer-label">Initial Balance</span>
          <span className="footer-value">${initialBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="footer-item">
          <span className="footer-label">Total Trades</span>
          <span className="footer-value">{stats?.totalTrades || 0}</span>
        </div>
        <div className="footer-item">
          <span className="footer-label">Data Points</span>
          <span className="footer-value">{chartData.length}</span>
        </div>
      </div>
    </div>
  )
}
