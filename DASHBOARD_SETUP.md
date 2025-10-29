# Dashboard Setup Guide

Complete guide to running the AI Trading Agent Dashboard alongside the trading agent.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│          Dashboard (React + Vite)                   │
│          http://localhost:5173                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  • Real-time metrics                               │
│  • P&L charts                                      │
│  • Decision logs                                   │
│  • Unit economics                                  │
│  • Trade history                                   │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP (Auto-refresh every 5s)
                   ▼
┌─────────────────────────────────────────────────────┐
│      Trading Agent (Node.js + TypeScript)           │
│          http://localhost:3000                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  • Market analysis                                 │
│  • Research queries                                │
│  • Trade execution                                 │
│  • Risk management                                 │
│  • Monitoring API                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js 18+
- Trading agent running on port 3000
- Modern web browser

## Quick Start (2 Terminals)

### Terminal 1: Start Trading Agent

```bash
cd /Users/alectaggart/CascadeProjects/windsurf-project
npm start
```

Expected output:
```
> ai-trading-agent@1.0.0 start
> node dist/index.js

[info] Initializing Dreams Router with x402...
[info] Dreams Router initialized successfully
[info] Starting trading loop...
```

### Terminal 2: Start Dashboard

```bash
cd /Users/alectaggart/CascadeProjects/windsurf-project/dashboard
npm install  # First time only
npm run dev
```

Expected output:
```
  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Access Dashboard

Open browser to: **http://localhost:5173**

## Dashboard Features

### 1. Header Section
- **Status**: Live/Offline indicator
- **Uptime**: How long agent has been running
- **Chains**: Active trading chains (Base, Solana, Hyperliquid, BSC)

### 2. Stats Grid (6 Cards)
```
Total Balance      Total P&L       Total Trades
Win Rate           Used Margin     Available Margin
```

### 3. Charts
- **Cumulative P&L**: Shows profit/loss over time
- **Confidence & Volume**: Trade confidence and total trades executed

### 4. Decision Log
Recent 10 trading decisions with:
- Timestamp
- Trading symbol
- Confidence score
- Action (Execute/Monitor/Skip)

### 5. Unit Economics
Service costs breakdown:
- **Dreams Router**: $0.01 per LLM decision
- **x402 Research**: $0.05 per research query
- **Total Service Cost**: Per trade
- **Gross Profit**: Before service costs
- **Net Profit**: After service costs
- **Profit Margin**: Net/Gross ratio
- **ROI**: Return on service investment

### 6. Trade History
Two tables:
- **Active Positions**: Symbol, size, entry/current price, P&L, chain
- **Wallet Balances**: Chain, amount, USD value

## API Endpoints Used

Dashboard calls these endpoints every 5 seconds:

```bash
# Agent health and uptime
GET http://localhost:3000/health
Response: {
  "status": "ok",
  "timestamp": "2025-10-29T00:53:47.019Z",
  "chains": ["base", "solana", "hyperliquid", "bsc"],
  "uptime": 79.163641917,
  "stats": {...}
}

# Trading statistics
GET http://localhost:3000/stats
Response: {
  "totalTrades": 0,
  "totalProfit": 0,
  "winRate": 0,
  "startTime": 1761699148023
}

# Portfolio positions and balances
GET http://localhost:3000/portfolio
Response: {
  "positions": {...},
  "balances": {...},
  "stats": {...}
}

# Decision history
GET http://localhost:3000/diary
Response: {
  "decisions": [
    {
      "iteration": 1,
      "timestamp": "2025-10-29T00:53:47.019Z",
      "opportunity": "BTC/USDT",
      "decision": "execute",
      "confidence": 0.85,
      "balance": 10000
    }
  ]
}
```

## Customization

### Change Refresh Rate

Edit `dashboard/src/App.jsx`:

```javascript
// Change 5000 to desired milliseconds
const interval = setInterval(fetchData, 5000)
```

### Adjust Service Costs

Edit `dashboard/src/components/UnitEconomics.jsx`:

```javascript
const routerCostPerDecision = 0.01 // Dreams Router cost
const researchCostPerQuery = 0.05 // x402 research cost
```

### Modify Charts

Edit `dashboard/src/components/ChartsSection.jsx` to:
- Add new data series
- Change chart types
- Adjust time windows

### Customize Colors

Edit `dashboard/src/index.css` and component `.css` files:

```css
/* Example: Change primary color from blue to purple */
--primary: #8b5cf6; /* was #3b82f6 */
```

## Troubleshooting

### Dashboard shows "Connection Error"

**Problem**: Cannot connect to trading agent

**Solutions**:
1. Verify agent is running: `ps aux | grep "node dist"`
2. Check agent is on port 3000: `lsof -i :3000`
3. Check browser console for CORS errors
4. Restart agent: `npm start`

### Data not updating

**Problem**: Dashboard shows stale data

**Solutions**:
1. Check network tab in DevTools (F12)
2. Verify API endpoints respond: `curl http://localhost:3000/health`
3. Check agent logs for errors
4. Refresh dashboard (Cmd+R)

### Charts not displaying

**Problem**: Charts show empty

**Solutions**:
1. Wait for trades to execute (need decision history)
2. Check browser console for JavaScript errors
3. Verify Recharts library loaded: `npm install` in dashboard folder
4. Try different browser

### Port 5173 already in use

**Problem**: `EADDRINUSE: address already in use :::5173`

**Solutions**:
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 5174
```

### Port 3000 already in use

**Problem**: `EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or configure different port in src/index.ts
```

## Performance Tips

### Reduce Network Load
- Increase refresh interval: `setInterval(fetchData, 10000)` (10s)
- Only fetch needed endpoints

### Optimize Charts
- Limit decision history: `diary.decisions.slice(-100)`
- Use canvas rendering for large datasets

### Browser Performance
- Use Chrome/Edge for best performance
- Close other tabs to free memory
- Clear browser cache if slow

## Production Deployment

### Build Dashboard

```bash
cd dashboard
npm run build
```

Creates optimized build in `dashboard/dist/`

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dashboard/dist
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Self-hosted

```bash
# Build
npm run build

# Serve with any static server
npx serve -s dist -l 5173
```

## Security Considerations

⚠️ **Important**: The dashboard connects to the trading agent API without authentication.

### In Production:

1. **Add Authentication**
   - Implement JWT tokens
   - Add API key validation
   - Use HTTPS only

2. **CORS Configuration**
   - Restrict dashboard origin
   - Validate requests

3. **Rate Limiting**
   - Limit API calls per IP
   - Prevent abuse

4. **Environment Variables**
   - Never commit `.env` files
   - Use secrets management

## Monitoring

### Key Metrics to Watch

- **Win Rate**: Should be > 50% for profitable trading
- **Profit Margin**: Net profit / Gross profit
- **Cost per Trade**: Total service costs / trades
- **ROI**: (Net profit / Service costs) * 100

### Alert Thresholds

Consider alerts when:
- Win rate drops below 40%
- Service costs exceed 20% of profit
- Drawdown exceeds 10%
- Margin ratio drops below 20%

## Support

For issues or questions:

1. Check `DASHBOARD_SETUP.md` (this file)
2. Review `dashboard/README.md`
3. Check agent logs: `npm start` output
4. Check browser console: F12 → Console tab

## Next Steps

1. ✅ Start trading agent
2. ✅ Start dashboard
3. ✅ Monitor live trading
4. ✅ Analyze unit economics
5. ✅ Optimize strategy based on metrics

---

**Dashboard is now live and monitoring your trading agent! 🚀**
