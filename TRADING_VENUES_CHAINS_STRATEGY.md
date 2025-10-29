# Trading Venues & Chains Strategy

## Overview

Your agent will trade on multiple venues across different chains, learning from the Hyperliquid implementation while expanding to other high-quality trading platforms.

---

## Supported Trading Venues

### Tier 1: Primary Venues (Start Here)

#### 1. Hyperliquid (Decentralized Futures)
**Why**: 
- Native on-chain (Arbitrum)
- High leverage (up to 50x)
- Low fees (0.02% maker, 0.05% taker)
- Deep liquidity
- Proven by Nocturne agent

**Supported Assets**: BTC, ETH, SOL, AVAX, ARB, OP, and 100+ altcoins

**Key Features**:
- Perpetual futures
- Spot trading
- Cross-margin
- Subaccounts for risk isolation

**Integration**:
```typescript
// src/exchange/hyperliquid.ts
import { HyperliquidClient } from "@hyperliquid/sdk"

export class HyperliquidAdapter {
  private client: HyperliquidClient
  
  async initialize(privateKey: string) {
    this.client = new HyperliquidClient({
      privateKey,
      testnet: false // or true for testnet
    })
  }
  
  async getBalance() {
    return this.client.getBalance()
  }
  
  async placeOrder(symbol: string, side: "buy" | "sell", size: number, price?: number) {
    return this.client.placeOrder({
      symbol,
      side,
      size,
      price,
      orderType: price ? "limit" : "market"
    })
  }
  
  async closePosition(symbol: string) {
    return this.client.closePosition(symbol)
  }
}
```

#### 2. Binance Futures (Centralized Futures)
**Why**:
- Largest crypto exchange
- Highest liquidity
- 125x leverage available
- Extensive API
- Familiar to traders

**Supported Assets**: 500+ trading pairs

**Key Features**:
- Perpetual futures
- Spot trading
- Margin trading
- Isolated margin

**Integration**:
```typescript
// src/exchange/binance.ts
import { Binance } from "ccxt"

export class BinanceAdapter {
  private exchange: Binance
  
  async initialize(apiKey: string, apiSecret: string) {
    this.exchange = new Binance({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      options: {
        defaultType: "future"
      }
    })
  }
  
  async getBalance() {
    return this.exchange.fetch_balance()
  }
  
  async placeOrder(symbol: string, side: string, amount: number, price?: number) {
    return this.exchange.create_order(
      symbol,
      price ? "limit" : "market",
      side,
      amount,
      price
    )
  }
}
```

#### 3. dYdX (Decentralized Perpetuals)
**Why**:
- Pure on-chain (Cosmos chain)
- Non-custodial
- Deep liquidity
- Institutional-grade
- Growing ecosystem

**Supported Assets**: BTC, ETH, SOL, and 50+ altcoins

**Key Features**:
- Perpetual futures
- Cross-margin
- Subaccounts
- Native chain integration

---

### Tier 2: Secondary Venues (Expand Later)

#### 4. Kraken Futures
- Regulated exchange
- Good liquidity
- Lower leverage (50x max)
- Institutional support

#### 5. Bybit
- High leverage (100x)
- Good API
- Growing liquidity
- Asian market focus

#### 6. OKX
- Large exchange
- Multiple chains
- Good API
- Asian market strength

#### 7. Uniswap V4 (DEX)
- Decentralized spot trading
- Concentrated liquidity
- Lower slippage
- Composable pools

---

## Supported Chains

### Primary Chains

```
HYPERLIQUID (Arbitrum)
├─ Venue: Hyperliquid
├─ Type: Decentralized futures
├─ Leverage: Up to 50x
├─ Fees: 0.02-0.05%
└─ Settlement: On-chain

ETHEREUM MAINNET
├─ Venues: Uniswap, 1inch, Curve
├─ Type: Spot DEX
├─ Leverage: None (spot)
├─ Fees: 0.01-0.30%
└─ Settlement: On-chain

ARBITRUM
├─ Venues: Camelot, GMX
├─ Type: Spot DEX, Perpetuals
├─ Leverage: Up to 50x (GMX)
├─ Fees: 0.01-0.10%
└─ Settlement: On-chain

SOLANA
├─ Venues: Marinade, Orca, Raydium
├─ Type: Spot DEX
├─ Leverage: None (spot)
├─ Fees: 0.001-0.10%
└─ Settlement: On-chain

POLYGON
├─ Venues: QuickSwap, Aave
├─ Type: Spot DEX
├─ Leverage: None (spot)
├─ Fees: 0.01-0.30%
└─ Settlement: On-chain

BINANCE CHAIN
├─ Venues: PancakeSwap, Binance DEX
├─ Type: Spot DEX
├─ Leverage: None (spot)
├─ Fees: 0.001-0.10%
└─ Settlement: On-chain
```

