# Quick Start Guide

Get your AI Trading Agent and Dashboard running in minutes!

## 🚀 One-Command Start (macOS/Linux)

```bash
cd /Users/alectaggart/CascadeProjects/windsurf-project
./start-all.sh
```

This will:
1. ✅ Check Node.js installation
2. ✅ Build the trading agent
3. ✅ Install dashboard dependencies
4. ✅ Start trading agent on port 3000
5. ✅ Start dashboard on port 5173

Then open: **http://localhost:5173**

## 🪟 Windows Quick Start

Double-click: `start-all.bat`

Or run in Command Prompt:
```cmd
start-all.bat
```

## Manual Setup (If Script Doesn't Work)

### Step 1: Install Dependencies

```bash
cd /Users/alectaggart/CascadeProjects/windsurf-project
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
# Edit .env with your private keys
nano .env
```

Required keys:
- `BASE_PRIVATE_KEY` - Ethereum private key
- `SOLANA_PRIVATE_KEY` - Solana keypair
- `HYPERLIQUID_PRIVATE_KEY` - Hyperliquid key
- `BSC_PRIVATE_KEY` - BSC private key
- `X402_WALLET_ADDRESS` - x402 wallet
- `X402_PRIVATE_KEY` - x402 private key

### Step 3: Build Agent

```bash
npm run build
```

### Step 4: Start Agent (Terminal 1)

```bash
npm start
```

Expected output:
```
[info] Initializing Dreams Router with x402...
[info] Dreams Router initialized successfully
[info] Starting trading loop...
```

### Step 5: Start Dashboard (Terminal 2)

```bash
cd dashboard
npm install  # First time only
npm run dev
```

Expected output:
```
VITE v5.0.0  ready in 234 ms
➜  Local:   http://localhost:5173/
```

### Step 6: Open Dashboard

Open browser to: **http://localhost:5173**

## 📊 Dashboard Overview

### Real-time Metrics
- **Total Balance**: Current portfolio value
- **Total P&L**: Profit/loss since start
- **Total Trades**: Number of trades executed
- **Win Rate**: Percentage of winning trades
- **Used Margin**: Margin currently in use
- **Available Margin**: Remaining margin

### Charts
- **Cumulative P&L**: Profit/loss over time
- **Confidence & Volume**: Trade confidence and volume

### Decision Log
Recent trading decisions with:
- Timestamp
- Trading symbol
- Confidence score
- Action (Execute/Monitor/Skip)

### Unit Economics
Service costs breakdown:
- Dreams Router costs ($0.01/decision)
- x402 Research costs ($0.05/query)
- Total service cost per trade
- Gross vs Net profit
- Profit margin and ROI

### Trade History
- Active positions (symbol, size, P&L, chain)
- Wallet balances (chain, amount, USD value)

## 🔧 Troubleshooting

### Agent won't start

**Error**: `Cannot find module '@daydreamsai/router'`
- Solution: Run `npm install` again
- Solution: Delete `node_modules` and `npm install`

**Error**: `Port 3000 already in use`
- Solution: Kill process: `lsof -ti:3000 | xargs kill -9`
- Solution: Use different port in `src/index.ts`

### Dashboard won't connect

**Error**: `Connection Error`
- Solution: Ensure agent is running on port 3000
- Solution: Check `http://localhost:3000/health` in browser
- Solution: Check browser console (F12) for errors

**Error**: `Port 5173 already in use`
- Solution: Kill process: `lsof -ti:5173 | xargs kill -9`
- Solution: Use different port: `npm run dev -- --port 5174`

### Data not updating

- Wait 5 seconds (auto-refresh interval)
- Check browser console for JavaScript errors
- Verify agent is executing trades
- Refresh page (Cmd+R or Ctrl+R)

## 📱 Accessing Dashboard Remotely

### Option 1: ngrok (Easiest)

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com

# Expose dashboard
ngrok http 5173

# Share the URL
```

### Option 2: SSH Tunnel

```bash
# From remote machine
ssh -L 5173:localhost:5173 user@your-machine

# Then access http://localhost:5173
```

### Option 3: Cloud Deployment

See `DASHBOARD_SETUP.md` for Netlify/Vercel deployment.

## 🛑 Stopping Services

### Using Script

Press `Ctrl+C` in the terminal running `start-all.sh`

### Manual Stop

```bash
# Kill agent
lsof -ti:3000 | xargs kill -9

# Kill dashboard
lsof -ti:5173 | xargs kill -9
```

## 📊 Monitoring Your Agent

### Key Metrics to Watch

- **Win Rate**: Should be > 50% for profitable trading
- **Profit Margin**: Net profit / Gross profit (target: > 50%)
- **Cost per Trade**: Total service costs / trades (target: < 5% of profit)
- **ROI**: (Net profit / Service costs) * 100 (target: > 100%)

### Daily Checklist

- [ ] Agent is running and connected
- [ ] Dashboard shows live data
- [ ] No error messages in logs
- [ ] Win rate is acceptable
- [ ] Service costs are reasonable
- [ ] Margin usage is healthy

## 🎯 Next Steps

1. **Monitor Performance**
   - Watch dashboard for 24 hours
   - Analyze decision quality
   - Check unit economics

2. **Optimize Strategy**
   - Adjust risk parameters
   - Fine-tune technical indicators
   - Modify chain selection logic

3. **Scale Up**
   - Increase position sizes
   - Add more trading pairs
   - Deploy to more chains

4. **Production Deployment**
   - Set up monitoring alerts
   - Configure log aggregation
   - Deploy to cloud infrastructure

## 📚 Additional Resources

- **Agent Documentation**: See `PROJECT_COMPLETE.md`
- **Dashboard Documentation**: See `dashboard/README.md`
- **Dashboard Setup**: See `DASHBOARD_SETUP.md`
- **Architecture**: See `ARCHITECTURE.md`

## 🆘 Getting Help

1. Check logs:
   ```bash
   tail -f agent.log
   tail -f dashboard.log
   ```

2. Check API:
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3000/stats
   ```

3. Check browser console:
   - Press F12
   - Go to Console tab
   - Look for error messages

4. Review documentation:
   - `DASHBOARD_SETUP.md` - Dashboard troubleshooting
   - `PROJECT_COMPLETE.md` - Agent troubleshooting
   - `README.md` - General information

## ✅ Success Checklist

- [ ] Agent running on port 3000
- [ ] Dashboard running on port 5173
- [ ] Dashboard shows live metrics
- [ ] Charts are displaying data
- [ ] Decision log shows recent trades
- [ ] Unit economics calculated correctly
- [ ] No error messages in console

---

**You're all set! Your AI Trading Agent is now live and monitoring! 🚀**

For detailed information, see:
- `DASHBOARD_SETUP.md` - Complete dashboard guide
- `PROJECT_COMPLETE.md` - Project overview
- `README.md` - Main documentation
