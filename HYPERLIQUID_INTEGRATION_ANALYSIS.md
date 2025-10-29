# Hyperliquid Integration Analysis

## Executive Summary

I've thoroughly studied the **Nocturne** implementation (Gajesh2007/ai-trading-agent) - a proven, live trading agent on Hyperliquid. This document outlines:

1. **What Nocturne does right** - Architecture patterns to adopt
2. **What's missing in our Daydreams implementation** - Critical gaps
3. **Next steps** - Concrete actions to integrate Hyperliquid trading

---

## Nocturne Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│ main.py (Entry Point)                                   │
│ - CLI args: --assets BTC ETH --interval 1h             │
│ - Main trading loop (async)                             │
│ - Event logging & diary                                 │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ TradingAgent (decision_maker.py)                        │
│ - LLM orchestration (OpenRouter)                        │
│ - Tool calling for indicators (TAAPI)                  │
│ - Structured prompting with system rules                │
│ - Output validation & retry logic                       │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ HyperliquidAPI (hyperliquid_api.py)                     │
│ - Exchange client wrapper                               │
│ - Async retry helpers                                   │
│ - Order management                                      │
│ - Position tracking                                     │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ TAAPIClient (taapi_client.py)                           │
│ - Technical indicators (RSI, MACD, EMA, ATR, etc.)     │
│ - Called via tool calling from LLM                      │
└─────────────────────────────────────────────────────────┘
```

### Key Design Patterns

#### 1. **Structured Prompting with System Rules**

Nocturne uses a sophisticated system prompt that encodes trading discipline:

```python
system_prompt = """
You are a rigorous QUANTITATIVE TRADER...

Core policy (low-churn, position-aware):
1) Respect prior plans: Don't close early unless invalidation occurs
2) Hysteresis: Require stronger evidence to CHANGE than to KEEP
3) Cooldown: 3 bars minimum before direction change
4) Funding is a tilt, not a trigger
5) Overbought/oversold ≠ reversal by itself
6) Prefer adjustments over exits

Decision discipline (per asset):
- Choose one: buy / sell / hold
- Provide rationale, entry/exit prices, position size
"""
```

**Key insight:** The system prompt is the "trading strategy" - it encodes risk management, position management, and decision discipline.

#### 2. **Context Payload Structure**

Each LLM call includes:

```python
context_payload = {
    "invocation": {
        "minutes_since_start": float,
        "current_time": ISO-8601,
        "invocation_count": int
    },
    "account": {
        "total_value": float,
        "balance": float,
        "positions": [
            {
                "symbol": "BTC",
                "size": float,
                "entry_price": float,
                "current_price": float,
                "pnl": float,
                "pnl_pct": float
            }
        ],
        "active_trades": [
            {
                "asset": "BTC",
                "is_long": bool,
                "amount": float,
                "entry_price": float,
                "tp_oid": str,
                "sl_oid": str,
                "exit_plan": str  # ← Encodes cooldown, invalidation conditions
            }
        ]
    },
    "market_data": {
        "BTC": {
            "5m_indicators": {...},  # RSI, MACD, EMA, ATR
            "4h_indicators": {...},  # Higher timeframe
            "recent_mid_prices": [...],
            "funding_rate": float,
            "open_interest": float
        }
    },
    "instructions": {
        "assets": ["BTC", "ETH"],
        "requirement": "Decide actions for all assets..."
    }
}
```

**Key insight:** The context is comprehensive and time-aware. The LLM has all information needed to make decisions.

#### 3. **Tool Calling for Indicators**

The LLM can call tools to fetch indicators:

```python
# LLM calls: "get_indicator(asset='BTC', indicator='RSI', timeframe='5m')"
# Agent fetches from TAAPI and returns result
```

**Key insight:** Dynamic indicator fetching allows the LLM to ask for specific data.

#### 4. **Exit Plans with Cooldown**

Trades encode exit conditions:

```python
exit_plan = "close if 4h close above EMA50; cooldown_bars:3 until 2025-10-19T15:55Z"
```

**Key insight:** The agent respects its own prior decisions (hysteresis) and enforces cooldowns to prevent churn.

#### 5. **Async Retry Helpers**

```python
async def _retry(self, fn, *args, max_attempts=3, backoff_base=0.5, reset_on_fail=True):
    """Retry with exponential backoff and client reset on failure."""