---

## Multi-Venue Architecture

### Venue Manager

```typescript
// src/exchange/venue-manager.ts
export class VenueManager {
  private venues: Map<string, ExchangeAdapter> = new Map()
  
  async initialize() {
    // Initialize all venues
    this.venues.set("hyperliquid", new HyperliquidAdapter())
    this.venues.set("binance", new BinanceAdapter())
    this.venues.set("dydx", new DydxAdapter())
    
    await Promise.all(
      Array.from(this.venues.values()).map(v => v.initialize())
    )
  }
  
  async getVenue(name: string): Promise<ExchangeAdapter> {
    const venue = this.venues.get(name)
    if (!venue) throw new Error(`Venue ${name} not found`)
    return venue
  }
  
  async getBestVenue(symbol: string, side: "buy" | "sell"): Promise<string> {
    // Compare liquidity, fees, spreads across venues
    // Return venue with best execution
    const prices = await Promise.all(
      Array.from(this.venues.entries()).map(async ([name, venue]) => {
        try {
          const price = await venue.getPrice(symbol)
          return { name, price }
        } catch {
          return null
        }
      })
    )
    
    const validPrices = prices.filter(p => p !== null)
    if (side === "buy") {
      return validPrices.reduce((best, current) =>
        current.price < best.price ? current : best
      ).name
    } else {
      return validPrices.reduce((best, current) =>
        current.price > best.price ? current : best
      ).name
    }
  }
  
  async executeTrade(
    venue: string,
    symbol: string,
    side: "buy" | "sell",
    size: number,
    price?: number
  ) {
    const adapter = await this.getVenue(venue)
    return adapter.placeOrder(symbol, side, size, price)
  }
}
```

### Multi-Venue Trading Context

```typescript
// src/agent/contexts/multi-venue-trading.ts
export const multiVenueTradingContext = context({
  type: "multi-venue-trading",
  schema: z.object({
    symbol: z.string(),
    accountId: z.string()
  }),
  create: () => ({
    venues: {},
    balances: {},
    positions: {},
    bestVenue: null
  })
}).use((state) => [
  { context: marketContext, args: { symbol: state.args.symbol } },
  { context: researchContext, args: { symbol: state.args.symbol } },
  { context: portfolioContext, args: { accountId: state.args.accountId } },
  { context: riskContext, args: { accountId: state.args.accountId } }
])
```

---

## Venue Selection Strategy

### Factors for Venue Selection

```typescript
interface VenueSelectionCriteria {
  symbol: string
  side: "buy" | "sell"
  size: number
  urgency: "low" | "medium" | "high"
  riskTolerance: "low" | "medium" | "high"
}

function selectVenue(criteria: VenueSelectionCriteria): string {
  // 1. Check if symbol available on venue
  if (!criteria.symbol in venue.supportedAssets) {
    return null
  }
  
  // 2. Check liquidity
  const liquidity = venue.getLiquidity(criteria.symbol)
  if (liquidity < criteria.size * 2) {
    return null // Not enough liquidity
  }
  
  // 3. Compare fees
  const fees = venue.calculateFees(criteria.size)
  
  // 4. Compare slippage
  const slippage = venue.estimateSlippage(criteria.symbol, criteria.size)
  
  // 5. Check leverage availability
  if (criteria.riskTolerance === "high") {
    prefer venues with high leverage
  }
  
  // 6. Return best venue
  return selectBestVenue(fees, slippage, liquidity)
}
```

### Venue Priority Matrix

```
HYPERLIQUID
├─ Best for: Futures trading, leverage
├─ Leverage: 50x
├─ Fees: 0.02-0.05%
├─ Assets: 100+
└─ Priority: 1 (primary)

BINANCE
├─ Best for: Spot + futures, high volume
├─ Leverage: 125x
├─ Fees: 0.02-0.10%
├─ Assets: 500+
└─ Priority: 2 (secondary)

DYDX
├─ Best for: Decentralized, non-custodial
├─ Leverage: 20x
├─ Fees: 0.01-0.05%
├─ Assets: 50+
└─ Priority: 3 (tertiary)

UNISWAP
├─ Best for: Spot trading, low slippage
├─ Leverage: None
├─ Fees: 0.01-0.30%
├─ Assets: 1000+
└─ Priority: 4 (DEX)
```

