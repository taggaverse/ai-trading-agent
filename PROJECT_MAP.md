# AI Hedge Fund Trading Agent - Project Architecture Map

## Overview
Building an AI trading agent using the Daydream Agent Platform with x402 for compute payments. The agent will use composable contexts to manage trading state, market analysis, and risk management.

## Daydream Framework Integration

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Daydream Agent                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Model: OpenAI GPT-4 (LLM Reasoning)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Contexts (Stateful Workspaces)                      │  │
│  │  ├─ Market Context (price data, indicators)          │  │
│  │  ├─ Research Context (x402 AI narratives, projects)  │  │
│  │  ├─ Portfolio Context (positions, balance)           │  │
│  │  ├─ Risk Context (limits, exposure)                  │  │
│  │  └─ Trading Context (strategy, signals)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Actions (What the agent can do)                     │  │
│  │  ├─ ExecuteTrade                                     │  │
│  │  ├─ ClosePosition                                    │  │
│  │  ├─ UpdateStopLoss                                   │  │
│  │  └─ RebalancePortfolio                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Inputs (How agent listens)                          │  │
│  │  ├─ Market Data Stream                               │  │
│  │  ├─ Price Updates                                    │  │
│  │  └─ Risk Alerts                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Outputs (How agent responds)                        │  │
│  │  ├─ Trade Execution Orders                           │  │
│  │  ├─ Portfolio Reports                                │  │
│  │  └─ Risk Alerts                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

windsurf-project/
├── src/
│   ├── agent/
│   │   ├── trading-agent.ts          # Main Daydream agent definition
│   │   ├── contexts/
│   │   │   ├── market-context.ts     # Market data and analysis
│   │   │   ├── research-context.ts   # x402 AI research and alpha
│   │   │   ├── portfolio-context.ts  # Position and balance tracking
│   │   │   ├── risk-context.ts       # Risk management rules
│   │   │   └── trading-context.ts    # Trading strategy logic
│   │   ├── actions/
│   │   │   ├── execute-trade.ts      # Trade execution action
│   │   │   ├── close-position.ts     # Position closing action
│   │   │   ├── rebalance.ts          # Portfolio rebalancing
│   │   │   └── risk-management.ts    # Risk control actions
│   │   ├── inputs/
│   │   │   ├── market-stream.ts      # Market data input
│   │   │   └── price-updates.ts      # Real-time price feed
│   │   └── outputs/
│   │       ├── trade-orders.ts       # Trade execution output
│   │       └── reports.ts            # Reporting output
│   │
│   ├── exchange/
│   │   ├── exchange-adapter.ts       # CCXT exchange integration
│   │   ├── market-data.ts            # Market data fetching
│   │   └── order-execution.ts        # Order placement
│   │
│   ├── x402/
│   │   ├── payment-handler.ts        # x402 payment logic
│   │   ├── wallet-manager.ts         # Wallet operations
│   │   └── compute-billing.ts        # Compute cost tracking
│   │
│   ├── strategy/
│   │   ├── indicators.ts             # Technical indicators
│   │   ├── signals.ts                # Signal generation
│   │   └── strategy-engine.ts        # Strategy execution
│   │
│   └── utils/
│       ├── logger.ts                 # Logging utility
│       ├── config.ts                 # Configuration management
│       └── types.ts                  # TypeScript types
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── config/
│   ├── .env.example
│   └── agent-config.json
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   └── API.md
│
├── package.json
├── tsconfig.json
└── README.md
```

## Daydream Contexts Architecture

### 1. Market Context
**Purpose**: Provide real-time market data and technical analysis

```typescript
// Responsibilities:
- Fetch OHLCV data from exchange
- Calculate technical indicators (SMA, RSI, MACD, etc.)
- Generate market signals
- Track market volatility
- Store historical data
```

### 2. Research Context
**Purpose**: Generate alpha signals using x402 AI endpoints

```typescript
// Responsibilities:
- Query Indigo AI for emerging narratives
- Screen projects with surging momentum
- Identify undervalued opportunities
- Generate alpha signals
- Track narrative-driven trends
- Cache research to minimize costs
```

### 3. Portfolio Context
**Purpose**: Track positions and account state

```typescript
// Responsibilities:
- Maintain open positions
- Track account balance
- Calculate portfolio metrics (Sharpe ratio, max drawdown)
- Monitor position P&L
- Track trade history
```

### 4. Risk Context
**Purpose**: Enforce risk management rules

```typescript
// Responsibilities:
- Enforce position size limits
- Monitor portfolio exposure
- Check leverage limits
- Validate stop-loss levels
- Calculate Value at Risk (VaR)
- Track correlation exposure
```

### 5. Trading Context
**Purpose**: Orchestrate trading decisions

```typescript
// Responsibilities:
- Compose market + portfolio + risk contexts
- Generate trading signals
- Validate trade setup
- Execute trades through actions
- Manage position lifecycle
```

## Actions (Agent Capabilities)

### 1. ExecuteTrade Action
```typescript
// Input: Signal, Symbol, Size
// Process: 
//   - Validate against risk context
//   - Calculate position size
//   - Place order on exchange
//   - Record in portfolio
// Output: Order confirmation
```

### 2. ClosePosition Action
```typescript
// Input: Symbol, Reason
// Process:
//   - Close existing position
//   - Calculate P&L
//   - Update portfolio
// Output: Exit confirmation
```

### 3. RebalancePortfolio Action
```typescript
// Input: Target allocation
// Process:
//   - Analyze current vs target
//   - Generate rebalancing trades
//   - Execute rebalancing
// Output: Rebalance summary
```

### 4. RiskManagement Action
```typescript
// Input: Risk alert
// Process:
//   - Evaluate risk level
//   - Close high-risk positions
//   - Reduce leverage if needed
// Output: Risk mitigation summary
```

## Inputs (Agent Listeners)

### 1. Market Data Stream
- Real-time price updates
- Volume data
- Order book snapshots

### 2. Price Updates
- Triggered on significant price movements
- Used for stop-loss/take-profit checks

### 3. Risk Alerts
- Triggered when risk limits approached
- Portfolio correlation changes

## Outputs (Agent Responses)

### 1. Trade Orders
- Market orders
- Limit orders
- Stop-loss orders

### 2. Portfolio Reports
- Daily P&L
- Position summary
- Risk metrics

## x402 Integration

### Payment Flow
```
┌──────────────────────────────────────────┐
│   Agent Execution Cycle                  │
├──────────────────────────────────────────┤
│ 1. Start cycle                           │
│ 2. Calculate compute cost for cycle      │
│ 3. Check x402 balance                    │
│ 4. Execute x402 payment                  │
│ 5. If payment successful:                │
│    - Fetch market data                   │
│    - Analyze and generate signals        │
│    - Execute trades                      │
│ 6. If payment failed:                    │
│    - Pause agent                         │
│    - Alert user                          │
└──────────────────────────────────────────┘
```

### x402 Components
- **Wallet Manager**: Manage x402 wallet address and balance
- **Payment Handler**: Execute x402 transactions
- **Billing Tracker**: Track compute costs per cycle
- **Balance Monitor**: Alert when balance low

## Data Flow

```
Market Data Stream
       ↓
