# Daydreams + Hyperliquid Integration Strategy

## Executive Summary

After thoroughly studying both the **Nocturne** implementation and the **Daydreams framework**, I've identified how to integrate Hyperliquid trading **within** the Daydreams architecture - not as a separate system, but as composable contexts and actions.

**Key insight:** Daydreams' context composition pattern is PERFECT for trading agents. We don't need a rebuild - we need to leverage the framework's design.

---

## Daydreams Core Concepts (Relevant to Trading)

### 1. **Context System** - Isolated Stateful Workspaces

```typescript
const tradingContext = context({
  type: "trading",
  schema: z.object({
    asset: z.string(),
    timeframe: z.enum(["5m", "1h", "4h"])
  }),
  create: () => ({
    positions: [],
    trades: [],
    balance: 0,
    pnl: 0
  }),
  render: (state) => `Trading ${state.args.asset} | Balance: $${state.memory.balance}`
})
```

**For trading:** Each asset or strategy gets its own isolated context with its own memory.

### 2. **Action System** - Type-Safe Functions

```typescript
const placeOrder = action({
  name: "place-order",
  description: "Place an order on Hyperliquid",
  schema: z.object({
    asset: z.string(),
    side: z.enum(["buy", "sell"]),
    size: z.number(),
    price: z.number().optional()
  }),
  handler: async ({ asset, side, size, price }, ctx) => {
    const result = await hyperliquid.placeOrder(asset, side, size, price)
    ctx.memory.trades.push(result)
    return result
  }
})
```

**For trading:** Actions execute trades, fetch data, manage positions.

### 3. **Context Composition** - Combine Contexts

```typescript
const portfolioContext = context({
  type: "portfolio",
  create: () => ({ assets: [], totalValue: 0 }),
  // 🌟 The magic: compose multiple trading contexts
  use: (state) => [
    { context: tradingContext, args: { asset: "BTC", timeframe: "5m" } },
    { context: tradingContext, args: { asset: "ETH", timeframe: "5m" } },
    { context: technicalContext, args: { assets: ["BTC", "ETH"] } }
  ]
})
```

**For trading:** Portfolio context composes individual asset contexts + technical analysis context.

### 4. **Memory System** - Dual-Tier Storage

- **Working Memory:** Temporary execution state (current decision, inputs)
- **Context Memory:** Persistent data (positions, trades, balance)

**For trading:** Working memory = current analysis, Context memory = position history.

### 5. **Dreams Router + x402** - Universal AI Gateway with Payments

```typescript
const { dreamsRouter } = await createDreamsRouterAuth(account, {
  payments: {
    amount: "100000", // $0.10 USDC per request
    network: "base-sepolia"
  }
})

// Use any model through one API
const models = [
  dreamsRouter("openai/gpt-4o"),
  dreamsRouter("anthropic/claude-3-5-sonnet"),
  dreamsRouter("groq/llama-3.1-405b-reasoning")
]
```

**For trading:** We already use this! x402 router for LLM calls with micropayments.

---

## Hyperliquid Integration Within Daydreams

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│ Portfolio Context (Composed)                             │
│ - Tracks total balance, PnL, active positions           │
│ - Composes multiple asset contexts                      │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ Asset Context (BTC, ETH, etc.)                          │
│ - Isolated state per asset                              │
│ - Tracks positions, exit plans, cooldowns               │
│ - Composes technical context                            │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ Technical Context                                        │
│ - Indicators (RSI, MACD, EMA, ATR)                      │
│ - Market data (5m, 4h candles)                          │
│ - Funding rates                                         │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ Actions (Hyperliquid Operations)                        │
│ - place-order, close-position, get-balance             │
│ - fetch-indicators, get-funding-rate                    │
│ - update-exit-plan, track-trade                         │
└─────────────────────────────────────────────────────────┘
```

### Implementation Strategy (No Rebuild Required)

#### Step 1: Create Hyperliquid Extension

**File:** `src/extensions/hyperliquid-extension.ts`

```typescript
import { HyperliquidAPI } from '../agent/hyperliquid-client'
import { IndicatorsClient } from '../agent/indicators-client'

export function hyperliquidExtension(config: {
  privateKey: string
  tapiKey: string
}) {
  const hyperliquid = new HyperliquidAPI(config.privateKey)
  const indicators = new IndicatorsClient(config.tapiKey)

  return {
    name: 'hyperliquid',
    hyperliquid,
    indicators
  }
}
```

#### Step 2: Create Technical Context

**File:** `src/agent/contexts/technical.ts`

```typescript
import { context, action } from '@daydreamsai/core'
import { z } from 'zod'