---

## Learning from Nocturne Agent

### Key Insights from Hyperliquid Implementation

#### 1. Architecture Pattern
```
main.py (entry point)
  ↓
decision_maker.py (LLM logic)
  ↓
taapi_client.py (indicators)
  ↓
hyperliquid_api.py (execution)
```

**Our Adaptation**:
```
main.ts (entry point)
  ↓
trading-context.ts (LLM logic via Dreams Router)
  ↓
market-context.ts (indicators)
  ↓
venue-manager.ts (multi-venue execution)
```

#### 2. Tool Calling Pattern
Nocturne uses tool calling to fetch indicators dynamically:
```
LLM: "I need RSI"
  ↓
Tool Call: fetch_rsi(symbol, period)
  ↓
TAAPI: Returns RSI value
  ↓
LLM: Makes decision based on RSI
```

**Our Implementation**:
```
LLM: "I need technical analysis"
  ↓
Market Context: Calculates all indicators
  ↓
Research Context: Queries x402 for narratives
  ↓
LLM: Makes decision with full context
```

#### 3. Monitoring & Logging
Nocturne exposes API endpoints for monitoring:
- `/diary` - Trading decisions log
- `/logs` - System logs

**Our Implementation**:
```typescript
// src/monitoring/api-server.ts
app.get("/diary", (req, res) => {
  // Return recent trading decisions
})

app.get("/logs", (req, res) => {
  // Return system logs
})

app.get("/portfolio", (req, res) => {
  // Return portfolio state
})

app.get("/venues", (req, res) => {
  // Return venue status
})
```

#### 4. Deployment Pattern
Nocturne uses EigenCloud for TEE deployment:
```
Local Development
  ↓
Docker containerization
  ↓
EigenCloud deployment (TEE)
  ↓
Live trading with secure keys
```

**Our Implementation**:
```
Local Development
  ↓
Docker containerization
  ↓
Multi-venue support
  ↓
EigenCloud or similar TEE
  ↓
Live trading across venues
```

---

## Configuration Structure

### .env Setup for Multi-Venue

```bash
# HYPERLIQUID
HYPERLIQUID_PRIVATE_KEY=0x...
HYPERLIQUID_TESTNET=false

# BINANCE
BINANCE_API_KEY=...
BINANCE_API_SECRET=...

# DYDX
DYDX_PRIVATE_KEY=0x...
DYDX_CHAIN_ID=cosmoshub-1

# UNISWAP
UNISWAP_ROUTER_ADDRESS=0x...
UNISWAP_SLIPPAGE=0.5  # 0.5%

# GENERAL
ACTIVE_VENUES=hyperliquid,binance,dydx
PRIMARY_VENUE=hyperliquid
FALLBACK_VENUES=binance,dydx

# DREAMS ROUTER
DREAMS_ROUTER_URL=https://router.daydreams.systems
X402_WALLET_ADDRESS=0x...
X402_PRIVATE_KEY=0x...

# MONITORING
API_HOST=0.0.0.0
API_PORT=3000
LOG_LEVEL=info
```

---

## Implementation Roadmap

### Phase 1: Hyperliquid Foundation (Week 1)
- [ ] Implement Hyperliquid adapter
- [ ] Copy Nocturne's architecture pattern
- [ ] Set up monitoring API
- [ ] Test with small amounts

### Phase 2: Multi-Venue Support (Week 2)
- [ ] Add Binance adapter
- [ ] Add dYdX adapter
- [ ] Implement venue manager
- [ ] Add venue selection logic

### Phase 3: Advanced Features (Week 3)
- [ ] Cross-venue arbitrage
- [ ] Liquidity aggregation
- [ ] Best execution algorithm
- [ ] Risk management across venues

### Phase 4: Optimization (Week 4)
- [ ] Performance tuning
- [ ] Fee optimization
- [ ] Slippage minimization
- [ ] Deployment to TEE

---

## Risk Management Across Venues

### Per-Venue Limits

