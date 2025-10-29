# Visual Architecture Guide

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI TRADING AGENT SYSTEM                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ INPUT LAYER                                                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐         │
│  │ Market Stream   │  │ Price Updates    │  │ Risk Alerts        │         │
│  │ (WebSocket)     │  │ (Real-time)      │  │ (Threshold-based)  │         │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬───────────┘         │
│           │                    │                     │                      │
└───────────┼────────────────────┼─────────────────────┼──────────────────────┘
            │                    │                     │
            ↓                    ↓                     ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ CONTEXT LAYER (Stateful Workspaces)                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐                                                   │
│  │ MARKET CONTEXT       │                                                   │
│  ├──────────────────────┤                                                   │
│  │ • OHLCV Data         │                                                   │
│  │ • Indicators (SMA,   │                                                   │
│  │   RSI, MACD)         │                                                   │
│  │ • Signals (bullish/  │                                                   │
│  │   bearish)           │                                                   │
│  │ • Volatility         │                                                   │
│  └──────────┬───────────┘                                                   │
│             │                                                               │
│             ↓                                                               │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ RESEARCH CONTEXT (x402 Integration)                          │           │
│  ├──────────────────────────────────────────────────────────────┤           │
│  │ • Indigo AI Queries                                          │           │
│  │   └─ Emerging narratives                                     │           │
│  │   └─ Market opportunities                                    │           │
│  │ • Projects API Screening                                     │           │
│  │   └─ Trending projects                                       │           │
│  │   └─ Momentum signals                                        │           │
│  │ • Alpha Signal Generation                                    │           │
│  │ • Caching (1 hour)                                           │           │
│  └──────────┬───────────────────────────────────────────────────┘           │
│             │                                                               │
│             ↓                                                               │
│  ┌──────────────────────┐      ┌──────────────────────┐                    │
│  │ PORTFOLIO CONTEXT    │      │ RISK CONTEXT         │                    │
│  ├──────────────────────┤      ├──────────────────────┤                    │
│  │ • Positions          │      │ • Position Limits    │                    │
│  │ • Balance            │      │ • Leverage Limits    │                    │
│  │ • P&L                │      │ • Exposure Limits    │                    │
│  │ • Trade History      │      │ • Stop-Loss Rules    │                    │
│  │ • Metrics            │      │ • VaR Calculation    │                    │
│  └──────────┬───────────┘      └──────────┬───────────┘                    │
│             │                             │                                │
│             └─────────────┬────────────────┘                                │
│                           ↓                                                 │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ TRADING CONTEXT (Composition)                                │           │
│  ├──────────────────────────────────────────────────────────────┤           │
│  │ • Composes all contexts                                      │           │
│  │ • Generates trade setups                                     │           │
│  │ • Validates against risk                                     │           │
│  │ • Prepares for LLM reasoning                                 │           │
│  └──────────┬───────────────────────────────────────────────────┘           │
│             │                                                               │
└─────────────┼───────────────────────────────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ REASONING LAYER                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ GPT-4 LLM REASONING                                          │           │
│  ├──────────────────────────────────────────────────────────────┤           │
│  │ "Given:                                                      │           │
│  │  - Market signals (technical)                                │           │
│  │  - Research signals (fundamental)                            │           │
│  │  - Current positions (portfolio)                             │           │
│  │  - Risk constraints (risk)                                   │           │
│  │                                                              │           │
│  │ Should I trade? Which action?"                               │           │
│  └──────────┬───────────────────────────────────────────────────┘           │
│             │                                                               │
└─────────────┼───────────────────────────────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ ACTION LAYER (What Agent Can Do)                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ ExecuteTrade │  │ClosePosition │  │ResearchTrade │  │ Rebalance    │   │
│  │              │  │              │  │              │  │              │   │
│  │ Open new     │  │ Exit trade   │  │ Research-    │  │ Adjust       │   │
│  │ position     │  │ based on     │  │ driven trade │  │ allocation   │   │
│  │              │  │ signal       │  │              │  │              │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │            │
│         └─────────────────┼─────────────────┼─────────────────┘            │
│                           ↓                                                 │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ RiskManagement Action                                        │           │
│  │ • Reduce exposure if needed                                  │           │
│  │ • Close high-risk positions                                  │           │
│  │ • Adjust leverage                                            │           │
│  └──────────┬───────────────────────────────────────────────────┘           │
│             │                                                               │
└─────────────┼───────────────────────────────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ EXECUTION LAYER                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ EXCHANGE ADAPTER (CCXT)                                      │           │
│  ├──────────────────────────────────────────────────────────────┤           │
│  │ • Place orders                                               │           │
│  │ • Get order status                                           │           │
│  │ • Fetch account info                                         │           │
│  │ • Handle errors & retries                                    │           │
│  └──────────┬───────────────────────────────────────────────────┘           │
│             │                                                               │
│             ↓                                                               │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │ EXCHANGE (Binance, Kraken, etc.)                             │           │
│  ├──────────────────────────────────────────────────────────────┤           │
│  │ • Execute orders                                             │           │
│  │ • Update positions                                           │           │
│  │ • Confirm fills                                              │           │
│  └──────────┬───────────────────────────────────────────────────┘           │
│             │                                                               │
└─────────────┼───────────────────────────────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ UPDATE LAYER                                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  • Update Portfolio Context with new positions                              │
│  • Record trade in history                                                  │
│  • Calculate P&L                                                            │
│  • Update Risk Context exposure                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ OUTPUT LAYER                                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐                        │
│  │ Trade Orders Output  │  │ Portfolio Reports    │                        │
│  │ • Order confirmation │  │ • Daily P&L          │                        │
│  │ • Execution details  │  │ • Position summary   │                        │
│  │ • Timestamps         │  │ • Risk metrics       │                        │
│  └──────────┬───────────┘  └──────────┬───────────┘                        │
│             │                         │                                    │
└─────────────┼─────────────────────────┼────────────────────────────────────┘
              │                         │
              ↓                         ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ PAYMENT LAYER (x402)                                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Calculate compute cost for cycle                                        │