```

**Key insight:** Robust error handling for network issues.

#### 6. **Event Logging & Diary**

```python
def add_event(msg: str):
    """Log event and push to recent_events deque."""
    logging.info(msg)
    recent_events.append(msg)

# Diary saved to diary.jsonl for analysis
```

**Key insight:** Full audit trail of decisions and reasoning.

---

## Our Daydreams Implementation - What's Missing

### Critical Gaps

#### 1. **No Hyperliquid Integration**
- ❌ No HyperliquidAPI wrapper
- ❌ No order execution on Hyperliquid
- ❌ No position tracking
- ❌ No funding rate consideration

#### 2. **No Technical Indicators**
- ❌ No TAAPI integration
- ❌ No RSI, MACD, EMA, ATR calculations
- ❌ No multi-timeframe analysis

#### 3. **Weak System Prompt**
- ❌ No trading discipline rules
- ❌ No position management strategy
- ❌ No cooldown/hysteresis logic
- ❌ No risk management constraints

#### 4. **No Exit Plans**
- ❌ Trades don't encode exit conditions
- ❌ No cooldown tracking
- ❌ No invalidation conditions

#### 5. **No Context Payload**
- ❌ LLM doesn't get structured market data
- ❌ No position history
- ❌ No active trade tracking
- ❌ No funding rate data

#### 6. **No Async Retry Logic**
- ❌ No exponential backoff
- ❌ No client reset on failure
- ❌ Fragile error handling

#### 7. **No Event Logging**
- ❌ No decision diary
- ❌ No audit trail
- ❌ No performance tracking

#### 8. **No Multi-Asset Support**
- ❌ Agent decides on one asset at a time
- ❌ No portfolio-level optimization
- ❌ No cross-asset correlation

---

## What We Need to Add

### Phase 1: Hyperliquid Integration (Critical)

#### 1.1 Create HyperliquidAPI Wrapper

**File:** `src/agent/hyperliquid-client.ts`

```typescript
import { Exchange, Info } from '@hyperliquid/sdk'
import { Wallet } from 'ethers'

export class HyperliquidClient {
  private exchange: Exchange
  private info: Info
  private wallet: Wallet

  constructor(privateKey: string) {
    this.wallet = new Wallet(privateKey)
    this.exchange = new Exchange(this.wallet)
    this.info = new Info()
  }

  // Get user state (balance, positions, active orders)
  async getUserState(): Promise<{
    balance: number
    positions: Position[]
    orders: Order[]
  }> {
    const state = await this.info.getUserState(this.wallet.address)
    return {
      balance: state.balance,
      positions: state.positions,
      orders: state.orders
    }
  }

  // Get current price for an asset
  async getCurrentPrice(asset: string): Promise<number> {
    const data = await this.info.getCandles(asset, '1m')
    return data[data.length - 1].close
  }

  // Place order
  async placeOrder(asset: string, isBuy: boolean, size: number, price?: number): Promise<OrderResult> {
    const order = {
      asset,
      isBuy,
      size,
      price,
      orderType: price ? 'limit' : 'market'
    }
    return await this.exchange.placeOrder(order)
  }

  // Close position
  async closePosition(asset: string): Promise<OrderResult> {
    const state = await this.getUserState()
    const position = state.positions.find(p => p.asset === asset)
    if (!position) return { success: false }
    
    return await this.placeOrder(asset, !position.isBuy, position.size)
  }

  // Get funding rate
  async getFundingRate(asset: string): Promise<number> {
    const data = await this.info.getMetaData()
    return data.assets.find(a => a.name === asset)?.fundingRate || 0
  }
}
```

#### 1.2 Create Indicators Client

**File:** `src/agent/indicators-client.ts`

```typescript
import axios from 'axios'

export class IndicatorsClient {
  private apiKey: string
  private baseUrl = 'https://api.taapi.io'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async getIndicators(asset: string, interval: string): Promise<{
    rsi: number
    macd: { value: number; signal: number; histogram: number }
    ema20: number
    ema50: number
    atr: number
  }> {
    const params = {
      secret: this.apiKey,
      exchange: 'hyperliquid',
      symbol: `${asset}USDT`,
      interval
    }

    const [rsi, macd, ema20, ema50, atr] = await Promise.all([
      this.fetch('rsi', params),
      this.fetch('macd', params),
      this.fetch('ema', { ...params, period: 20 }),
      this.fetch('ema', { ...params, period: 50 }),
      this.fetch('atr', params)
    ])

    return { rsi, macd, ema20, ema50, atr }
  }