export const technicalContext = context({
  type: 'technical',
  schema: z.object({
    assets: z.array(z.string()),
    timeframes: z.array(z.enum(['5m', '4h'])).default(['5m', '4h'])
  }),
  create: () => ({
    indicators: {},
    fundingRates: {},
    lastUpdate: 0
  }),
  render: (state) => `Technical Analysis | Assets: ${state.args.assets.join(', ')}`
})
.setActions([
  action({
    name: 'fetch-indicators',
    description: 'Fetch technical indicators for assets',
    schema: z.object({
      asset: z.string(),
      timeframe: z.enum(['5m', '4h'])
    }),
    handler: async ({ asset, timeframe }, ctx) => {
      const indicators = await ctx.extensions.hyperliquid.indicators.getIndicators(asset, timeframe)
      ctx.memory.indicators[`${asset}_${timeframe}`] = indicators
      return indicators
    }
  }),
  action({
    name: 'get-funding-rate',
    description: 'Get current funding rate for asset',
    schema: z.object({ asset: z.string() }),
    handler: async ({ asset }, ctx) => {
      const rate = await ctx.extensions.hyperliquid.hyperliquid.getFundingRate(asset)
      ctx.memory.fundingRates[asset] = rate
      return { asset, fundingRate: rate }
    }
  })
])
```

#### Step 3: Create Asset Trading Context

**File:** `src/agent/contexts/asset-trading.ts`

```typescript
import { context, action } from '@daydreamsai/core'
import { z } from 'zod'

export const assetTradingContext = context({
  type: 'asset-trading',
  schema: z.object({
    asset: z.string(),
    timeframe: z.enum(['5m', '1h', '4h'])
  }),
  create: () => ({
    position: null,
    trades: [],
    exitPlan: null,
    cooldownUntil: null,
    pnl: 0
  }),
  render: (state) => {
    const pos = state.memory.position
    return `${state.args.asset} | ${pos ? `${pos.isBuy ? 'LONG' : 'SHORT'} ${pos.size}` : 'NO POSITION'} | PnL: $${state.memory.pnl}`
  }
})
.use((state) => [
  {
    context: technicalContext,
    args: { assets: [state.args.asset], timeframes: ['5m', '4h'] }
  }
])
.setActions([
  action({
    name: 'place-order',
    description: 'Place order on Hyperliquid',
    schema: z.object({
      side: z.enum(['buy', 'sell']),
      size: z.number(),
      price: z.number().optional(),
      takeProfit: z.number().optional(),
      stopLoss: z.number().optional()
    }),
    handler: async (params, ctx) => {
      const result = await ctx.extensions.hyperliquid.hyperliquid.placeOrder(
        ctx.args.asset,
        params.side === 'buy',
        params.size,
        params.price
      )
      
      ctx.memory.trades.push({
        ...result,
        timestamp: Date.now(),
        exitPlan: params.takeProfit && params.stopLoss 
          ? `TP: $${params.takeProfit}, SL: $${params.stopLoss}`
          : null
      })
      
      ctx.memory.position = {
        isBuy: params.side === 'buy',
        size: params.size,
        entryPrice: params.price || result.price
      }
      
      return result
    }
  }),
  action({
    name: 'close-position',
    description: 'Close current position',
    schema: z.object({}),
    handler: async (_, ctx) => {
      if (!ctx.memory.position) {
        return { error: 'No position to close' }
      }
      
      const result = await ctx.extensions.hyperliquid.hyperliquid.closePosition(ctx.args.asset)
      ctx.memory.trades.push({
        ...result,
        timestamp: Date.now(),
        type: 'close'
      })
      ctx.memory.position = null
      return result
    }
  }),
  action({
    name: 'set-exit-plan',
    description: 'Set exit plan with cooldown',
    schema: z.object({
      exitCondition: z.string(),
      cooldownMinutes: z.number().default(15)
    }),
    handler: async ({ exitCondition, cooldownMinutes }, ctx) => {
      ctx.memory.exitPlan = exitCondition
      ctx.memory.cooldownUntil = Date.now() + (cooldownMinutes * 60 * 1000)
      return {
        exitPlan: exitCondition,
        cooldownUntil: new Date(ctx.memory.cooldownUntil).toISOString()
      }
    }
  })
])
```

#### Step 4: Create Portfolio Context

**File:** `src/agent/contexts/portfolio.ts`

```typescript
import { context, action } from '@daydreamsai/core'
import { z } from 'zod'
import { assetTradingContext } from './asset-trading'

