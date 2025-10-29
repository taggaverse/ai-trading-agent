# Learning Path: Dreams Router + Full Architecture

## 📚 Complete Learning Guide (3-4 hours)

This guide combines Dreams Router setup with the full system architecture so you understand how everything works together.

---

## Part 1: Dreams Router Fundamentals (45 min)

### What is Dreams Router?

**Simple Definition**: A gateway that lets you access multiple AI models (GPT-4, Claude, Gemini, Llama) through one API, paying with x402 USDC micropayments.

**Why It Matters**:
- Multiple AI providers = automatic fallbacks = 99.9% uptime
- Pay-per-use = only pay for decisions you make
- x402 integration = blockchain-verified payments

### How It Works (Architecture)

```
Your Trading Agent
    ↓
Dreams Router (router.daydreams.systems)
    ↓
Provider Selection
├─ Primary: GPT-4o (OpenAI) - $0.10
├─ Fallback: Claude 3.5 (Anthropic) - $0.05
├─ Fallback: Gemini 2.5 (Google) - $0.02
└─ Fallback: Llama 3.1 (Groq) - $0.01
    ↓
x402 USDC Payment
    ↓
Response Back to Agent
```

### Key Concepts

**1. Model Routing**
- You request a model
- Router checks availability
- Uses primary if available
- Falls back if primary fails
- Returns response in OpenAI format

**2. x402 Payments**
- Each decision costs $0.01-$0.10
- Automatic USDC deduction
- Blockchain-verified
- Transparent pricing

**3. Balance Management**
- Check balance before decision
- Auto-refill when low
- Track spending
- Monitor projections

---

## Part 2: Dreams Router Setup (45 min)

### Step 1: Get x402 Wallet

You need:
- Wallet address (public)
- Private key (secret)
- USDC balance on Base Sepolia (testnet) or Base (mainnet)

```bash
# Option A: Use existing wallet
# Export from MetaMask, Phantom, etc.

# Option B: Create new wallet
# Use ethers.js or web3.py
```

### Step 2: Configure Environment

Create `.env`:
```bash
# Dreams Router
DREAMS_ROUTER_URL=https://router.daydreams.systems

# x402 / USDC
X402_WALLET_ADDRESS=0x...your_address...
X402_PRIVATE_KEY=0x...your_private_key...
X402_NETWORK=base-sepolia  # or "base" for mainnet

# Balance Management
MIN_BALANCE_USDC=1.0
REFILL_THRESHOLD_USDC=2.0
REFILL_AMOUNT_USDC=10.0

# Cost Per Decision
COST_PER_DECISION_USDC=0.10
```

### Step 3: Initialize Dreams Router

```typescript
// src/agent/router.ts
import { createDreamsRouterAuth } from "@daydreamsai/router"
import { getAccount } from "@daydreamsai/x402"

export async function initializeDreamsRouter() {
  // Get x402 account
  const account = await getAccount({
    privateKey: process.env.X402_PRIVATE_KEY,
    walletAddress: process.env.X402_WALLET_ADDRESS
  })

  // Create router with x402 payments
  const { dreamsRouter } = await createDreamsRouterAuth(account, {
    payments: {
      amount: "100000", // $0.10 USDC per request
      network: process.env.X402_NETWORK
    }
  })

  return { dreamsRouter, account }
}
```

### Step 4: Create Model Array

```typescript
// src/agent/models.ts
import { dreamsRouter } from "@daydreamsai/router"

export const tradingModels = {
  // For quick decisions (< 1 second)
  quick: dreamsRouter("groq/llama-3.1-405b-reasoning"), // $0.01
  
  // For standard decisions (< 5 seconds)
  standard: dreamsRouter("openai/gpt-4o"), // $0.10
  
  // For complex analysis (< 10 seconds)
  complex: dreamsRouter("anthropic/claude-3-5-sonnet-20241022"), // $0.05
  
  // For fast analysis
  fast: dreamsRouter("google-vertex/gemini-2.5-flash") // $0.02
}

// Model selection by urgency
export function selectModel(urgency: "low" | "medium" | "high" | "critical") {
  switch (urgency) {
    case "critical":
      return tradingModels.quick // Fastest
    case "high":
      return tradingModels.fast // Fast
    case "medium":
      return tradingModels.standard // Best quality
    case "low":
      return tradingModels.complex // Best reasoning
  }
}
```