│  2. Check x402 wallet balance                                               │
│  3. Execute x402 payment                                                    │
│  4. Verify blockchain confirmation                                          │
│  5. Track billing & costs                                                   │
│  6. Log transaction                                                         │
│                                                                              │
│  Cost: ~0.04 x402 per cycle (0.01 market + 0.02 research + 0.01 mgmt)     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Context Composition Flow

```
Individual Contexts:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Market    │  │  Research   │  │  Portfolio  │  │    Risk     │
│  Context    │  │  Context    │  │  Context    │  │  Context    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │                │
       └────────────────┼────────────────┼────────────────┘
                        ↓
              ┌──────────────────────┐
              │ Trading Context      │
              │ (Composition)        │
              │                      │
              │ Combines all signals │
              │ Validates setup      │
              │ Prepares for LLM     │
              └──────────┬───────────┘
                         ↓
              ┌──────────────────────┐
              │ LLM Reasoning        │
              │ (GPT-4)              │
              │                      │
              │ Decision making      │
              │ Action selection     │
              └──────────┬───────────┘
                         ↓
              ┌──────────────────────┐
              │ Action Execution     │
              │                      │
              │ ExecuteTrade         │
              │ ClosePosition        │
              │ ResearchTrade        │
              │ Rebalance            │
              │ RiskManagement       │
              └──────────────────────┘
```

---

## x402 Research Integration

```
Agent Cycle:
┌─────────────────────────────────────────────────────────────┐
│ 1. MARKET ANALYSIS (Technical)                              │
│    • Fetch OHLCV data                                       │
│    • Calculate indicators                                   │
│    • Generate signals                                       │
│    Cost: ~0.01 x402                                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. RESEARCH ANALYSIS (Fundamental - x402)                   │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ Indigo AI Agent                                     │  │
│    │ POST /v1/agents/indigo                              │  │
│    │ • Query emerging narratives                         │  │
│    │ • Identify opportunities                            │  │
│    │ Cost: ~0.05 x402                                    │  │
│    └─────────────────────────────────────────────────────┘  │
│                                                             │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ Crypto Projects API                                 │  │
│    │ GET /v1/projects                                    │  │
│    │ • Screen trending projects                          │  │
│    │ • Find high-momentum assets                         │  │
│    │ Cost: ~0.02 x402                                    │  │
│    └─────────────────────────────────────────────────────┘  │
│                                                             │
│    • Generate alpha signals                                │
│    • Cache results (1 hour)                                │
│    Total Cost: ~0.07 x402                                  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SIGNAL COMBINATION                                       │
│    • Merge technical + research signals                     │
│    • Calculate confidence                                   │
│    • Validate against risk                                  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. TRADE EXECUTION                                          │
│    • Execute high-confidence trades                         │
│    • Manage positions                                       │
│    • Record results                                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. x402 PAYMENT                                             │
│    • Calculate total cycle cost (~0.04 x402)                │
│    • Execute payment                                        │
│    • Verify confirmation                                    │
│    • Track billing                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Trading Decision Tree

```
                    Market Data
                         ↓
                  ┌──────────────┐
                  │ Technical    │
                  │ Signal?      │
                  └──────┬───────┘
                    Yes  │  No
                         │
            ┌────────────┴────────────┐
            ↓                         ↓
        ┌────────┐            ┌──────────┐
        │ Query  │            │ No trade │
        │Research│            └──────────┘
        └────┬───┘
             ↓
        ┌──────────────┐
        │ Research     │
        │ Signal?      │
        └──────┬───────┘
           Yes │  No
              │
    ┌─────────┴─────────┐
    ↓                   ↓