export const portfolioContext = context({
  type: 'portfolio',
  schema: z.object({
    assets: z.array(z.string())
  }),
  create: () => ({
    totalBalance: 0,
    totalPnL: 0,
    activePositions: [],
    recentTrades: []
  }),
  render: (state) => `Portfolio | Balance: $${state.memory.totalBalance} | PnL: $${state.memory.totalPnL}`
})
.use((state) => 
  // Compose asset contexts for each asset
  state.args.assets.map(asset => ({
    context: assetTradingContext,
    args: { asset, timeframe: '5m' }
  }))
)
.setActions([
  action({
    name: 'get-portfolio-state',
    description: 'Get current portfolio state',
    schema: z.object({}),
    handler: async (_, ctx) => {
      const state = await ctx.extensions.hyperliquid.hyperliquid.getUserState()
      ctx.memory.totalBalance = state.balance
      ctx.memory.activePositions = state.positions
      
      // Calculate total PnL
      const totalPnL = state.positions.reduce((sum, pos) => sum + (pos.pnl || 0), 0)
      ctx.memory.totalPnL = totalPnL
      
      return {
        balance: state.balance,
        positions: state.positions,
        totalPnL: totalPnL
      }
    }
  })
])
```

#### Step 5: Update System Prompt

**File:** `src/agent/system-prompt.ts`

```typescript
export const TRADING_SYSTEM_PROMPT = `
You are a rigorous QUANTITATIVE TRADER optimizing risk-adjusted returns on Hyperliquid perpetuals.

You have access to:
- Portfolio context: Overall account state, balance, total PnL
- Asset contexts: Individual positions, exit plans, cooldowns
- Technical context: Indicators (RSI, MACD, EMA, ATR), funding rates
- Actions: place-order, close-position, set-exit-plan, fetch-indicators, get-funding-rate

CORE POLICY (Low-Churn, Position-Aware):
1) Respect prior plans: Don't close early unless invalidation occurs
2) Hysteresis: Require stronger evidence to CHANGE than to KEEP
3) Cooldown: Respect cooldown_until timestamps in exit plans
4) Funding is a tilt, not a trigger (only if > 0.25% per 8h)
5) Overbought/oversold ≠ reversal by itself
6) Prefer adjustments over exits

DECISION DISCIPLINE:
- Choose one: BUY / SELL / HOLD per asset
- Provide: rationale, entry_price, take_profit, stop_loss, position_size
- Set exit plans with cooldown durations
- Track all trades in memory

CONTEXT COMPOSITION:
- Portfolio context gives you ALL asset contexts automatically
- Each asset has its own isolated state and memory
- Technical context provides indicators for all assets
- Use actions to fetch data and execute trades

Make decisive, first-principles decisions that minimize churn while capturing edge.
`
```

#### Step 6: Update Main Agent

**File:** `src/index.ts` (Update existing code)

```typescript
import { createDreams } from '@daydreamsai/core'
import { dreamsRouter } from '@daydreamsai/ai-sdk-provider'
import { portfolioContext } from './agent/contexts/portfolio'
import { hyperliquidExtension } from './extensions/hyperliquid-extension'
import { TRADING_SYSTEM_PROMPT } from './agent/system-prompt'

// Initialize Hyperliquid extension
const hyperliquidExt = hyperliquidExtension({
  privateKey: config.HYPERLIQUID_PRIVATE_KEY,
  tapiKey: config.TAAPI_API_KEY
})

// Create agent with portfolio context (which composes all asset contexts)
const agent = createDreams({
  model: dreamsRouter('openai/gpt-4o'),
  contexts: [portfolioContext],
  extensions: [hyperliquidExt],
  system: TRADING_SYSTEM_PROMPT
})

// Main trading loop
async function tradingLoop() {
  while (true) {
    try {
      // Get portfolio state
      const response = await agent.send({
        context: portfolioContext,
        args: { assets: ['BTC', 'ETH'] },
        input: 'Analyze market and make trading decisions for all assets'
      })
      
      // Response contains decisions for each asset
      // Actions are automatically executed within contexts
      
      // Log to diary
      logTrade({
        timestamp: new Date().toISOString(),
        decisions: response,
        portfolio: await hyperliquidExt.hyperliquid.getUserState()
      })
      
      // Sleep before next iteration
      await sleep(60000) // 60 seconds
    } catch (error) {
      logger.error('Trading loop error:', error)
      await sleep(5000)
    }
  }
}