### Step 5: Implement Balance Management

```typescript
// src/agent/balance-manager.ts
import { getAccount } from "@daydreamsai/x402"

export class BalanceManager {
  private account: any
  private minBalance: bigint = BigInt("1000000") // $1.00 USDC
  private costPerDecision: bigint = BigInt("100000") // $0.10

  async initialize() {
    this.account = await getAccount({
      privateKey: process.env.X402_PRIVATE_KEY,
      walletAddress: process.env.X402_WALLET_ADDRESS
    })
  }

  // Get current balance in USDC
  async getBalance(): Promise<number> {
    const balance = await this.account.getBalance()
    return Number(balance) / 1000000 // Convert to USDC
  }

  // Check if we can make a decision
  async canMakeDecision(): Promise<boolean> {
    const balance = await this.account.getBalance()
    return balance > (this.minBalance + this.costPerDecision)
  }

  // Auto-refill if balance is low
  async checkAndRefill(): Promise<boolean> {
    const balance = await this.account.getBalance()
    
    if (balance < this.minBalance) {
      console.log(`⚠️ Balance low: $${Number(balance) / 1000000}`)
      
      try {
        // Refill to $10
        await this.account.refill(BigInt("10000000"))
        console.log("✅ Balance refilled to $10")
        return true
      } catch (error) {
        console.error("❌ Failed to refill:", error)
        return false
      }
    }
    
    return true
  }

  // Track spending
  async trackCost(decision: string, cost: bigint) {
    const balance = await this.getBalance()
    console.log(`
      Decision: ${decision}
      Cost: $${Number(cost) / 1000000}
      Balance: $${balance}
    `)
  }
}
```

---

## Part 3: Full System Architecture (1.5 hours)

### Layer 1: Input Layer

```
Market Data Stream (WebSocket)
├─ Real-time price updates
├─ Volume data
└─ Order book snapshots
    ↓
Price Updates (Significant movements)
    ↓
Risk Alerts (Limits approaching)
```

**What happens**: Exchange sends real-time data to your agent

### Layer 2: Context Layer (Daydreams)

Five stateful workspaces that maintain state:

```
MARKET CONTEXT
├─ Current price
├─ Technical indicators (SMA, RSI, MACD)
├─ Trading signals (bullish/bearish)
└─ Market volatility
    ↓
RESEARCH CONTEXT (x402)
├─ Indigo AI narratives
├─ Trending projects
├─ Alpha signals
└─ Narrative strength
    ↓
PORTFOLIO CONTEXT
├─ Open positions
├─ Account balance
├─ P&L calculations
└─ Trade history
    ↓
RISK CONTEXT
├─ Position limits
├─ Leverage limits
├─ Exposure calculations
└─ VaR (Value at Risk)
    ↓
TRADING CONTEXT (Composition)
├─ Combines all contexts
├─ Prepares data for LLM
└─ Validates trade setup
```

**What happens**: Each context maintains its own state and can be composed together

### Layer 3: Reasoning Layer (Dreams Router)

```
Trading Context Data
    ↓
Dreams Router
├─ Check x402 balance
├─ Select appropriate model
└─ Send to LLM
    ↓
LLM Decision Making
├─ Analyze technical signals
├─ Analyze research signals
├─ Check portfolio state
├─ Validate against risk limits
└─ Make trading decision
    ↓
x402 Payment
├─ Deduct USDC
├─ Record transaction
└─ Update balance
```

**What happens**: LLM reasons over all contexts and makes a decision, paying with x402

### Layer 4: Action Layer

```
LLM Decision
    ↓
Action Selection
├─ ExecuteTrade (open position)
├─ ClosePosition (exit trade)
├─ ResearchTrade (research-driven)
├─ Rebalance (adjust allocation)
└─ RiskManagement (reduce exposure)
```

**What happens**: Agent executes the appropriate action

### Layer 5: Execution Layer

```
Action
    ↓
Exchange Adapter (CCXT)
├─ Normalize API calls
├─ Handle errors
└─ Implement retry logic
    ↓
Exchange (Binance, Kraken, etc.)
├─ Place orders
├─ Update positions
└─ Confirm fills
```

