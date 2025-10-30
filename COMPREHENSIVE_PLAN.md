# Comprehensive Hyperliquid Trading Agent Plan

## Executive Summary

After studying all reference materials, here's the complete picture:

1. **Daydreams** = Framework for building stateful AI agents with composable contexts
2. **Dreams Router** = LLM API endpoint that supports x402 payments (pay-per-use)
3. **x402** = HTTP payment protocol for micropayments (USDC on Base)
4. **Nocturne** = Proven Hyperliquid trading agent (Python) - patterns to adopt
5. **aixbtc** = Market analysis API with x402 payment support

---

## Current State vs. Required State

### ❌ Current Issues

1. **No Real x402 Payments**
   - Agent doesn't actually spend USDC for LLM calls
   - No payment generation or verification
   - No balance checking before requests

2. **No Real Hyperliquid Trading**
   - Orders are simulated, not executed
   - No real position tracking
   - No actual PnL calculation

3. **No Real Market Data**
   - Using mock indicators
   - Not calling real market APIs
   - No funding rate data

4. **No Real LLM Decisions**
   - LLM calls fail silently
   - Falls back to mock decisions
   - No structured prompting

### ✅ What We Need

1. **Real x402 Payment Flow**
   - Generate valid x402 payment headers
   - Deduct USDC from wallet for each API call
   - Track spending and balance

2. **Real Hyperliquid Integration**
   - Execute actual trades on Hyperliquid
   - Track real positions and PnL
   - Manage risk properly

3. **Real Market Data**
   - Fetch indicators from TAAPI or similar
   - Get funding rates from Hyperliquid
   - Call aixbtc for market analysis

4. **Real LLM Decisions**
   - Call Dreams Router with x402 payments
   - Use structured system prompt (like Nocturne)
   - Parse and execute decisions

---

## Complete Agent Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INITIALIZATION                                           │
│ - Load wallet with USDC balance                            │
│ - Connect to Hyperliquid API                               │
│ - Initialize Dreams Router client                          │
│ - Load trading system prompt                               │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│ 2. TRADING LOOP (Every 60 seconds)                         │
│                                                             │
│ a) FETCH REAL DATA                                         │
│    - Get Hyperliquid account state (balance, positions)    │
│    - Get current prices for held assets                    │
│    - Get funding rates                                     │
│                                                             │
│ b) FETCH MARKET ANALYSIS (via x402)                        │
│    - Call aixbtc for sentiment/analysis                    │
│    - Cost: ~$0.01 USDC per asset                          │
│    - Deduct from wallet balance                            │
│                                                             │
│ c) FETCH TECHNICAL INDICATORS (via x402 or free API)       │
│    - Get RSI, MACD, EMA for each asset                     │
│    - Multiple timeframes (5m, 4h)                          │
│                                                             │
│ d) BUILD LLM CONTEXT                                       │
│    - Current balance                                       │
│    - Open positions with entry/current prices             │
│    - Technical indicators                                  │
│    - Market sentiment from aixbtc                          │
│    - Funding rates                                         │
│                                                             │
│ e) CALL LLM VIA x402 (Dreams Router)                       │
│    - Generate x402 payment header                          │
│    - Cost: ~$0.10 USDC per call                           │
│    - Deduct from wallet balance                            │
│    - Send context + system prompt                          │
│    - Get trading decisions (BUY/SELL/HOLD)                │
│                                                             │
│ f) EXECUTE DECISIONS                                       │
│    - For each BUY: Place order on Hyperliquid             │
│    - For each SELL: Close position on Hyperliquid         │
│    - Track order IDs and execution                         │
│                                                             │
│ g) UPDATE STATE                                            │
│    - Log decision to diary                                 │
│    - Update PnL calculations                               │
│    - Track spending                                        │
│                                                             │
│ h) DISPLAY ON DASHBOARD                                    │
│    - Show decisions with reasoning                         │
│    - Show market insights                                  │
│    - Show PnL and balance                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 └─ Loop back to step 2a
```

---

## Implementation Phases

### Phase 1: Fix x402 Payment System (2 hours)

**Goal:** Agent actually spends USDC for API calls

**Tasks:**
1. Fix x402-llm-client.ts
   - Use `@daydreamsai/ai-sdk-provider` properly
   - Generate valid x402 payment headers
   - Send to Dreams Router with X-Payment header

2. Implement balance checking
   - Get USDC balance from Base wallet
   - Check before each API call
   - Prevent overspending

3. Track spending
   - Log each payment
   - Update balance after each call
   - Show spending in dashboard

**Key Code Pattern:**
```typescript
import { generateX402Payment } from "@daydreamsai/ai-sdk-provider";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(privateKey);
const paymentHeader = await generateX402Payment(account, {
  amount: "100000", // $0.10 USDC (6 decimals)
  network: "base", // or "base-sepolia"
});