tradingLoop()
```

---

## Why This Fits Daydreams Perfectly

### 1. **Composable Contexts**
- Portfolio context composes asset contexts
- Asset contexts compose technical context
- No manual integration needed
- LLM sees all data automatically

### 2. **Isolated State**
- Each asset has its own memory (position, trades, exit plan)
- Portfolio has aggregate memory (balance, total PnL)
- No state conflicts

### 3. **Type-Safe Actions**
- Actions are schema-validated
- Handler has full context access
- Automatic error handling

### 4. **Memory Persistence**
- Working memory: Current decision analysis
- Context memory: Position history, trades, exit plans
- Automatic across iterations

### 5. **x402 Integration**
- Already using Dreams Router for LLM calls
- Micropayments built-in
- No additional setup needed

### 6. **Extension System**
- Hyperliquid as an extension
- Easy to add more exchanges later
- Clean separation of concerns

---

## What We DON'T Need to Change

✅ **Keep existing:**
- Daydreams core framework
- x402 router integration
- Dashboard
- Event logging
- Bridge API

❌ **Don't rebuild:**
- Context system (it's perfect)
- Memory system (it's perfect)
- Action system (it's perfect)
- Extension system (it's perfect)

---

## Implementation Phases (No Rebuild)

### Phase 1: Create Contexts (1-2 days)
- [ ] Technical context with indicator actions
- [ ] Asset trading context with order actions
- [ ] Portfolio context with composition

### Phase 2: Create Extension (1 day)
- [ ] Hyperliquid extension wrapper
- [ ] Integrate with existing HyperliquidAPI

### Phase 3: Update System Prompt (1 day)
- [ ] Add trading discipline rules
- [ ] Document available actions
- [ ] Add context composition instructions

### Phase 4: Test on Testnet (2-3 days)
- [ ] Test context composition
- [ ] Test action execution
- [ ] Validate memory persistence

### Phase 5: Deploy to Mainnet (1 day)
- [ ] Switch to mainnet
- [ ] Monitor live trading

---

## Key Differences: Nocturne vs. Daydreams Approach

| Aspect | Nocturne | Daydreams |
|--------|----------|-----------|
| **Architecture** | Monolithic main loop | Composable contexts |
| **State Management** | Manual dictionaries | Automatic context memory |
| **Multi-Asset** | Single LLM call | Composed contexts per asset |
| **Extensibility** | Hard to extend | Extension system |
| **Type Safety** | Manual validation | Schema-validated actions |
| **Memory** | Manual persistence | Automatic dual-tier |
| **Error Handling** | Manual retry logic | Built-in resilience |

**Daydreams is actually BETTER suited for trading than Nocturne's architecture!**

---

## Critical Success Factors

1. **System Prompt** - Encodes trading discipline
2. **Context Composition** - Leverages Daydreams strength
3. **Exit Plans** - Prevents churn via memory
4. **Action Validation** - Schema-based safety
5. **Memory Persistence** - Tracks position history

---

## Next Steps (Minimal Changes)

1. **Create technical context** with indicator actions
2. **Create asset trading context** with order actions
3. **Create portfolio context** with composition
4. **Create hyperliquid extension** wrapper
5. **Update system prompt** with trading rules
6. **Test on testnet** with real orders

**No rebuild needed. Just add contexts and actions.**

---

## Files to Create/Modify

### New Files (Create):
- `src/extensions/hyperliquid-extension.ts`
- `src/agent/contexts/technical.ts`
- `src/agent/contexts/asset-trading.ts`
- `src/agent/contexts/portfolio.ts`
- `src/agent/system-prompt.ts` (update)

### Existing Files (Minimal Changes):
- `src/index.ts` - Add portfolio context and hyperliquid extension
- `src/agent/hyperliquid-client.ts` - Already exists, no changes
- `src/agent/indicators-client.ts` - Already exists, no changes

**Total new code: ~400 lines**
**Total modified code: ~50 lines**

---

**Ready to integrate Hyperliquid within Daydreams! 🚀**

This approach:
- ✅ Fits perfectly within Daydreams architecture
- ✅ Leverages context composition
- ✅ Uses x402 router for payments
- ✅ Maintains type safety
- ✅ Enables multi-asset trading
- ✅ Requires minimal changes