**What happens**: Orders are placed on the exchange

### Layer 6: Update Layer

```
Order Execution
    ↓
Update Portfolio Context
├─ Record trade
├─ Update positions
├─ Calculate P&L
└─ Update balance
    ↓
Update Risk Context
├─ Recalculate exposure
├─ Check limits
└─ Update metrics
```

**What happens**: System state is updated with new information

### Layer 7: Output Layer

```
Updated State
    ↓
Generate Outputs
├─ Trade confirmations
├─ Portfolio reports
└─ Risk alerts
    ↓
Send to User/Monitoring
```

**What happens**: Results are communicated

---

## Part 4: How It All Works Together (30 min)

### Complete Trading Cycle

```
1. MARKET DATA ARRIVES
   WebSocket sends: BTC $45,000, volume spike
   
2. MARKET CONTEXT UPDATES
   Price: $45,000
   SMA20: $44,500
   SMA50: $44,000
   Signal: BULLISH (20 > 50)
   
3. RESEARCH CONTEXT QUERIES x402
   Indigo AI: "Restaking narrative gaining traction"
   Projects: "Bitcoin ETF approval rumors"
   Alpha Signal: BUY (confidence: 0.8)
   
4. PORTFOLIO CONTEXT CHECKS STATE
   Balance: $10,000
   Positions: None
   Available: $10,000
   
5. RISK CONTEXT VALIDATES
   Max position: $5,000 (1% risk)
   Max leverage: 10x
   Status: ✅ OK
   
6. TRADING CONTEXT COMPOSES
   Technical: BULLISH
   Research: BUY (0.8 confidence)
   Portfolio: Can trade
   Risk: Within limits
   
7. DREAMS ROUTER MAKES DECISION
   ✅ Balance check: $10,000 > $0.10 ✓
   ✅ Select model: GPT-4o (standard decision)
   ✅ Send to LLM: "Should I buy BTC?"
   ✅ LLM reasons: "Yes, strong signals"
   ✅ x402 payment: -$0.10 USDC
   ✅ New balance: $9,999.90
   
8. EXECUTE TRADE ACTION
   Buy 0.1 BTC at $45,000
   Order placed on Binance
   
9. UPDATE PORTFOLIO
   Position: 0.1 BTC @ $45,000
   Entry price: $45,000
   Stop loss: $44,100 (2%)
   Take profit: $46,350 (3%)
   
10. MONITOR POSITION
    Price moves to $45,500
    P&L: +$50
    Continue monitoring...
```

### Cost Breakdown for This Cycle

```
Decision cost: $0.10 (Dreams Router)
Research cost: $0.07 (x402 Indigo AI + Projects)
Total cycle cost: $0.17

If profitable trade: +$50
Net profit: $50 - $0.17 = $49.83
ROI: 29,300%
```

---

## Part 5: Model Selection Strategy

### When to Use Each Model

```
GROQ LLAMA 3.1 ($0.01)
├─ Quick market moves
├─ Emergency decisions
├─ High-frequency analysis
└─ Example: "Price spike, should I close?"

GOOGLE GEMINI 2.5 ($0.02)
├─ Fast analysis
├─ Standard decisions
├─ Good quality/speed ratio
└─ Example: "New project, should I research?"

CLAUDE 3.5 ($0.05)
├─ Complex reasoning
├─ Portfolio analysis
├─ Risk assessment
└─ Example: "Rebalance portfolio?"

GPT-4o ($0.10)
├─ Critical decisions
├─ Best reasoning
├─ Complex scenarios
└─ Example: "Major position change?"
```

### Smart Selection Logic

```typescript
function selectModel(context: {
  urgency: "low" | "medium" | "high" | "critical"
  complexity: "simple" | "moderate" | "complex"
  confidence: number
}) {
  // High urgency = speed
  if (context.urgency === "critical") {
    return groq // $0.01, fastest
  }
  
  // Low confidence = better model
  if (context.confidence < 0.5) {
    return gpt4o // $0.10, best reasoning
  }
  
  // Complex analysis = better model
  if (context.complexity === "complex") {
    return claude // $0.05, excellent reasoning
  }
  
  // Default = balanced
  return gemini // $0.02, good balance
}
```

---

## Part 6: Cost Optimization

