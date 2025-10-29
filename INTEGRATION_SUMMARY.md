# Daydream + x402 Integration Summary

## Quick Reference

### What We're Building
An AI trading agent that:
1. Uses **Daydream Agent Platform** for intelligent decision-making
2. Trades crypto using **CCXT** exchange APIs
3. Pays for compute with **x402** tokens

### Why Daydream?
- **Composable Contexts**: Combine market data, portfolio state, and risk rules in one decision
- **Stateful**: Maintains trading state across cycles
- **LLM-Powered**: Uses GPT-4 for intelligent reasoning
- **Scalable**: Easy to add new contexts and actions

## Three-Layer Architecture

```
┌─────────────────────────────────────────────┐
│ LAYER 1: INTELLIGENCE (Daydream)            │
│ ├─ Contexts (stateful workspaces)           │
│ ├─ Actions (what agent can do)              │
│ ├─ Inputs (what triggers agent)             │
│ └─ Outputs (how agent responds)             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ LAYER 2: EXECUTION (Exchange + Strategy)    │
│ ├─ Market data fetching                     │
│ ├─ Technical analysis                       │
│ ├─ Order execution                          │
│ └─ Position management                      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ LAYER 3: PAYMENT (x402)                     │
│ ├─ Wallet management                        │
│ ├─ Payment processing                       │
│ ├─ Cost tracking                            │
│ └─ Balance monitoring                       │
└─────────────────────────────────────────────┘
```

## Key Daydream Concepts

### 1. Contexts (Stateful Workspaces)
Think of contexts as specialized "brains" for different aspects of trading:

| Context | Responsibility | State |
|---------|---|---|
| **Market** | Analyze price data & signals | Current price, indicators, signals |
| **Portfolio** | Track positions & balance | Positions, balance, P&L |
| **Risk** | Enforce risk rules | Exposure, leverage, limits |
| **Trading** | Orchestrate decisions | Composed from other contexts |

### 2. Actions (What Agent Can Do)
```
ExecuteTrade → Open new position
ClosePosition → Exit existing position
RebalancePortfolio → Adjust allocation
RiskManagement → Reduce exposure if needed
```

### 3. Inputs (What Triggers Agent)
```
Market Data Stream → New price data
Price Updates → Significant movements
Risk Alerts → Limits approaching
```

### 4. Outputs (How Agent Responds)
```
Trade Orders → Execute trades
Portfolio Reports → Status updates
Risk Alerts → Notifications
```

## Context Composition Example

**Scenario**: Should we buy BTC?

```
Market Context says: "BTC is bullish (SMA crossover)"
Portfolio Context says: "We have $10k available"
Risk Context says: "Max position size is $5k"

→ Trading Context composes all three
→ LLM reasons: "Yes, buy $5k of BTC"
→ ExecuteTrade action fires
→ Order placed on exchange
→ Portfolio updated
→ x402 payment processed
```

## x402 Integration Points

### When Payment Happens
```
Agent Cycle:
1. Fetch market data (compute cost: 0.01 x402)
2. Analyze signals (compute cost: 0.02 x402)
3. Make decision (compute cost: 0.01 x402)
4. Total cycle cost: 0.04 x402
5. → Execute x402 payment
6. If payment succeeds: Execute trades
7. If payment fails: Pause agent
```

### Payment Flow
```
Check Balance → Estimate Cost → Execute Payment → Verify → Continue/Pause
```

## File Organization

```
src/
├── agent/
│   ├── trading-agent.ts          ← Main Daydream agent
│   ├── contexts/                 ← Stateful workspaces
│   │   ├── market.ts
│   │   ├── portfolio.ts
│   │   ├── risk.ts
│   │   └── trading.ts
│   ├── actions/                  ← Agent capabilities
│   │   ├── execute-trade.ts
│   │   ├── close-position.ts
│   │   ├── rebalance.ts
│   │   └── risk-management.ts
│   ├── inputs/                   ← Data sources
│   │   ├── market-stream.ts
│   │   └── price-updates.ts
│   └── outputs/                  ← Responses
│       ├── trade-orders.ts
│       └── reports.ts
├── exchange/                     ← Trading execution
│   ├── adapter.ts
│   ├── market-data.ts
│   └── orders.ts
├── x402/                         ← Payment handling
│   ├── payment-handler.ts
│   ├── wallet.ts
│   └── billing.ts
└── strategy/                     ← Trading logic
    ├── indicators.ts
    ├── signals.ts
    └── engine.ts
```

## Decision Tree: When to Use What

```
Need to track state across cycles?
├─ YES → Use a Context
└─ NO → Use a utility function

Need to execute something?
├─ YES → Create an Action
└─ NO → Use a helper function

Need to listen for data?
├─ YES → Create an Input
└─ NO → Fetch data in context

Need to communicate result?
├─ YES → Create an Output
└─ NO → Return from context
```

## Development Workflow

### Step 1: Create a Context
```typescript
// Define state structure
// Implement data fetching
// Add business logic
// Export for composition
```

### Step 2: Create an Action
```typescript
// Define input/output
// Implement execution logic
// Use contexts as needed
// Return result
```

### Step 3: Compose in Trading Context
```typescript
// Use Market Context for signals
// Use Portfolio Context for positions
// Use Risk Context for validation
// LLM makes decision
// Trigger appropriate action
```

### Step 4: Add x402 Payment
```typescript
// Calculate compute cost
// Check balance
// Execute payment
// Continue or pause
```

## Key Differences from Traditional Agents

| Traditional | Daydream |
|---|---|
| Stateless conversations | Stateful contexts |
| Single LLM call | Composed reasoning |
| Limited context | Rich context composition |
| Hard to scale | Easy to add contexts |
| Manual state management | Automatic state handling |

## Next Steps

1. **Review** the `PROJECT_MAP.md` for detailed structure
2. **Study** the `ARCHITECTURE.md` for implementation details
3. **Start** with Phase 1: Foundation setup
4. **Build** Market Context first (simplest)
5. **Iterate** through remaining components

## Quick Start Commands

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run agent
npm start

# Run tests
npm test

# Build for production
npm run build
```

## Resources

- [Daydream Docs](https://docs.dreams.fun/docs/core)
- [CCXT Documentation](https://docs.ccxt.com/)
- [x402 Integration Guide](https://x402.dev/docs)
- [Our Architecture](./ARCHITECTURE.md)
- [Our Project Map](./PROJECT_MAP.md)
