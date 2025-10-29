# Mainnet Deployment Guide

## ⚠️ **CRITICAL: Mainnet Safety Checklist**

Before deploying to mainnet, verify ALL of these:

- [ ] Agent tested on testnet (recommended)
- [ ] System prompt reviewed and approved
- [ ] Position size limits set to 0.5% (start small)
- [ ] Stop loss and take profit configured
- [ ] Risk management rules enforced
- [ ] Monitoring dashboard active
- [ ] Alert system configured
- [ ] Emergency stop procedure documented
- [ ] Funding available in wallet
- [ ] Private keys secured

---

## 🚀 **Deployment Steps**

### **Step 1: Update Configuration for Mainnet**

Edit `.env` file:

```bash
# Switch to mainnet
HYPERLIQUID_NETWORK=mainnet

# Ensure correct private key
HYPERLIQUID_PRIVATE_KEY=your_mainnet_private_key

# x402 mainnet configuration
X402_NETWORK=base-mainnet
X402_WALLET_ADDRESS=your_x402_wallet_address
X402_PRIVATE_KEY=your_x402_private_key

# Ensure funding available
# Recommended: $100+ USDC for trading + gas fees
```

### **Step 2: Verify Agent Configuration**

Check `src/index.ts`:

```typescript
// Verify mainnet settings
const hyperliquidAPI = new HyperliquidAPI(
  config.HYPERLIQUID_PRIVATE_KEY,
  'mainnet'  // ✅ Must be 'mainnet'
)

// Verify trading parameters
const tradingLoop = new HyperliquidTradingLoop(hyperliquidAPI, indicatorsClient, {
  tradingInterval: 60000,      // 60 seconds
  assets: ['BTC', 'ETH'],      // Start with 2 assets
  maxPositionSize: 0.005,      // 0.5% per trade (START SMALL!)
  maxLeverage: 2               // Conservative leverage
}, dreamsRouter)
```

### **Step 3: Start Agent in Production Mode**

```bash
# Build for production
npm run build

# Start agent
npm start

# Monitor logs
tail -f agent.log
```

### **Step 4: Monitor First 24 Hours**

Watch for:
- ✅ Successful portfolio fetches
- ✅ Indicator data flowing
- ✅ LLM decisions being made
- ✅ Orders executing (or being skipped)
- ✅ No errors in logs
- ✅ API endpoints responding

### **Step 5: Gradual Position Size Increase**

**Hour 1-4:** Monitor only (0% position size)
```typescript
maxPositionSize: 0.0  // No trades
```

**Hour 4-8:** Test with 0.1%
```typescript
maxPositionSize: 0.001  // 0.1% per trade
```

**Hour 8-24:** Increase to 0.5%
```typescript
maxPositionSize: 0.005  // 0.5% per trade
```

**Day 2+:** Increase to 1-2% if performing well
```typescript
maxPositionSize: 0.01  // 1% per trade
```

---

## 🛡️ **Risk Management**

### **Position Sizing**

```typescript
// Conservative start
maxPositionSize: 0.005,      // 0.5% per trade
maxLeverage: 2,              // 2x leverage max

// After 1 week of profitable trading
maxPositionSize: 0.01,       // 1% per trade
maxLeverage: 3,              // 3x leverage max

// After 1 month of consistent profits
maxPositionSize: 0.02,       // 2% per trade
maxLeverage: 5,              // 5x leverage max
```

### **Stop Loss & Take Profit**

Always set in system prompt:
- **Stop Loss:** 2-3% below entry
- **Take Profit:** 3-5% above entry
- **Risk/Reward:** Minimum 1:2 ratio

### **Daily Loss Limit**

Add to trading loop:
```typescript
if (this.state.totalPnL < -1000) {
  logger.warn('Daily loss limit reached, stopping trading')
  this.stop()
}
```

---

## 📊 **Monitoring Dashboard**

### **Key Metrics to Watch**

```bash
# Check health
curl http://localhost:3000/health

# Check portfolio
curl http://localhost:3000/portfolio

# Check stats
curl http://localhost:3000/stats

# Check diary (trading log)
curl http://localhost:3000/diary
```

### **Alert Conditions**

Stop trading if:
- ❌ Daily loss > 2% of account
- ❌ Consecutive losses > 3
- ❌ Margin utilization > 80%
- ❌ API errors > 5 in a row
- ❌ LLM response errors > 3 in a row

---

## 🚨 **Emergency Stop Procedure**

### **Immediate Actions**

1. **Stop the agent:**
   ```bash
   pkill -9 node
   ```

2. **Close all positions:**
   ```bash
   # Manually close via Hyperliquid UI or API
   # Or update system prompt to SELL ALL
   ```

3. **Secure funds:**
   ```bash
   # Withdraw to cold storage if needed
   ```

### **Post-Incident Analysis**

1. Review logs for what went wrong
2. Update system prompt if needed
3. Adjust parameters
4. Test on testnet before redeploying

---

## 📈 **Performance Targets**

### **Conservative (Safe)**
- Target: 1-2% monthly return
- Max drawdown: 5%
- Win rate: 55%+

### **Moderate (Balanced)**
- Target: 3-5% monthly return
- Max drawdown: 10%
- Win rate: 60%+

### **Aggressive (High Risk)**
- Target: 5-10% monthly return
- Max drawdown: 15%
- Win rate: 65%+

---

## 🔍 **Troubleshooting**

### **Agent Not Trading**

Check:
1. Portfolio has sufficient balance
2. LLM is returning valid decisions
3. Position size is > 0
4. No errors in logs

### **Orders Failing**

Check:
1. Sufficient margin available
2. Order size not too small
3. Price within reasonable range
4. No API rate limits hit

### **High Slippage**

Reduce:
1. Position size
2. Order frequency
3. Leverage

---

## 📝 **Deployment Checklist**

Before going live:

- [ ] `.env` file updated with mainnet credentials
- [ ] `HYPERLIQUID_NETWORK=mainnet` set
- [ ] Position size set to 0.5% or less
- [ ] Leverage set to 2x or less
- [ ] System prompt reviewed
- [ ] Monitoring dashboard ready
- [ ] Emergency stop procedure documented
- [ ] Backup plan in place
- [ ] Logs being monitored
- [ ] Team notified

---

## 🎯 **Deployment Timeline**

**T-0 (Now):** Verify all settings
**T+0:** Start agent with 0% position size
**T+4h:** Increase to 0.1% if no errors
**T+8h:** Increase to 0.5% if profitable
**T+24h:** Review performance, adjust if needed
**T+1w:** Increase to 1% if consistent profits
**T+1m:** Increase to 2% if still profitable

---

## 🚀 **Go Live!**

When ready:

1. Update `.env` with mainnet credentials
2. Set `maxPositionSize: 0.005` (0.5%)
3. Run `npm run build`
4. Run `npm start`
5. Monitor logs closely
6. Watch for first trade
7. Celebrate! 🎉

---

## 📞 **Support**

If issues arise:
1. Check logs: `tail -f agent.log`
2. Review system prompt
3. Verify API connectivity
4. Check wallet balance
5. Review recent trades

**Remember:** Start small, monitor closely, scale gradually!