### Strategy 1: Batch Decisions
```
❌ Bad: 100 individual decisions = $10
✅ Good: 10 portfolio-level decisions = $1
Savings: 90%
```

### Strategy 2: Cache Results
```
❌ Bad: Query same symbol 10 times = $1
✅ Good: Query once, cache 5 minutes = $0.10
Savings: 90%
```

### Strategy 3: Smart Model Selection
```
❌ Bad: Use GPT-4o for everything = $0.10 each
✅ Good: Use Groq for quick, Claude for complex = $0.04 avg
Savings: 60%
```

### Strategy 4: Conditional Decisions
```
❌ Bad: Decide on every price tick
✅ Good: Only decide when conditions met
Savings: 50-70%
```

---

## Part 7: Error Handling & Fallbacks

### Automatic Fallback Chain

```
Try GPT-4o
  ↓ (fails)
Try Claude 3.5
  ↓ (fails)
Try Gemini 2.5
  ↓ (fails)
Try Llama 3.1
  ↓ (fails)
Error: All models failed
```

### Retry Logic

```typescript
async function makeDecisionWithFallback(symbol: string) {
  const models = [
    dreamsRouter("openai/gpt-4o"),
    dreamsRouter("anthropic/claude-3-5-sonnet-20241022"),
    dreamsRouter("google-vertex/gemini-2.5-flash"),
    dreamsRouter("groq/llama-3.1-405b-reasoning")
  ]

  for (const model of models) {
    try {
      const decision = await agent.send({
        model: model,
        input: `Trade ${symbol}?`
      })
      return decision
    } catch (error) {
      console.log(`Model failed, trying next...`)
      continue
    }
  }

  throw new Error("All models failed")
}
```

---

## Part 8: Monitoring & Logging

### What to Track

```
Per Decision:
├─ Model used
├─ Cost
├─ Latency
├─ Success/failure
└─ Result

Daily:
├─ Total decisions
├─ Total cost
├─ Average cost
├─ Success rate
└─ Model distribution

Monthly:
├─ Total cost
├─ Cost per trade
├─ ROI on research
└─ Projections
```

### Example Monitoring

```typescript
async function logDecision(decision: any, model: string, cost: number) {
  console.log({
    timestamp: new Date().toISOString(),
    model,
    decision,
    costUSDC: cost,
    balanceAfter: await balanceManager.getBalance(),
    profitability: decision.expectedReturn - cost
  })
}
```

---

## Summary: How It All Connects

```
Market Data Stream
    ↓
Market Context (technical analysis)
    ↓
Research Context (x402 research)
    ↓
Portfolio Context (position tracking)
    ↓
Risk Context (limit enforcement)
    ↓
Trading Context (composition)
    ↓
Dreams Router (LLM + x402 payment)
├─ Check balance
├─ Select model
├─ Get decision
└─ Pay with x402
    ↓
Action (ExecuteTrade, etc.)
    ↓
Exchange (place order)
    ↓
Portfolio Update
    ↓
Output (reports, alerts)
```

---

## Next: Hands-On Implementation

Ready to code? Follow this sequence:

1. **Set up Dreams Router** (1 hour)
   - Configure .env
   - Initialize router
   - Test balance check

2. **Implement Balance Manager** (1 hour)
   - Check balance
   - Auto-refill
   - Track costs

3. **Create Market Context** (2 hours)
   - Fetch data
   - Calculate indicators
   - Generate signals

4. **Create Research Context** (2 hours)
   - Query x402 Indigo AI
   - Screen projects
   - Generate alpha

5. **Compose Trading Context** (1 hour)
   - Combine all contexts
   - Prepare for LLM

6. **Integrate Dreams Router** (1 hour)
   - Use router in agent
   - Make decisions
   - Track costs

---

## Resources

- [Dreams Router Docs](https://docs.daydreams.systems/docs/router)
- [DREAMS_ROUTER_INTEGRATION.md](./DREAMS_ROUTER_INTEGRATION.md) - Full implementation guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical deep dive
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Step-by-step guide

---

**You now understand:**
✅ How Dreams Router works
✅ How to set it up
✅ How the full system architecture works
✅ How everything connects together
✅ How to optimize costs
✅ How to handle errors

**Ready to code? Start with Dreams Router setup! 🚀**
