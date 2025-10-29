# Nocturne Agent Analysis & Learnings

## Overview

Nocturne is a production AI trading agent that trades on Hyperliquid. We've studied its architecture and patterns to inform our multi-venue agent design.

---

## Nocturne Architecture

### High-Level Flow

```
main.py (Entry Point)
  ↓
User Input: --assets BTC ETH --interval 1h
  ↓
Main Trading Loop
├─ Fetch market data (TAAPI)
├─ Decision maker (LLM via OpenRouter)
├─ Execute trades (Hyperliquid)
└─ Log results
  ↓
API Server
├─ /diary - Trading decisions
├─ /logs - System logs
└─ Monitoring dashboard
```

### Core Components

#### 1. main.py (Entry Point)
**Responsibilities**:
- Parse command-line arguments (assets, interval)
- Initialize all components
- Run main trading loop
- Serve monitoring API

**Key Pattern**:
```python
# Continuous loop
while True:
    for asset in assets:
        # 1. Fetch indicators
        # 2. Get LLM decision
        # 3. Execute trade
        # 4. Log results
    sleep(interval)
```

**Our Adaptation**:
```typescript
// src/index.ts
async function main() {
  const agent = await createTradingAgent()
  const venueManager = await initializeVenues()
  
  while (true) {
    // 1. Check balance
    // 2. Get LLM decision (Dreams Router)
    // 3. Select venue
    // 4. Execute trade
    // 5. Monitor positions
    await sleep(interval)
  }
}
```

#### 2. decision_maker.py (LLM Logic)
**Responsibilities**:
- Format market data for LLM
- Call LLM with tool calling
- Parse LLM response
- Extract trade decision

**Key Pattern**:
```python
def get_trade_decision(indicators):
    # Format indicators as context
    # Call LLM with tool definitions
    # LLM can call tools to fetch indicators
    # Parse response for: BUY/SELL/HOLD
    # Extract: size, leverage, stop-loss, take-profit
```

**Our Adaptation**:
```typescript
// src/agent/trading-context.ts
async function getTradingDecision(context: TradingContext) {
  // Compose all contexts (market, research, portfolio, risk)
  // Send to Dreams Router LLM
  // LLM reasons over all data
  // Parse response for trade action
  // Return: action, size, venue, leverage
}
```

#### 3. taapi_client.py (Indicators)
**Responsibilities**:
- Fetch indicators from TAAPI API
- Cache results to avoid rate limits
- Support dynamic indicator requests

**Supported Indicators**:
- RSI, MACD, EMA, SMA, Bollinger Bands
- Volume, ATR, Stochastic, etc.

**Key Pattern**:
```python
def fetch_indicator(symbol, indicator_name, period):
    # Call TAAPI API
    # Return indicator value
    # Cache result
```

**Our Adaptation**:
```typescript
// src/agent/contexts/market.ts
async function calculateIndicators(ohlcv: any[]) {
  // Calculate locally (no API calls needed)
  // SMA, EMA, RSI, MACD, Bollinger Bands
  // Return all indicators
}
```

**Advantage**: We calculate indicators locally, no API dependency!

#### 4. hyperliquid_api.py (Trading)
**Responsibilities**:
- Connect to Hyperliquid
- Place orders (market, limit)
- Manage positions
- Handle errors

**Key Pattern**:
```python
def place_order(symbol, side, size, leverage, stop_loss, take_profit):
    # Create order on Hyperliquid
    # Set stop-loss and take-profit
    # Return order confirmation
```

**Our Adaptation**:
```typescript
// src/exchange/hyperliquid.ts
async function placeOrder(order: Order) {
  // Validate order against risk limits
  // Place on Hyperliquid
  // Set stop-loss and take-profit
  // Return confirmation
}
```

#### 5. config_loader.py (Configuration)
**Responsibilities**:
- Load .env variables
- Validate configuration
- Provide config to all components

**Key Pattern**:
```python
config = {
    'taapi_api_key': os.getenv('TAAPI_API_KEY'),
    'hyperliquid_private_key': os.getenv('HYPERLIQUID_PRIVATE_KEY'),
    'openrouter_api_key': os.getenv('OPENROUTER_API_KEY'),
    'llm_model': os.getenv('LLM_MODEL'),
}
```

**Our Adaptation**:
```typescript
// src/config/index.ts
export const config = {
  hyperliquid: {
    privateKey: process.env.HYPERLIQUID_PRIVATE_KEY,
    testnet: process.env.HYPERLIQUID_TESTNET === 'true'
  },
  binance: {
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET
  },
  dreamsRouter: {
    url: process.env.DREAMS_ROUTER_URL,
    x402Wallet: process.env.X402_WALLET_ADDRESS
  }
}
```