```typescript
interface VenueLimits {
  maxPositionSize: number
  maxLeverage: number
  maxDailyVolume: number
  maxDrawdown: number
}

const venueLimits = {
  hyperliquid: {
    maxPositionSize: 50000,  // $50k
    maxLeverage: 20,         // 20x
    maxDailyVolume: 100000,  // $100k
    maxDrawdown: 0.20        // 20%
  },
  binance: {
    maxPositionSize: 100000, // $100k
    maxLeverage: 50,         // 50x
    maxDailyVolume: 200000,  // $200k
    maxDrawdown: 0.25        // 25%
  },
  dydx: {
    maxPositionSize: 25000,  // $25k
    maxLeverage: 10,         // 10x
    maxDailyVolume: 50000,   // $50k
    maxDrawdown: 0.15        // 15%
  }
}
```

### Portfolio-Level Risk

```typescript
interface PortfolioRisk {
  totalExposure: number
  totalLeverage: number
  correlationRisk: number
  venueConcentration: Map<string, number>
}

// Limits
const portfolioLimits = {
  maxTotalExposure: 500000,      // $500k
  maxAverageLeverage: 15,        // 15x average
  maxVenueConcentration: 0.50,   // 50% in one venue
  maxCorrelation: 0.70           // 70% correlation
}
```

---

## Monitoring & Alerts

### Venue Health Monitoring

```typescript
interface VenueHealth {
  name: string
  status: "healthy" | "degraded" | "down"
  latency: number
  errorRate: number
  liquidity: number
  uptime: number
}

// Monitor every minute
async function monitorVenues() {
  for (const venue of venues) {
    const health = await checkVenueHealth(venue)
    
    if (health.status === "down") {
      alert(`Venue ${venue} is down!`)
      // Failover to backup venue
    }
    
    if (health.errorRate > 0.05) {
      alert(`High error rate on ${venue}`)
    }
    
    if (health.latency > 5000) {
      alert(`High latency on ${venue}`)
    }
  }
}
```

---

## File Structure

```
src/
├── exchange/
│   ├── venue-manager.ts          # Multi-venue orchestration
│   ├── hyperliquid.ts            # Hyperliquid adapter
│   ├── binance.ts                # Binance adapter
│   ├── dydx.ts                   # dYdX adapter
│   ├── uniswap.ts                # Uniswap adapter
│   └── types.ts                  # Exchange interfaces
│
├── agent/
│   ├── contexts/
│   │   ├── multi-venue-trading.ts
│   │   └── venue-selection.ts
│   └── actions/
│       ├── execute-multi-venue.ts
│       └── rebalance-venues.ts
│
├── monitoring/
│   ├── venue-health.ts           # Venue monitoring
│   ├── api-server.ts             # Monitoring API
│   └── alerts.ts                 # Alert system
│
└── config/
    ├── venues.config.ts          # Venue configuration
    └── limits.config.ts          # Risk limits per venue
```

---

## Comparison: Nocturne vs Our Agent

| Aspect | Nocturne | Our Agent |
|--------|----------|-----------|
| Venues | Hyperliquid only | Multi-venue (Hyperliquid, Binance, dYdX, etc.) |
| LLM | OpenRouter | Dreams Router (multi-provider) |
| Indicators | TAAPI | Native + x402 research |
| Chains | Arbitrum only | Multi-chain support |
| Monitoring | Basic API | Advanced monitoring + alerts |
| Risk Mgmt | Single venue | Portfolio-level risk |
| Deployment | EigenCloud | TEE + multi-venue |

---

## Next Steps

1. **Study Nocturne Code**
   - Review hyperliquid_api.py structure
   - Understand decision_maker.py pattern
   - Learn monitoring approach

2. **Implement Hyperliquid Adapter**
   - Copy Nocturne's approach
   - Adapt to TypeScript/Daydreams
   - Test with testnet

3. **Add Multi-Venue Support**
   - Implement venue manager
   - Add Binance adapter
   - Add dYdX adapter

4. **Deploy & Monitor**
   - Set up monitoring API
   - Deploy to testnet
   - Scale to mainnet

---

## Resources

- [Nocturne GitHub](https://github.com/Gajesh2007/ai-trading-agent)
- [Hyperliquid Docs](https://hyperliquid.gitbook.io/hyperliquid-docs)
- [Hyperliquid API](https://hyperliquid.gitbook.io/hyperliquid-docs/api)
- [dYdX Docs](https://dydx.exchange/docs)
- [Binance API](https://binance-docs.github.io/apidocs/)
- [Uniswap V4](https://uniswap.org/blog/uniswap-v4)

---

**Your agent will be the most advanced multi-venue AI trading system! 🚀**
