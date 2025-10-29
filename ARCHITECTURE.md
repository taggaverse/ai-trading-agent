# Trading Agent Architecture - Detailed Design

## System Overview

This document outlines the detailed architecture for building an AI hedge fund trading agent using the Daydream Agent Platform.

## Daydream Framework Concepts Applied

### 1. Composable Contexts
Unlike traditional stateless AI systems, our trading agent uses **composable contexts** - isolated, stateful workspaces that combine for complex behaviors.

**Example**: A trading decision requires composing three contexts:
```
Market Context (price data, indicators)
    ↓
Portfolio Context (current positions, balance)
    ↓
Risk Context (exposure limits, leverage rules)
    ↓
LLM makes informed decision
```

### 2. Context Composition Pattern

```typescript
// Individual contexts
const marketContext = context({ type: "market" });
const portfolioContext = context({ type: "portfolio" });
const riskContext = context({ type: "risk" });

// Composed trading context
const tradingContext = context({ type: "trading" })
  .use(state => [
    { context: marketContext, args: { symbol: state.symbol } },
    { context: portfolioContext, args: { accountId: state.accountId } },
    { context: riskContext, args: { accountId: state.accountId } }
  ]);
```

Result: The LLM gets market data, portfolio state, AND risk constraints in a single decision.

## Core Components

### A. Contexts (Stateful Workspaces)

#### Market Context
```
Responsibilities:
├─ Fetch real-time market data (OHLCV)
├─ Calculate technical indicators
├─ Generate trading signals
├─ Track market volatility
└─ Maintain indicator history

State Structure:
{
  symbol: string
  currentPrice: number
  ohlcv: OHLCV[]
  indicators: {
    sma20: number
    sma50: number
    rsi: number
    macd: { line: number, signal: number, histogram: number }
  }
  signals: {
    bullish: boolean
    bearish: boolean
    strength: number
  }
  lastUpdate: timestamp
}
```

#### Portfolio Context
```
Responsibilities:
├─ Track open positions
├─ Maintain account balance
├─ Calculate portfolio metrics
├─ Monitor position P&L
└─ Record trade history

State Structure:
{
  accountId: string
  balance: number
  positions: {
    [symbol]: {
      size: number
      entryPrice: number
      currentPrice: number
      pnl: number
      pnlPercent: number
      side: "long" | "short"
      timestamp: timestamp
    }
  }
  metrics: {
    totalValue: number
    usedMargin: number
    availableMargin: number
    sharpeRatio: number
    maxDrawdown: number
  }
  trades: Trade[]
}
```

#### Risk Context
```
Responsibilities:
├─ Enforce position size limits
├─ Monitor portfolio exposure
├─ Check leverage limits
├─ Validate stop-loss levels
└─ Calculate Value at Risk

State Structure:
{
  accountId: string
  limits: {
    maxPositionSize: number
    maxLeverage: number
    maxDrawdown: number
    maxDailyLoss: number
    maxCorrelation: number
  }
  current: {
    totalExposure: number
    currentLeverage: number
    currentDrawdown: number
    dailyLoss: number
    correlationRisk: number
  }
  violations: RiskViolation[]
}
```

#### Research Context
```
Responsibilities:
├─ Query Indigo AI for narrative analysis
├─ Screen projects with surging momentum
├─ Identify emerging opportunities
├─ Generate alpha signals
└─ Track narrative-driven trends

State Structure:
{
  narratives: {
    [narrative]: {
      description: string
      strength: number
      relatedProjects: string[]
      sentiment: "bullish" | "neutral" | "bearish"
      lastUpdated: timestamp
    }
  }
  trendingProjects: Project[]
  alphaSignals: AlphaSignal[]
  researchCost: number
}
```

#### Trading Context
```
Responsibilities:
├─ Orchestrate trading decisions
├─ Compose all other contexts
├─ Generate trade setups
└─ Execute trades through actions

Composition:
- Pulls market signals from Market Context
- Checks portfolio state from Portfolio Context
- Validates against Risk Context
- Incorporates research signals from Research Context
- Generates trade recommendation
```

### B. Actions (Agent Capabilities)

Actions are what the agent can DO. They're triggered by LLM reasoning and execute specific operations.

#### ExecuteTrade Action
```typescript
interface ExecuteTradeAction {
  name: "execute_trade"
  input: {
    symbol: string
    side: "buy" | "sell"
    size: number
    type: "market" | "limit"
    price?: number
    stopLoss: number
    takeProfit: number
  }
  process: () => {
    // 1. Validate against Risk Context
    // 2. Calculate position size
    // 3. Place order on exchange
    // 4. Record in Portfolio Context
    // 5. Update Trading Context
  }
  output: {
    orderId: string
    status: "filled" | "pending"
    executedPrice: number
    timestamp: timestamp
  }
}
```

