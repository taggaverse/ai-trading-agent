import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Header from './components/Header'
import StatsGrid from './components/StatsGrid'
import ChartsSection from './components/ChartsSection'
import DecisionLog from './components/DecisionLog'
import TradeHistory from './components/TradeHistory'
import UnitEconomics from './components/UnitEconomics'
import './App.css'

export default function App() {
  const [data, setData] = useState({
    health: null,
    stats: null,
    portfolio: null,
    diary: null,
    chains: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      const [health, stats, portfolio, diary] = await Promise.all([
        axios.get('/api/health'),
        axios.get('/api/stats'),
        axios.get('/api/portfolio'),
        axios.get('/api/diary')
      ])

      setData({
        health: health.data,
        stats: stats.data,
        portfolio: portfolio.data,
        diary: diary.data,
        chains: health.data.chains || []
      })
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="app loading">
        <div className="spinner"></div>
        <p>Loading agent data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app error">
        <div className="error-box">
          <h2>Connection Error</h2>
          <p>{error}</p>
          <p className="hint">Make sure the trading agent is running on port 3000</p>
          <button onClick={fetchData}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Header health={data.health} chains={data.chains} />
      <main className="main-content">
        <StatsGrid stats={data.stats} portfolio={data.portfolio} />
        <ChartsSection stats={data.stats} diary={data.diary} />
        <div className="grid-2">
          <DecisionLog diary={data.diary} />
          <UnitEconomics stats={data.stats} />
        </div>
        <TradeHistory portfolio={data.portfolio} />
      </main>
    </div>
  )
}
