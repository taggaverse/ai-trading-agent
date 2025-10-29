# Hyperliquid Integration - Next Steps

## ✅ Phase 2 Complete!

Portfolio context now composes:
- ✅ Asset trading contexts (per asset)
- ✅ Technical context (shared indicators)
- ✅ Hyperliquid system prompt

---

## 🎯 Phase 3: Initialize APIs (30 minutes)

### Step 1: Create HyperliquidAPI Instance

In `src/index.ts`, uncomment and complete:

```typescript
// Initialize HyperliquidAPI
import { HyperliquidAPI } from "./agent/hyperliquid-client.js"

const hyperliquidAPI = new HyperliquidAPI(config.HYPERLIQUID_PRIVATE_KEY)
logger.info("✓ HyperliquidAPI initialized")
```

### Step 2: Create IndicatorsClient Instance

```typescript
// Initialize IndicatorsClient
import { IndicatorsClient } from "./agent/indicators-client.js"

const indicatorsClient = new IndicatorsClient(config.TAAPI_API_KEY)
logger.info("✓ IndicatorsClient initialized")
```

### Step 3: Initialize Hyperliquid Extension

```typescript
// Initialize Hyperliquid extension
const hlExtension = hyperliquidExtension(hyperliquidAPI, indicatorsClient, {
  privateKey: config.HYPERLIQUID_PRIVATE_KEY,
  tapiKey: config.TAAPI_API_KEY
})
logger.info("✓ Hyperliquid extension initialized")
```

---

## 🔄 Phase 4: Create Trading Loop (2 hours)

### Step 1: Create Hyperliquid Trading Function

```typescript
async function runHyperliquidTrading() {
  logger.info("🚀 Starting Hyperliquid trading loop...")
  
  while (true) {
    try {
      // Get portfolio state
      const portfolioState = await portfolioContext.create({
        args: { accountId: "main", assets: ['BTC', 'ETH'] }
      })
      
      // Call agent with system prompt
      const decision = await dreamsRouter("openai/gpt-4o")({
        system: HYPERLIQUID_TRADING_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Analyze portfolio and make trading decisions for ${portfolioState.assets}`
        }]
      })
      
      // Log decision
      tradingData.decisions.push({
        timestamp: new Date().toISOString(),
        decision,
        portfolio: portfolioState
      })
      
      logger.info(`Decision: ${decision.content}`)
      
      // Sleep before next iteration
      await new Promise(r => setTimeout(r, tradingInterval))
    } catch (error) {
      logger.error("Trading loop error:", error)
      await new Promise(r => setTimeout(r, 5000))
    }
  }
}
```

### Step 2: Start Trading Loop

In `main()` function, after API server starts:

```typescript
// Start Hyperliquid trading loop
runHyperliquidTrading().catch(error => {
  logger.error("Fatal trading loop error:", error)
  process.exit(1)
})
```

---

## 🧪 Phase 5: Test on Testnet (2-3 days)

### Checklist

- [ ] Agent starts without errors
- [ ] Contexts initialize correctly
- [ ] Technical indicators fetch successfully
- [ ] LLM receives correct context
- [ ] Decisions are logged
- [ ] Orders can be placed (testnet)
- [ ] Positions are tracked
- [ ] PnL is calculated
- [ ] Exit plans are enforced
- [ ] Cooldowns prevent churn

### Commands

```bash
# Build
npm run build

# Start agent
npm start

# Monitor logs
tail -f agent.log

# Check API
curl http://localhost:3000/health
curl http://localhost:3000/portfolio
curl http://localhost:3000/diary
```

---

## 🚀 Phase 6: Deploy to Mainnet (1 day)

### Pre-Deployment Checklist

- [ ] All tests pass
- [ ] No errors in logs
- [ ] Decisions are reasonable
- [ ] Risk management working
- [ ] Exit plans enforced
- [ ] Cooldowns preventing churn

### Deployment Steps

1. **Switch to mainnet**
   ```typescript
   const hyperliquidAPI = new HyperliquidAPI(
     config.HYPERLIQUID_PRIVATE_KEY,
     'mainnet'  // Change from testnet
   )
   ```

2. **Start with small position sizes**
   - Max 1% per trade initially
   - Monitor for 24 hours
   - Gradually increase to 5%

3. **Monitor live trading**
   ```bash
   # Watch logs
   tail -f agent.log | grep -E "Decision|Order|PnL"
   
   # Check portfolio
   curl http://localhost:3000/portfolio
   
   # Check stats
   curl http://localhost:3000/stats
   ```

4. **Set up alerts**
   - Large losses
   - Margin warnings
   - API errors
   - Unusual activity

---

## 📋 Environment Variables Needed

Add to `.env`:

```bash
# Hyperliquid
HYPERLIQUID_PRIVATE_KEY=your_private_key
HYPERLIQUID_NETWORK=mainnet  # or testnet

# TAAPI (Technical Indicators)
TAAPI_API_KEY=your_taapi_key

# Trading Config
TRADING_ASSETS=BTC,ETH
TRADING_INTERVAL=60000  # 60 seconds
MAX_POSITION_SIZE=0.05  # 5%
MAX_LEVERAGE=5
```

---

## 🔗 File References

### Key Files
- `src/index.ts` - Main agent (add trading loop here)
- `src/agent/contexts/portfolio.ts` - Portfolio with composition
- `src/agent/contexts/asset-trading.ts` - Asset positions
- `src/agent/contexts/technical.ts` - Indicators
- `src/extensions/hyperliquid-extension.ts` - API wrapper
- `src/agent/hyperliquid-system-prompt.ts` - Trading rules

### API Endpoints
- `GET /health` - Agent status
- `GET /portfolio` - Current positions
- `GET /diary` - Trading decisions
- `GET /stats` - Performance metrics

---

## 📊 Success Metrics

### Phase 3 (APIs)
- ✅ No initialization errors
- ✅ All clients ready

### Phase 4 (Trading Loop)
- ✅ Loop runs continuously
- ✅ Decisions logged
- ✅ No crashes

### Phase 5 (Testnet)
- ✅ Orders execute
- ✅ Positions tracked
- ✅ PnL calculated
- ✅ Decisions reasonable

### Phase 6 (Mainnet)
- ✅ Live trading working
- ✅ Positive PnL
- ✅ Risk managed
- ✅ No major losses

---

## 🎓 Key Concepts

### Context Composition
```
Portfolio Context
├─ Asset Trading Context (BTC)
├─ Asset Trading Context (ETH)
└─ Technical Context
```

### Trading Discipline
1. **Hysteresis** - Harder to change than keep
2. **Cooldown** - 3 bars minimum between changes
3. **Exit Plans** - Encoded in memory
4. **Risk Management** - Max 5% position size

### System Prompt
- Encodes trading rules
- Prevents churn
- Manages risk
- Tracks positions

---

## 🚀 Ready to Go!

All foundation complete. Next: Initialize APIs and create trading loop.

**Timeline: 3-4 days to mainnet deployment**

Questions? See DAYDREAMS_HYPERLIQUID_INTEGRATION.md for complete guide.