#### ClosePosition Action
```typescript
interface ClosePositionAction {
  name: "close_position"
  input: {
    symbol: string
    reason: "take_profit" | "stop_loss" | "manual"
  }
  process: () => {
    // 1. Get position from Portfolio Context
    // 2. Place closing order
    // 3. Calculate P&L
    // 4. Update Portfolio Context
  }
  output: {
    exitPrice: number
    pnl: number
    pnlPercent: number
  }
}
```

#### RebalancePortfolio Action
```typescript
interface RebalancePortfolioAction {
  name: "rebalance_portfolio"
  input: {
    targetAllocation: { [symbol]: number }
  }
  process: () => {
    // 1. Analyze current vs target
    // 2. Generate rebalancing trades
    // 3. Execute trades
    // 4. Update Portfolio Context
  }
  output: {
    trades: Trade[]
    newAllocation: { [symbol]: number }
  }
}
```

#### RiskManagement Action
```typescript
interface RiskManagementAction {
  name: "risk_management"
  input: {
    riskLevel: "high" | "critical"
  }
  process: () => {
    // 1. Evaluate risk level
    // 2. Close high-risk positions
    // 3. Reduce leverage
    // 4. Update Risk Context
  }
  output: {
    positionsClosed: string[]
    newLeverage: number
  }
}
```

### C. Inputs (How Agent Listens)

Inputs are data sources that trigger agent reasoning.

#### Market Data Stream Input
```typescript
interface MarketDataStreamInput {
  type: "market_data_stream"
  source: "exchange_websocket"
  data: {
    symbol: string
    price: number
    volume: number
    timestamp: timestamp
  }
  trigger: "price_update" | "volume_spike" | "volatility_change"
}
```

#### Price Update Input
```typescript
interface PriceUpdateInput {
  type: "price_update"
  symbol: string
  price: number
  change: number
  changePercent: number
  timestamp: timestamp
}
```

#### Risk Alert Input
```typescript
interface RiskAlertInput {
  type: "risk_alert"
  level: "warning" | "critical"
  reason: string
  affectedPositions: string[]
}
```

### D. Outputs (How Agent Responds)

Outputs are how the agent communicates results.

#### Trade Orders Output
```typescript
interface TradeOrdersOutput {
  type: "trade_orders"
  orders: {
    symbol: string
    side: "buy" | "sell"
    size: number
    price: number
    orderId: string
    status: "pending" | "filled"
  }[]
  timestamp: timestamp
}
```

#### Portfolio Report Output
```typescript
interface PortfolioReportOutput {
  type: "portfolio_report"
  summary: {
    totalValue: number
    dayPnL: number
    dayPnLPercent: number
    positions: number
  }
  positions: Position[]
  metrics: PortfolioMetrics
  timestamp: timestamp
}
```

## x402 Integration Architecture

### Payment Flow Integration

```
Agent Execution Cycle:
┌─────────────────────────────────────────────────────────┐
│ 1. START CYCLE                                          │
│    - Fetch market data                                  │
│    - Analyze positions                                  │
│    - Generate signals                                   │
│    - Estimated compute: 0.1 x402                        │
├─────────────────────────────────────────────────────────┤
│ 2. PAYMENT VALIDATION                                   │
│    - Check wallet balance                               │
│    - Verify sufficient x402                             │
│    - Estimate gas costs                                 │
├─────────────────────────────────────────────────────────┤
│ 3. EXECUTE PAYMENT                                      │
│    - Sign transaction with private key                  │
│    - Submit to x402 network                             │
│    - Wait for confirmation                              │
├─────────────────────────────────────────────────────────┤
│ 4. CONDITIONAL EXECUTION                                │
│    - If payment successful:                             │
│      → Execute trades                                   │
│      → Update portfolio                                 │
│      → Log cycle                                        │
│    - If payment failed:                                 │
│      → Pause agent                                      │
│      → Alert user                                       │
│      → Retry next cycle                                 │
├─────────────────────────────────────────────────────────┤
│ 5. CYCLE COMPLETE                                       │
│    - Record metrics                                     │
│    - Schedule next cycle                                │
└─────────────────────────────────────────────────────────┘
```

### x402 Components

#### Wallet Manager
```typescript
interface WalletManager {
  address: string
  getBalance(): Promise<number>
  getHistory(): Promise<Transaction[]>
  validateAddress(address: string): boolean
}
```

#### Payment Handler
```typescript
interface PaymentHandler {
  makePayment(amount: number): Promise<{
    txHash: string
    status: "pending" | "confirmed" | "failed"
    timestamp: timestamp
  }>
  estimateGas(amount: number): Promise<number>
  retryPayment(txHash: string): Promise<boolean>
}
```