Market Context (fetch & analyze)
       ↓
Trading Context (compose contexts)
       ↓
LLM Reasoning (GPT-4 decision making)
       ↓
Action Selection
       ├─ ExecuteTrade → Exchange Adapter → Order Execution
       ├─ ClosePosition → Exchange Adapter → Order Execution
       ├─ RiskManagement → Portfolio Context → Position Updates
       └─ RebalancePortfolio → Exchange Adapter → Multiple Orders
       ↓
Portfolio Context Update
       ↓
Output Generation (Reports, Alerts)
       ↓
x402 Payment (for compute used)
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up Daydream project structure
- [ ] Create basic contexts (Market, Portfolio)
- [ ] Implement exchange adapter
- [ ] Set up TypeScript configuration

### Phase 2: Core Agent (Week 2)
- [ ] Implement all contexts
- [ ] Create actions
- [ ] Set up inputs/outputs
- [ ] Integrate with exchange API

### Phase 3: x402 Integration (Week 3)
- [ ] Implement x402 payment handler
- [ ] Set up wallet management
- [ ] Integrate billing tracking
- [ ] Add payment verification

### Phase 4: Strategy & Testing (Week 4)
- [ ] Implement trading strategy
- [ ] Add risk management rules
- [ ] Create unit tests
- [ ] Backtest strategy

### Phase 5: Deployment (Week 5)
- [ ] Production configuration
- [ ] Monitoring and logging
- [ ] Documentation
- [ ] Deployment to production

## Key Technologies

- **Framework**: Daydream Agent Platform (TypeScript)
- **LLM**: OpenAI GPT-4
- **Exchange**: CCXT (multi-exchange support)
- **Blockchain**: x402 for payments
- **Data**: Real-time market data streams
- **Testing**: Jest, Vitest

## Success Metrics

1. **Trading Performance**
   - Positive Sharpe ratio
   - Win rate > 50%
   - Max drawdown < 20%

2. **System Reliability**
   - 99.9% uptime
   - < 100ms order latency
   - Zero missed trades due to system failure

3. **Cost Efficiency**
   - x402 cost per trade < $0.01
   - Profitable after compute costs

## Risk Considerations

1. **Market Risk**: Implement strict position sizing and stop-losses
2. **Execution Risk**: Use reliable exchange APIs with fallbacks
3. **Operational Risk**: Monitor agent health continuously
4. **Financial Risk**: Start with small positions, scale gradually
5. **Smart Contract Risk**: Audit x402 payment contracts

## Next Steps

1. Review Daydream documentation thoroughly
2. Set up development environment
3. Create initial project structure
4. Implement Market Context first
5. Build out remaining contexts iteratively