const response = await fetch(
  "https://router.daydreams.systems/v1/chat/completions",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Payment": paymentHeader,
    },
    body: JSON.stringify({
      model: "openai/gpt-4-turbo",
      messages: [...]
    }),
  }
);
```

### Phase 2: Implement Real Hyperliquid Trading (2 hours)

**Goal:** Agent executes actual trades on Hyperliquid

**Tasks:**
1. Install Hyperliquid SDK
   ```bash
   npm install hyperliquid
   ```

2. Implement real order execution
   - Use Hyperliquid SDK to place orders
   - Track order IDs and status
   - Calculate real PnL

3. Implement position tracking
   - Get real positions from Hyperliquid
   - Calculate unrealized PnL
   - Track entry prices

**Key Code Pattern:**
```typescript
import { Exchange, Info } from "hyperliquid";

const exchange = new Exchange({
  walletAddress: config.HYPERLIQUID_WALLET_ADDRESS,
  privateKey: config.HYPERLIQUID_PRIVATE_KEY,
});

// Place order
const orderResult = await exchange.placeOrder({
  coin: "BTC",
  is_buy: true,
  sz: 0.01,
  limit_px: 45000,
  order_type: "Limit",
  reduce_only: false,
});

// Get positions
const info = new Info();
const positions = await info.userState(config.HYPERLIQUID_WALLET_ADDRESS);
```

### Phase 3: Integrate Market Data (1 hour)

**Goal:** Fetch real market data and insights

**Tasks:**
1. Fetch technical indicators
   - Use TAAPI or similar free API
   - Get RSI, MACD, EMA, ATR
   - Cache results to save API calls

2. Fetch market insights via x402
   - Call aixbtc API with x402 payment
   - Get sentiment and analysis
   - Include in LLM context

3. Get funding rates
   - Fetch from Hyperliquid API
   - Include in trading context

### Phase 4: Implement Structured Prompting (1 hour)

**Goal:** LLM makes intelligent trading decisions

**Tasks:**
1. Create system prompt (like Nocturne)
   - Encode trading discipline
   - Risk management rules
   - Position management rules
   - Exit plan tracking

2. Structure context payload
   - Current balance
   - Open positions
   - Technical indicators
   - Market sentiment
   - Funding rates

3. Parse LLM response
   - Extract decisions (BUY/SELL/HOLD)
   - Extract reasoning
   - Extract price targets

### Phase 5: Dashboard Integration (1 hour)

**Goal:** Display real trading activity

**Tasks:**
1. Show real decisions
   - LLM reasoning
   - Market insights
   - Price targets

2. Show real PnL
   - Unrealized PnL
   - Realized PnL
   - Win rate

3. Show spending
   - x402 payments made
   - Balance remaining
   - Cost per trade

---

## Critical Success Factors

1. **x402 Payment Generation**
   - Must use correct library: `@daydreamsai/ai-sdk-provider`
   - Must sign with correct private key
   - Must deduct from wallet balance

2. **Hyperliquid Integration**
   - Must use official SDK
   - Must handle order execution properly
   - Must track positions accurately

3. **System Prompt**
   - Must encode trading discipline (like Nocturne)
   - Must prevent overtrading
   - Must enforce risk management

4. **Error Handling**
   - Graceful fallback if x402 payment fails
   - Retry logic for API calls
   - Balance checking before requests

---

## Timeline

| Phase | Tasks | Duration | Status |
|-------|-------|----------|--------|
| 1 | Fix x402 payments | 2 hours | TODO |
| 2 | Real Hyperliquid trading | 2 hours | TODO |
| 3 | Market data integration | 1 hour | TODO |
| 4 | Structured prompting | 1 hour | TODO |
| 5 | Dashboard integration | 1 hour | TODO |
| **Total** | | **7 hours** | |

---

## Environment Setup

Required in `.env`:

```bash
# Hyperliquid
HYPERLIQUID_PRIVATE_KEY=0x...
HYPERLIQUID_WALLET_ADDRESS=0x...
HYPERLIQUID_NETWORK=mainnet

# x402 Payments (on Base)
X402_PRIVATE_KEY=0x...
X402_WALLET_ADDRESS=0x...
X402_NETWORK=base

# Dreams Router
DREAMS_ROUTER_URL=https://router.daydreams.systems

# Market Data
TAAPI_API_KEY=... (optional, for indicators)

# Trading
TRADING_INTERVAL_MS=60000
TRADING_ASSETS=BTC,ETH
```

---

## Success Metrics

✅ Agent spends real USDC for API calls
✅ Agent executes real trades on Hyperliquid
✅ Agent tracks real PnL
✅ Dashboard shows real decisions and spending
✅ Agent makes intelligent trading decisions based on LLM

---

## Next Steps

1. **Immediate:** Fix x402 payment generation
2. **Then:** Implement real Hyperliquid trading
3. **Then:** Integrate market data
4. **Then:** Test end-to-end on testnet
5. **Finally:** Deploy to mainnet

Ready to proceed with Phase 1?