  private async fetch(indicator: string, params: any) {
    const response = await axios.get(`${this.baseUrl}/${indicator}`, { params })
    return response.data.value
  }
}
```

### Phase 2: Enhanced Decision Making

#### 2.1 Update System Prompt

**File:** `src/agent/system-prompt.ts`

```typescript
export const TRADING_SYSTEM_PROMPT = `
You are a rigorous QUANTITATIVE TRADER optimizing risk-adjusted returns on Hyperliquid perpetuals.

CORE POLICY (Low-Churn, Position-Aware):
1) Respect prior plans: Don't close early unless invalidation occurs
2) Hysteresis: Require stronger evidence to CHANGE than to KEEP
3) Cooldown: 3 bars minimum before direction change
4) Funding is a tilt, not a trigger
5) Overbought/oversold ≠ reversal by itself
6) Prefer adjustments over exits

DECISION DISCIPLINE (Per Asset):
- Choose one: BUY / SELL / HOLD
- Provide:
  * rationale (1-2 sentences)
  * entry_price (if BUY/SELL)
  * take_profit (if BUY/SELL)
  * stop_loss (if BUY/SELL)
  * position_size (% of account)
  * exit_plan (conditions to close, cooldown duration)

RISK MANAGEMENT:
- Max position size: 5% of account per trade
- Max leverage: 5x
- Stop loss: Always set
- Take profit: Always set
- Funding rate: Consider if > 0.25% per 8h

CONTEXT PROVIDED:
- Account state (balance, positions, active trades)
- Market data (5m and 4h indicators)
- Active trades with exit plans
- Recent trading history

Make decisive, first-principles decisions that minimize churn while capturing edge.
`
```

#### 2.2 Create Context Builder

**File:** `src/agent/context-builder.ts`

```typescript
import { HyperliquidClient } from './hyperliquid-client'
import { IndicatorsClient } from './indicators-client'

export class ContextBuilder {
  constructor(
    private hyperliquid: HyperliquidClient,
    private indicators: IndicatorsClient
  ) {}

  async buildContext(assets: string[]): Promise<any> {
    const state = await this.hyperliquid.getUserState()
    const marketData = {}

    for (const asset of assets) {
      const [indicators5m, indicators4h, price, fundingRate] = await Promise.all([
        this.indicators.getIndicators(asset, '5m'),
        this.indicators.getIndicators(asset, '4h'),
        this.hyperliquid.getCurrentPrice(asset),
        this.hyperliquid.getFundingRate(asset)
      ])

      marketData[asset] = {
        indicators_5m: indicators5m,
        indicators_4h: indicators4h,
        current_price: price,
        funding_rate: fundingRate
      }
    }

    return {
      invocation: {
        timestamp: new Date().toISOString(),
        assets
      },
      account: {
        balance: state.balance,
        positions: state.positions,
        active_trades: this.extractActiveTrades(state.positions)
      },
      market_data: marketData
    }
  }

  private extractActiveTrades(positions: any[]): any[] {
    return positions.map(pos => ({
      asset: pos.asset,
      is_long: pos.isBuy,
      size: pos.size,
      entry_price: pos.entryPrice,
      current_price: pos.currentPrice,
      pnl: pos.pnl,
      exit_plan: pos.exitPlan || 'none'
    }))
  }
}
```

### Phase 3: Trade Execution

#### 3.1 Create Trade Executor

**File:** `src/agent/trade-executor.ts`

```typescript
import { HyperliquidClient } from './hyperliquid-client'

export interface TradeDecision {
  asset: string
  action: 'BUY' | 'SELL' | 'HOLD'
  entry_price?: number
  take_profit?: number
  stop_loss?: number
  position_size?: number
  rationale: string
  exit_plan?: string
}

export class TradeExecutor {
  constructor(private hyperliquid: HyperliquidClient) {}