---

## Key Patterns to Adopt

### 1. Tool Calling Pattern

**Nocturne Approach**:
```
LLM: "I need RSI(14) for BTC"
  ↓
Tool Call: fetch_rsi(symbol="BTC", period=14)
  ↓
TAAPI: Returns RSI value
  ↓
LLM: Uses RSI to make decision
```

**Benefits**:
- LLM can request any indicator dynamically
- Flexible decision-making
- Reduces context size

**Our Approach**:
```
Market Context: Pre-calculates all indicators
  ↓
Research Context: Queries x402 for narratives
  ↓
LLM: Receives full context
  ↓
LLM: Makes decision with all data
```

**Benefits**:
- No API calls during decision
- Faster decisions
- More comprehensive context

### 2. Continuous Loop Pattern

**Nocturne**:
```python
while True:
    for asset in assets:
        indicators = fetch_indicators(asset)
        decision = get_decision(indicators)
        execute_trade(decision)
    sleep(interval)
```

**Our Agent**:
```typescript
while (true) {
  // 1. Check balance
  if (!await balanceManager.canMakeDecision()) {
    break
  }
  
  // 2. Get decision
  const decision = await agent.send({...})
  
  // 3. Execute
  if (decision.action === "buy") {
    await executeMultiVenueTrade(decision)
  }
  
  // 4. Monitor
  await monitorPositions()
  
  await sleep(interval)
}
```

### 3. Monitoring API Pattern

**Nocturne**:
```python
@app.route('/diary')
def get_diary():
    # Return recent trading decisions
    
@app.route('/logs')
def get_logs():
    # Return system logs
```

**Our Agent**:
```typescript
app.get('/diary', (req, res) => {
  // Return recent trading decisions
})

app.get('/portfolio', (req, res) => {
  // Return portfolio state
})

app.get('/venues', (req, res) => {
  // Return venue status
})

app.get('/metrics', (req, res) => {
  // Return performance metrics
})
```

### 4. Error Handling Pattern

**Nocturne**:
```python
try:
    execute_trade(decision)
except HyperliquidError as e:
    log_error(e)
    continue
```

**Our Agent**:
```typescript
try {
  await executeMultiVenueTrade(decision)
} catch (error) {
  if (error instanceof VenueError) {
    // Try fallback venue
    await executeOnFallbackVenue(decision)
  } else {
    logger.error(error)
  }
}
```

---

## Nocturne Live Agents

Nocturne is running 3 live agents on Hyperliquid:

