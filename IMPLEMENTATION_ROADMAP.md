# Implementation Roadmap

## Overview
This document provides a step-by-step implementation guide for building the AI trading agent using Daydream and x402.

## Phase 1: Project Setup & Foundation

### 1.1 Initialize Daydream Project
```bash
npm create daydream-app@latest trading-agent
cd trading-agent
npm install
```

### 1.2 Project Structure
```
trading-agent/
├── src/
│   ├── agent/
│   │   ├── index.ts              # Main agent entry
│   │   ├── contexts/
│   │   ├── actions/
│   │   ├── inputs/
│   │   └── outputs/
│   ├── exchange/
│   ├── x402/
│   ├── strategy/
│   └── utils/
├── tests/
├── config/
├── .env
├── package.json
└── tsconfig.json
```

### 1.3 Install Dependencies
```json
{
  "dependencies": {
    "@daydreams/sdk": "^0.1.0",
    "openai": "^4.0.0",
    "ccxt": "^3.0.0",
    "ethers": "^6.0.0",
    "dotenv": "^16.0.0",
    "axios": "^1.0.0",
    "pino": "^8.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### 1.4 Environment Configuration
Create `.env`:
```
# Daydream
DAYDREAM_API_KEY=your_key
DAYDREAM_MODEL=gpt-4

# Exchange
EXCHANGE_NAME=binance
EXCHANGE_API_KEY=your_key
EXCHANGE_SECRET=your_secret

# x402
X402_WALLET_ADDRESS=0x...
X402_PRIVATE_KEY=0x...
X402_RPC_URL=https://...

