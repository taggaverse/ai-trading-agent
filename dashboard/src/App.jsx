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
    chains: [],
    wallets: null,
    walletBalances: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      const baseURL = 'http://localhost:3000'
      console.log('Fetching data from:', baseURL)
      
      const [health, stats, portfolio, diary, wallets, walletBalances] = await Promise.all([
        axios.get(`${baseURL}/health`).catch(e => { console.error('health error:', e); throw e }),
        axios.get(`${baseURL}/stats`).catch(e => { console.error('stats error:', e); throw e }),
        axios.get(`${baseURL}/portfolio`).catch(e => { console.error('portfolio error:', e); throw e }),
        axios.get(`${baseURL}/diary`).catch(e => { console.error('diary error:', e); throw e }),
        axios.get(`${baseURL}/wallets`).catch(e => { console.warn('wallets error:', e); return { data: { addresses: {} } } }),
        axios.get(`${baseURL}/wallets/balances`).catch(e => { console.warn('wallets/balances error:', e); return { data: { balances: {} } } })
      ])

      console.log('Data fetched successfully:', { health: health.data, stats: stats.data })

      setData({
        health: health.data,
        stats: stats.data,
        portfolio: portfolio.data,
        diary: diary.data,
        chains: health.data.chains || [],
        wallets: wallets.data,
        walletBalances: walletBalances.data
      })
      setError(null)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError(err.message || 'Failed to connect to agent')
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
      <div className="app loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column' }}>
        <div className="spinner"></div>
        <p style={{ color: '#e2e8f0', marginTop: '20px' }}>Loading agent data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="error-box" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '12px', padding: '40px', textAlign: 'center', maxWidth: '500px' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Connection Error</h2>
          <p style={{ color: '#e2e8f0', marginBottom: '8px' }}>{error}</p>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '16px' }}>Make sure the trading agent is running on port 3000</p>
          <button onClick={fetchData} style={{ marginTop: '24px', padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Header health={data.health} chains={data.chains} />
      <main className="main-content">
        <StatsGrid stats={data.stats} portfolio={data.portfolio} walletBalances={data.walletBalances} />
        <ChartsSection stats={data.stats} diary={data.diary} />
        <div className="grid-2">
          <DecisionLog diary={data.diary} />
          <UnitEconomics stats={data.stats} />
        </div>
        <TradeHistory portfolio={data.portfolio} wallets={data.wallets} walletBalances={data.walletBalances} />
      </main>
    </div>
  )
}