┌────────┐         ┌──────────┐
│ Check  │         │ No trade │
│ Risk   │         └──────────┘
└────┬───┘
     ↓
┌──────────────┐
│ Risk OK?     │
└──────┬───────┘
   Yes │  No
      │
  ┌───┴────┐
  ↓        ↓
┌──────┐ ┌─────────────┐
│Trade │ │ Risk Mgmt   │
│      │ │ Action      │
└──────┘ └─────────────┘
```

---

## Cost Flow

```
Monthly Budget:
$100 (assumed)
    ↓
    ├─ $35 (x402 Research)
    │  ├─ $25 (Indigo AI: 500 queries × 0.05)
    │  └─ $10 (Projects API: 500 queries × 0.02)
    │
    ├─ $30 (Exchange Fees)
    │  └─ ~0.1% per trade × 100 trades
    │
    ├─ $20 (Infrastructure)
    │  └─ Server, monitoring, etc.
    │
    └─ $15 (Profit)
       └─ After all costs

ROI: 8.3x on research costs
     (Research generates $35 in alpha per $4.20 spent)
```

---

## File Organization

```
src/
├── agent/
│   ├── index.ts ─────────────────────┐
│   │                                  │
│   ├── contexts/                      │
│   │   ├── market.ts ────────────────┤─ Stateful Workspaces
│   │   ├── research.ts ──────────────┤  (Daydream Contexts)
│   │   ├── portfolio.ts ─────────────┤
│   │   ├── risk.ts ───────────────────┤
│   │   └── trading.ts ────────────────┘
│   │
│   ├── actions/
│   │   ├── execute-trade.ts ─────────┐
│   │   ├── close-position.ts ────────┤─ Agent Capabilities
│   │   ├── research-trade.ts ────────┤  (What agent can do)
│   │   ├── rebalance.ts ──────────────┤
│   │   └── risk-management.ts ───────┘
│   │
│   ├── inputs/
│   │   ├── market-stream.ts ─────────┐
│   │   └── price-updates.ts ─────────┤─ Data Sources
│   │                                  │  (What triggers agent)
│   └── outputs/
│       ├── trade-orders.ts ──────────┐
│       └── reports.ts ────────────────┤─ Responses
│                                      │  (How agent communicates)
├── exchange/
│   ├── adapter.ts ──────────────────┐
│   ├── market-data.ts ───────────────┤─ Trading Execution
│   └── orders.ts ──────────────────┘
│
├── x402/
│   ├── client.ts ───────────────────┐
│   ├── payment-handler.ts ───────────┤─ Payment Processing
│   ├── wallet.ts ──────────────────┤
│   └── billing.ts ──────────────────┘
│
├── strategy/
│   ├── indicators.ts ────────────────┐
│   ├── signals.ts ──────────────────┤─ Trading Logic
│   └── engine.ts ──────────────────┘
│
└── utils/
    ├── logger.ts ──────────────────┐
    ├── config.ts ──────────────────┤─ Utilities
    └── types.ts ──────────────────┘
```

---

## Success Metrics Dashboard

```
┌─────────────────────────────────────────────────────────┐
│ TRADING PERFORMANCE                                     │
├─────────────────────────────────────────────────────────┤
│ Win Rate:           62%  ✓ (Target: >50%)              │
│ Sharpe Ratio:       1.8  ✓ (Target: >1.0)              │
│ Max Drawdown:       15%  ✓ (Target: <20%)              │
│ Monthly Return:     8.5% ✓ (Target: >5%)               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ SYSTEM RELIABILITY                                      │
├─────────────────────────────────────────────────────────┤
│ Uptime:             99.9% ✓ (Target: >99.9%)           │
│ Order Latency:      45ms  ✓ (Target: <100ms)           │
│ Missed Trades:      0     ✓ (Target: 0)                │
│ Error Rate:         0.1%  ✓ (Target: <1%)              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ RESEARCH EFFECTIVENESS                                  │
├─────────────────────────────────────────────────────────┤
│ Narrative Accuracy: 68%  ✓ (Target: >60%)              │
│ Project Success:    58%  ✓ (Target: >55%)              │
│ Alpha Generated:    12%  ✓ (Target: >10%)              │
│ Cost Efficiency:    9.2x ✓ (Target: >5x)               │
└─────────────────────────────────────────────────────────┘
```

---

This visual guide shows how all components work together to create an intelligent, profitable trading agent!