# Trading
TRADING_PAIRS=BTC/USDT,ETH/USDT
RISK_PERCENTAGE=1.0
LEVERAGE=10
```

---

## Phase 2: Build Contexts (Stateful Workspaces)

### 2.1 Market Context
**File**: `src/agent/contexts/market.ts`

**Responsibilities**:
- Fetch OHLCV data from exchange
- Calculate technical indicators
- Generate trading signals
- Track market state

**Implementation Steps**:
1. Define state interface
2. Implement data fetching
3. Add indicator calculations
4. Create signal generation
5. Export context

**Key Methods**:
```typescript
- fetchOHLCV(symbol, timeframe, limit)
- calculateIndicators(ohlcv)
- generateSignals(indicators)
- getMarketState()
```

### 2.2 Research Context
**File**: `src/agent/contexts/research.ts`

**Responsibilities**:
- Query Indigo AI for narrative analysis
- Screen projects with surging momentum
- Generate alpha signals
- Cache research to minimize costs

**Implementation Steps**:
1. Set up x402 client
2. Implement Indigo AI queries
3. Implement Projects API screening
4. Add caching layer
5. Create alpha signal generation
6. Export context

**Key Methods**:
```typescript
- getNarrativeAnalysis(query)
- screenProjects(filters)
- getTrendingProjects(limit)
- generateAlphaSignals()
- monitorProject(ticker)
- getState()
```

### 2.3 Portfolio Context
**File**: `src/agent/contexts/portfolio.ts`

**Responsibilities**:
- Track open positions
- Monitor account balance
- Calculate P&L
- Maintain trade history

**Implementation Steps**:
1. Define position interface
2. Implement balance tracking
3. Add P&L calculations
4. Create trade recording
5. Export context

**Key Methods**:
```typescript
- getPositions()
- getBalance()
- calculatePnL(symbol)
- recordTrade(trade)
- getTradeHistory()
```

### 2.4 Risk Context
**File**: `src/agent/contexts/risk.ts`

**Responsibilities**:
- Enforce position limits
- Monitor exposure
- Check leverage
- Validate trades

**Implementation Steps**:
1. Define risk limits
2. Implement exposure calculation
3. Add validation logic
4. Create alert system
5. Export context

**Key Methods**:
```typescript
- validateTrade(trade)
- checkExposure()
- checkLeverage()
- calculateVaR()
- getRiskStatus()
```

### 2.5 Trading Context
**File**: `src/agent/contexts/trading.ts`

**Responsibilities**:
- Compose all contexts
- Generate trade setups
- Orchestrate decisions
- Prepare for LLM reasoning

**Implementation Steps**:
1. Compose Market, Research, Portfolio, Risk contexts
2. Implement setup generation
3. Add decision preparation
4. Create reasoning prompt
5. Export context

**Key Methods**:
```typescript
- composeContexts()
- generateSetup(symbol)
- prepareForLLM()
- getTradingState()
```

---

## Phase 3: Build Actions (Agent Capabilities)

### 3.1 ExecuteTrade Action
**File**: `src/agent/actions/execute-trade.ts`

**Input**:
```typescript
{
  symbol: string
  side: "buy" | "sell"
  size: number
  type: "market" | "limit"
  stopLoss: number
  takeProfit: number
}
```

**Process**:
1. Validate against Risk Context
2. Calculate position size
3. Place order on exchange
4. Record in Portfolio Context
5. Return confirmation

### 3.2 ClosePosition Action
**File**: `src/agent/actions/close-position.ts`

**Input**:
```typescript
{
  symbol: string
  reason: "take_profit" | "stop_loss" | "manual"
}
```

**Process**:
1. Get position from Portfolio
2. Place closing order
3. Calculate P&L
4. Update Portfolio
5. Return exit details

### 3.3 RebalancePortfolio Action
**File**: `src/agent/actions/rebalance.ts`

**Input**:
```typescript
{
  targetAllocation: { [symbol]: number }
}
```

**Process**:
1. Analyze current vs target
2. Generate rebalancing trades
3. Execute trades
4. Update Portfolio
5. Return summary

### 3.4 RiskManagement Action
**File**: `src/agent/actions/risk-management.ts`

**Input**:
```typescript
{
  riskLevel: "high" | "critical"
}
```

**Process**:
1. Evaluate risk level
2. Close high-risk positions
3. Reduce leverage
4. Update Risk Context
5. Return actions taken

### 3.5 ResearchTrade Action
**File**: `src/agent/actions/research-trade.ts`

**Input**:
```typescript
{
  symbol: string
  signal: AlphaSignal
  size: number
}
```

**Process**:
1. Validate research signal confidence
2. Execute trade based on signal
3. Record research source
4. Update Portfolio Context
5. Return execution details

---

## Phase 4: Build Inputs & Outputs

### 4.1 Market Data Stream Input
**File**: `src/agent/inputs/market-stream.ts`

**Implementation**:
- Connect to exchange WebSocket
- Stream price updates
- Trigger agent on significant moves
- Handle reconnection

### 4.2 Price Updates Input
**File**: `src/agent/inputs/price-updates.ts`

**Implementation**:
- Monitor for price changes
- Check stop-loss/take-profit
- Trigger risk alerts
- Queue for processing

### 4.3 Trade Orders Output
**File**: `src/agent/outputs/trade-orders.ts`

**Implementation**:
- Format trade confirmations
- Send to logging system
- Store in database
- Notify user

### 4.4 Portfolio Reports Output
**File**: `src/agent/outputs/reports.ts`

**Implementation**:
- Generate daily reports
- Calculate metrics
- Format for display
- Archive reports

---

## Phase 5: Exchange Integration

### 5.1 Exchange Adapter
**File**: `src/exchange/adapter.ts`

**Responsibilities**:
- Initialize CCXT exchange
- Normalize API responses
- Handle errors
- Implement retry logic

**Key Methods**:
```typescript
- initialize()
- fetchTicker(symbol)
- fetchBalance()
- createOrder(...)
- cancelOrder(...)
- fetchOrder(...)
```

### 5.2 Market Data Fetcher
**File**: `src/exchange/market-data.ts`

**Responsibilities**:
- Fetch OHLCV data
- Manage data caching
- Handle rate limits
- Implement fallbacks

### 5.3 Order Execution
**File**: `src/exchange/orders.ts`

**Responsibilities**:
- Place orders
- Track order status
- Handle partial fills
- Implement stop-loss/take-profit

---

## Phase 6: x402 Integration

### 6.1 Payment Handler
**File**: `src/x402/payment-handler.ts`

**Responsibilities**:
- Execute x402 payments
- Handle transaction signing
- Verify payments
- Implement retry logic

**Key Methods**:
```typescript
- makePayment(amount)
- estimateGas(amount)
- verifyPayment(txHash)
- retryPayment(txHash)
```

### 6.2 Wallet Manager
**File**: `src/x402/wallet.ts`

**Responsibilities**:
- Manage wallet address
- Track balance
- Handle key management
- Implement security

**Key Methods**:
```typescript
- getBalance()
- getAddress()
- validateAddress()
- getTransactionHistory()
```

### 6.3 Billing Tracker
**File**: `src/x402/billing.ts`

**Responsibilities**:
- Track compute costs
- Calculate per-trade costs
- Project monthly costs
- Generate billing reports

**Key Methods**:
```typescript
- recordCost(cycle, cost)
- getCycleCost(cycle)
- getTotalCost()
- getProjectedMonthly()
```

---

## Phase 7: Main Agent Assembly

### 7.1 Create Main Agent
**File**: `src/agent/index.ts`

```typescript
import { createDreams } from "@daydreams/sdk"
import { marketContext } from "./contexts/market"
import { portfolioContext } from "./contexts/portfolio"
import { riskContext } from "./contexts/risk"
import { tradingContext } from "./contexts/trading"
import { executeTrade } from "./actions/execute-trade"
import { closePosition } from "./actions/close-position"
import { marketStream } from "./inputs/market-stream"
import { tradeOrders } from "./outputs/trade-orders"