### 1. GPT-5 Pro
- **Status**: Active
- **Seed**: $200
- **Model**: GPT-5 Pro
- **Dashboard**: [Portfolio](https://hypurrscan.io/address/0xa049db4b3dfcb25c3092891010a629d987d26113)
- **Logs**: [Live Logs](https://35.190.43.182/logs/0xC0BE8E55f469c1a04c0F6d04356828C5793d8a9D)

### 2. DeepSeek R1
- **Status**: Paused
- **Seed**: $100
- **Model**: DeepSeek R1

### 3. Grok 4
- **Status**: Paused
- **Seed**: $100
- **Model**: Grok 4

**Insights**:
- GPT-5 Pro is performing best (still active)
- $200 seed is sufficient for live trading
- Multiple models can be tested in parallel
- Monitoring dashboard is essential

---

## Differences: Nocturne vs Our Agent

### Scope
| Aspect | Nocturne | Our Agent |
|--------|----------|-----------|
| Venues | 1 (Hyperliquid) | 4+ (Hyperliquid, Binance, dYdX, Uniswap) |
| Chains | 1 (Arbitrum) | 6+ (Arbitrum, Ethereum, Solana, Polygon, etc.) |
| LLM | 1 (OpenRouter) | 4+ (Dreams Router with fallbacks) |
| Indicators | External (TAAPI) | Internal (calculated) |
| Research | None | x402 (Indigo AI + Projects) |

### Architecture
| Aspect | Nocturne | Our Agent |
|--------|----------|-----------|
| Framework | Python | TypeScript + Daydreams |
| LLM Integration | Tool calling | Context composition |
| Risk Management | Per-position | Portfolio-level |
| Monitoring | Basic API | Advanced monitoring |
| Deployment | EigenCloud | TEE + multi-venue |

### Features
| Feature | Nocturne | Our Agent |
|---------|----------|-----------|
| Multi-venue | No | Yes |
| Venue selection | N/A | Smart selection |
| Cross-venue arbitrage | No | Yes |
| Liquidity aggregation | No | Yes |
| x402 payments | No | Yes (Dreams Router) |
| Research integration | No | Yes (x402) |

---

## Implementation Strategy

### Phase 1: Copy Nocturne's Approach (Week 1)
1. Study hyperliquid_api.py structure
2. Implement Hyperliquid adapter in TypeScript
3. Copy monitoring API pattern
4. Test with testnet

### Phase 2: Enhance with Daydreams (Week 2)
1. Replace OpenRouter with Dreams Router
2. Implement context composition
3. Add x402 research integration
4. Add balance management

### Phase 3: Multi-Venue Support (Week 3)
1. Add Binance adapter
2. Add dYdX adapter
3. Implement venue manager
4. Add venue selection logic

### Phase 4: Advanced Features (Week 4)
1. Cross-venue arbitrage
2. Liquidity aggregation
3. Advanced risk management
4. Performance optimization

---

## Code Structure Mapping

### Nocturne Structure
```
nocturne/
├── src/
│   ├── main.py
│   ├── agent/
│   │   └── decision_maker.py
│   ├── indicators/
│   │   └── taapi_client.py
│   ├── trading/
│   │   └── hyperliquid_api.py
│   └── config_loader.py
├── .env
└── poetry.lock
```

### Our Structure
```
trading-agent/
├── src/
│   ├── index.ts
│   ├── agent/
│   │   ├── contexts/
│   │   │   ├── market.ts
│   │   │   ├── research.ts
│   │   │   ├── portfolio.ts
│   │   │   ├── risk.ts
│   │   │   └── trading.ts
│   │   └── actions/
│   ├── exchange/
│   │   ├── venue-manager.ts
│   │   ├── hyperliquid.ts
│   │   ├── binance.ts
│   │   └── dydx.ts
│   ├── monitoring/
│   │   ├── api-server.ts
│   │   └── venue-health.ts
│   └── config/
│       └── index.ts
├── .env
└── package.json
```

---

## Lessons Learned

### What Nocturne Does Well

1. **Simple, Focused Design**
   - One venue, one clear purpose
   - Easy to understand and maintain
   - Proven in production

2. **Effective Monitoring**
   - API endpoints for diary and logs
   - Dashboard for portfolio tracking
   - Real-time visibility

3. **Robust Error Handling**
   - Graceful failures
   - Continues trading despite errors
   - Logs everything

4. **Clean Configuration**
   - Environment-based config
   - Easy to switch between testnet/mainnet
   - Secure key management

### What We're Improving

1. **Multi-Venue Support**
   - Trade on multiple exchanges
   - Automatic venue selection
   - Fallback mechanisms

2. **Advanced LLM Integration**
   - Dreams Router with fallbacks
   - x402 micropayments
   - Multi-provider support

3. **Comprehensive Research**
   - x402 Indigo AI integration
   - Project screening
   - Narrative analysis

4. **Portfolio-Level Risk**
   - Cross-venue risk management
   - Correlation tracking
   - Exposure limits

---

## Next Steps

1. **Clone Nocturne Repository**
   ```bash
   git clone https://github.com/Gajesh2007/ai-trading-agent.git
   cd ai-trading-agent
   ```

2. **Study Key Files**
   - `src/trading/hyperliquid_api.py` - Trading logic
   - `src/agent/decision_maker.py` - LLM integration
   - `src/main.py` - Main loop

3. **Adapt to TypeScript**
   - Translate Python patterns to TypeScript
   - Use Daydreams instead of OpenRouter
   - Implement multi-venue support

4. **Test on Hyperliquid Testnet**
   - Get testnet funds
   - Deploy agent
   - Monitor performance

5. **Scale to Mainnet**
   - Start with small amounts
   - Monitor carefully
   - Expand gradually

---

## Resources

- [Nocturne GitHub](https://github.com/Gajesh2007/ai-trading-agent)
- [Nocturne Architecture Docs](https://github.com/Gajesh2007/ai-trading-agent/blob/master/docs/ARCHITECTURE.md)
- [Hyperliquid API Docs](https://hyperliquid.gitbook.io/hyperliquid-docs/api)
- [Hyperliquid SDK](https://github.com/hyperliquid-dex/hyperliquid-python-sdk)

---

**We're building on Nocturne's proven foundation while adding multi-venue, multi-chain, and advanced research capabilities! 🚀**
