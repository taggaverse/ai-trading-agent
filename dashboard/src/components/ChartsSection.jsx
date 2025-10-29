import React, { useMemo } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './ChartsSection.css'

export default function ChartsSection({ stats, diary }) {
  const chartData = useMemo(() => {
    if (!diary || !diary.decisions) return []
    
    // Generate cumulative P&L over time
    let cumulative = 0
    return diary.decisions.map((decision, idx) => {
      cumulative += (decision.pnl || 0)
      return {
        time: new Date(decision.timestamp).toLocaleTimeString(),
        pnl: cumulative,
        trades: idx + 1,
        confidence: decision.confidence * 100
      }
    })
  }, [diary])

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          {payload.map((entry, idx) => (
            <p key={idx} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="charts-section">
      <div className="chart-container">
        <h3>Cumulative P&L Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
            <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="pnl" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPnl)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>Trade Confidence & Volume</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
            <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="left" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="confidence" stroke="#8b5cf6" dot={false} name="Confidence %" />
            <Line yAxisId="right" type="monotone" dataKey="trades" stroke="#22c55e" dot={false} name="Total Trades" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