  async executeTrade(decision: TradeDecision): Promise<any> {
    const { asset, action, entry_price, position_size } = decision

    if (action === 'HOLD') {
      return { success: true, message: 'Holding' }
    }

    const state = await this.hyperliquid.getUserState()
    const currentPosition = state.positions.find(p => p.asset === asset)

    if (action === 'BUY' && !currentPosition) {
      // Open long
      return await this.hyperliquid.placeOrder(asset, true, position_size, entry_price)
    } else if (action === 'SELL' && !currentPosition) {
      // Open short
      return await this.hyperliquid.placeOrder(asset, false, position_size, entry_price)
    } else if (action === 'SELL' && currentPosition?.isBuy) {
      // Close long
      return await this.hyperliquid.closePosition(asset)
    } else if (action === 'BUY' && !currentPosition?.isBuy) {
      // Close short
      return await this.hyperliquid.closePosition(asset)
    }

    return { success: false, message: 'Invalid action' }
  }
}
```

### Phase 4: Event Logging & Diary

#### 4.1 Create Event Logger

**File:** `src/agent/event-logger.ts`

```typescript
import * as fs from 'fs'

export class EventLogger {
  private events: string[] = []
  private diaryPath: string

  constructor(diaryPath: string = 'diary.jsonl') {
    this.diaryPath = diaryPath
  }

  log(message: string): void {
    const timestamp = new Date().toISOString()
    const entry = `[${timestamp}] ${message}`
    this.events.push(entry)
    console.log(entry)
  }

  logDecision(decision: any): void {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'decision',
      data: decision
    }
    fs.appendFileSync(this.diaryPath, JSON.stringify(entry) + '\n')
    this.log(`Decision: ${decision.asset} ${decision.action}`)
  }

  logTrade(trade: any): void {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'trade',
      data: trade
    }
    fs.appendFileSync(this.diaryPath, JSON.stringify(entry) + '\n')
    this.log(`Trade: ${trade.asset} ${trade.action}`)
  }

  getRecentEvents(count: number = 50): string[] {
    return this.events.slice(-count)
  }
}
```

---

## Integration Roadmap

### Week 1: Foundation
- [ ] Create HyperliquidAPI wrapper
- [ ] Create IndicatorsClient (TAAPI integration)
- [ ] Add system prompt with trading discipline
- [ ] Create context builder

### Week 2: Execution
- [ ] Create trade executor
- [ ] Add event logging & diary
- [ ] Implement async retry helpers
- [ ] Add error handling

### Week 3: Testing
- [ ] Test on Hyperliquid testnet
- [ ] Validate decision making
- [ ] Monitor for edge cases
- [ ] Optimize performance

### Week 4: Production
- [ ] Deploy to mainnet
- [ ] Monitor live trading
- [ ] Collect performance data
- [ ] Iterate on strategy

---

## Key Differences: Nocturne vs. Our Implementation

| Aspect | Nocturne | Ours (Current) | Ours (Target) |
|--------|----------|----------------|---------------|
| **Hyperliquid Integration** | ✅ Full | ❌ None | ✅ Full |
| **Indicators** | ✅ TAAPI | ❌ None | ✅ TAAPI |
| **System Prompt** | ✅ Sophisticated | ❌ Basic | ✅ Sophisticated |
| **Position Management** | ✅ Exit plans | ❌ None | ✅ Exit plans |
| **Multi-Asset** | ✅ Yes | ❌ Single | ✅ Yes |
| **Event Logging** | ✅ Full diary | ❌ Basic | ✅ Full diary |
| **Async Retry** | ✅ Robust | ❌ Basic | ✅ Robust |
| **Funding Rate** | ✅ Considered | ❌ No | ✅ Considered |

---

## Critical Success Factors

1. **System Prompt Discipline** - The prompt IS the strategy. Invest time here.
2. **Position Management** - Exit plans prevent churn and enforce hysteresis.
3. **Context Quality** - Better context = better decisions.
4. **Error Handling** - Hyperliquid API can be flaky. Retry logic is essential.
5. **Event Logging** - You need to see what the agent is thinking.

---

## Next Steps (Immediate)

1. **Create HyperliquidAPI wrapper** - Start with basic order placement
2. **Integrate TAAPI** - Fetch indicators for decision making
3. **Update system prompt** - Add trading discipline rules
4. **Build context payload** - Provide LLM with market data
5. **Test on testnet** - Validate before mainnet

---

## Resources

- **Nocturne Repo:** https://github.com/Gajesh2007/ai-trading-agent
- **Hyperliquid SDK:** https://github.com/hyperliquid-dex/hyperliquid-python-sdk
- **TAAPI:** https://taapi.io/
- **OpenRouter:** https://openrouter.ai/

---

**Ready to build the most sophisticated trading agent on Hyperliquid! 🚀**