export const tradingAgent = createDreams({
  model: openai("gpt-4"),
  contexts: [
    marketContext,
    portfolioContext,
    riskContext,
    tradingContext
  ],
  actions: [
    executeTrade,
    closePosition,
    rebalancePortfolio,
    riskManagement
  ],
  inputs: [
    marketStream,
    priceUpdates,
    riskAlerts
  ],
  outputs: [
    tradeOrders,
    portfolioReports
  ]
})
```

### 7.2 Main Loop
**File**: `src/index.ts`

```typescript
async function main() {
  const agent = tradingAgent
  
  while (true) {
    try {
      // 1. Check x402 balance
      const balance = await x402.getBalance()
      if (balance < MIN_BALANCE) {
        logger.error("Insufficient x402 balance")
        break
      }
      
      // 2. Execute agent cycle
      await agent.run()
      
      // 3. Process x402 payment
      const cost = await calculateCycleCost()
      await x402.makePayment(cost)
      
      // 4. Wait before next cycle
      await sleep(CYCLE_INTERVAL)
    } catch (error) {
      logger.error("Agent error:", error)
      await sleep(ERROR_RETRY_INTERVAL)
    }
  }
}

main()
```

---

## Phase 8: Testing

### 8.1 Unit Tests
- Test each context independently
- Test each action independently
- Test utility functions
- Mock external APIs

### 8.2 Integration Tests
- Test context composition
- Test action execution
- Test exchange integration
- Test x402 payments

### 8.3 End-to-End Tests
- Test full trading cycle
- Test error scenarios
- Test recovery mechanisms
- Test performance

### 8.4 Backtesting
- Implement backtest engine
- Test strategy on historical data
- Optimize parameters
- Validate performance

---

## Phase 9: Deployment

### 9.1 Production Configuration
- Set production environment variables
- Configure logging
- Set up monitoring
- Configure alerts

### 9.2 Deployment Steps
1. Build TypeScript
2. Run tests
3. Deploy to server
4. Start agent
5. Monitor performance

### 9.3 Monitoring
- Track trade execution
- Monitor x402 payments
- Alert on errors
- Log all decisions

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Initialize Daydream project
- [ ] Set up project structure
- [ ] Install dependencies
- [ ] Configure environment

### Phase 2: Contexts
- [ ] Market Context
- [ ] Research Context (x402 Integration)
- [ ] Portfolio Context
- [ ] Risk Context
- [ ] Trading Context

### Phase 3: Actions
- [ ] ExecuteTrade Action
- [ ] ClosePosition Action
- [ ] RebalancePortfolio Action
- [ ] RiskManagement Action
- [ ] ResearchTrade Action

### Phase 4: Inputs/Outputs
- [ ] Market Stream Input
- [ ] Price Updates Input
- [ ] Trade Orders Output
- [ ] Portfolio Reports Output

### Phase 5: Exchange
- [ ] Exchange Adapter
- [ ] Market Data Fetcher
- [ ] Order Execution

### Phase 6: x402
- [ ] Payment Handler
- [ ] Wallet Manager
- [ ] Billing Tracker

### Phase 7: Assembly
- [ ] Main Agent
- [ ] Main Loop
- [ ] Error Handling

### Phase 8: Testing
- [ ] Unit Tests
- [ ] Integration Tests
- [ ] E2E Tests
- [ ] Backtesting

### Phase 9: Deployment
- [ ] Production Config
- [ ] Deploy
- [ ] Monitor

---

## Estimated Timeline

- **Phase 1**: 1 day
- **Phase 2**: 3 days
- **Phase 3**: 2 days
- **Phase 4**: 1 day
- **Phase 5**: 2 days
- **Phase 6**: 2 days
- **Phase 7**: 1 day
- **Phase 8**: 3 days
- **Phase 9**: 1 day

**Total**: ~2 weeks for MVP

---

## Success Criteria

1. ✅ Agent successfully connects to exchange
2. ✅ Agent fetches market data
3. ✅ Agent generates trading signals
4. ✅ Agent executes trades
5. ✅ Agent manages positions
6. ✅ Agent processes x402 payments
7. ✅ Agent runs for 24+ hours without errors
8. ✅ Agent achieves positive Sharpe ratio in backtest