#### Billing Tracker
```typescript
interface BillingTracker {
  recordCost(cycle: number, cost: number): void
  getCycleCost(cycle: number): number
  getTotalCost(): number
  getCostPerTrade(): number
  getProjectedMonthly(): number
}
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ MARKET DATA STREAM (WebSocket)                              │
│ Real-time price updates, volume, order book                 │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ MARKET CONTEXT                                              │
│ - Fetch OHLCV data                                          │
│ - Calculate indicators (SMA, RSI, MACD)                     │
│ - Generate signals (bullish/bearish)                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ RESEARCH CONTEXT (x402 Integration)                         │
│ - Query Indigo AI for narratives                            │
│ - Screen trending projects                                  │
│ - Generate alpha signals                                    │
│ - Track emerging opportunities                              │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ TRADING CONTEXT (Composition)                               │
│ Combines:                                                   │
│ - Market Context (technical signals)                        │
│ - Research Context (fundamental/narrative signals)          │
│ - Portfolio Context (positions, balance)                    │
│ - Risk Context (limits, exposure)                           │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ LLM REASONING (Dreams Router with x402)                     │
│ ├─ Primary: GPT-4o (OpenAI) - $0.10                         │
│ ├─ Fallback: Claude 3.5 (Anthropic) - $0.05                │
│ ├─ Fallback: Gemini 2.5 (Google) - $0.02                   │
│ └─ Fallback: Llama 3.1 (Groq) - $0.01                       │
│                                                             │
│ "Given market signals, current positions, and risk limits,  │
│  should I execute a trade? Which action?"                   │
│                                                             │
│ Balance Check: Ensure sufficient USDC before decision       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
        ┌──────────────┴──────────────┬──────────────┐
        ↓                             ↓              ↓
   ┌─────────────┐          ┌──────────────┐  ┌──────────────┐
   │ExecuteTrade │          │ClosePosition │  │RiskManagement│
   │   Action    │          │   Action     │  │   Action     │
   └──────┬──────┘          └──────┬───────┘  └──────┬───────┘
          ↓                        ↓                 ↓
   ┌─────────────────────────────────────────────────────────┐
   │ EXCHANGE ADAPTER                                        │
   │ - Place orders                                          │
   │ - Get order status                                      │
   │ - Fetch account info                                    │
   └──────┬──────────────────────────────────────────────────┘
          ↓
   ┌─────────────────────────────────────────────────────────┐
   │ EXCHANGE (Binance, Kraken, etc.)                        │
   │ - Execute orders                                        │
   │ - Update positions                                      │
   └──────┬──────────────────────────────────────────────────┘
          ↓
   ┌─────────────────────────────────────────────────────────┐
   │ PORTFOLIO CONTEXT UPDATE                                │
   │ - Record trade                                          │
   │ - Update positions                                      │
   │ - Calculate P&L                                         │
   └──────┬──────────────────────────────────────────────────┘
          ↓
   ┌─────────────────────────────────────────────────────────┐
   │ OUTPUT GENERATION                                       │
   │ - Trade confirmation                                    │
   │ - Portfolio report                                      │
   │ - Risk alerts                                           │
   └──────┬──────────────────────────────────────────────────┘
          ↓
   ┌─────────────────────────────────────────────────────────┐
   │ x402 PAYMENT                                            │
   │ - Calculate compute cost                                │
   │ - Verify balance                                        │
   │ - Execute payment                                       │
   │ - Record transaction                                    │
   └─────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Foundation
1. Set up Daydream project
2. Create Market Context
3. Implement exchange adapter
4. Add basic market data fetching

### Phase 2: Core Agent
1. Create Portfolio Context
2. Create Risk Context
3. Implement actions
4. Set up context composition

### Phase 3: Intelligence
1. Integrate GPT-4 for reasoning
2. Implement trading strategy
3. Add signal generation
4. Create Trading Context

### Phase 4: x402 Integration
1. Implement payment handler
2. Add wallet management
3. Integrate billing tracking
4. Add payment verification

### Phase 5: Testing & Deployment
1. Unit tests for each component
2. Integration tests
3. Backtesting
4. Production deployment

## Error Handling & Resilience

### Retry Logic
- Failed payments: Retry up to 3 times
- Failed trades: Log and alert
- Connection failures: Exponential backoff

### Monitoring
- Track all x402 payments
- Monitor trade execution latency
- Alert on risk violations
- Log all decisions

### Fallbacks
- Use REST API if WebSocket fails
- Manual intervention if agent pauses
- Emergency stop if risk critical
