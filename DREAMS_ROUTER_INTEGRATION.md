# Dreams Router Integration Guide

## Overview

The **Daydreams Router** is an intelligent gateway that provides:
- Unified access to multiple AI providers (OpenAI, Anthropic, Google, Groq, xAI, etc.)
- x402 USDC micropayment integration
- Automatic model routing and fallbacks
- OpenAI-compatible API
- Cost tracking and balance management

**Key Innovation**: Pay-per-use with USDC micropayments instead of subscriptions, with automatic balance management.

---

## How It Works

```
Your App
    ↓
Dreams Router (router.daydreams.systems)
    ↓
Provider Selection (OpenAI/Anthropic/Google/etc.)
    ↓
Authentication Layer (API Key OR x402 USDC)
    ↓
Response Standardization
    ↓
Your App
```

---

## For Our Trading Agent

### Why Dreams Router?

1. **Cost Efficiency**
   - Pay-per-use with USDC micropayments
   - No subscriptions
   - Only pay for what you use
   - Automatic balance tracking

2. **Model Flexibility**
   - Access multiple AI providers
   - Automatic fallbacks if primary fails
   - Choose best model for each decision
   - Switch models without code changes

3. **x402 Integration**
   - Direct USDC payment support
   - Blockchain-verified transactions
   - Transparent pricing
   - Automatic balance management

4. **Reliability**
   - Automatic provider fallbacks
   - Redundancy built-in
   - Error handling
   - Retry logic

---

## Architecture Integration

### Current Flow
```
Trading Context
    ↓
GPT-4 LLM (OpenAI)
    ↓
Decision
```

### With Dreams Router
```
Trading Context
    ↓
Dreams Router (x402 USDC Payment)
    ├─ Primary: gpt-4o (OpenAI)
    ├─ Fallback: claude-3.5-sonnet (Anthropic)
    └─ Fallback: gemini-2.5-flash (Google)
    ↓
Decision
    ↓
Balance Check & Management
```

---

## Implementation

### Step 1: Set Up Dreams Router Auth

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
      network: "base-sepolia" // or "base" for mainnet
    }
  })

  return dreamsRouter
}
```

### Step 2: Create Router Models Array

```typescript
// src/agent/models.ts
import { dreamsRouter } from "@daydreamsai/router"

export const tradingModels = [
  // Primary: GPT-4 (best for reasoning)
  dreamsRouter("openai/gpt-4o"),
  
  // Fallback 1: Claude (good for analysis)
  dreamsRouter("anthropic/claude-3-5-sonnet-20241022"),
  
  // Fallback 2: Gemini (fast and cheap)
  dreamsRouter("google-vertex/gemini-2.5-flash"),
  
  // Fallback 3: Groq (ultra-fast)
  dreamsRouter("groq/llama-3.1-405b-reasoning")
]

// For different decision types
export const quickDecisionModels = [
  dreamsRouter("groq/llama-3.1-405b-reasoning"), // Fast
  dreamsRouter("google-vertex/gemini-2.5-flash")
]

export const complexAnalysisModels = [
  dreamsRouter("openai/gpt-4o"), // Best reasoning
  dreamsRouter("anthropic/claude-3-5-sonnet-20241022")
]
```

### Step 3: Integrate with Trading Agent

```typescript
// src/agent/index.ts
import { createDreams } from "@daydreamsai/core"
import { initializeDreamsRouter } from "./router"
import { tradingContext } from "./contexts/trading"

export async function createTradingAgent() {
  // Initialize Dreams Router with x402
  const dreamsRouter = await initializeDreamsRouter()

  // Create agent with router
  const agent = createDreams({
    model: dreamsRouter("openai/gpt-4o"), // Primary model
    contexts: [tradingContext],
    instructions: `You are a professional hedge fund trader. 
    Make trading decisions based on technical and fundamental analysis.
    Manage USDC balance carefully - each decision costs $0.10.
    Only make high-confidence trades.`
  })

  return agent
}
```

### Step 4: Balance Management

```typescript
// src/agent/balance-manager.ts
import { getAccount } from "@daydreamsai/x402"

export class BalanceManager {
  private account: any
  private minBalance: bigint = BigInt("1000000") // $1.00 USDC minimum
  private costPerDecision: bigint = BigInt("100000") // $0.10 per decision

  async initialize() {
    this.account = await getAccount({
      privateKey: process.env.X402_PRIVATE_KEY,
      walletAddress: process.env.X402_WALLET_ADDRESS
    })
  }

  async getBalance(): Promise<number> {
    const balance = await this.account.getBalance()
    return Number(balance) / 1000000 // Convert to USDC
  }

  async canMakeDecision(): Promise<boolean> {
    const balance = await this.account.getBalance()
    return balance > (this.minBalance + this.costPerDecision)
  }

  async checkAndRefill(): Promise<boolean> {
    const balance = await this.account.getBalance()
    
    if (balance < this.minBalance) {
      console.log(`Balance low: $${Number(balance) / 1000000}`)
      
      // Attempt to refill from configured source
      try {
        await this.account.refill(BigInt("5000000")) // Refill $5.00
        console.log("Balance refilled")
        return true
      } catch (error) {
        console.error("Failed to refill balance:", error)
        return false
      }
    }
    
    return true
  }

  async trackCost(decision: string, cost: bigint) {
    const balance = await this.getBalance()
    console.log(`Decision: ${decision} | Cost: $${Number(cost) / 1000000} | Balance: $${balance}`)
  }
}
```

### Step 5: Integrate Balance Management into Agent Loop

```typescript
// src/index.ts
import { createTradingAgent } from "./agent"
import { BalanceManager } from "./agent/balance-manager"

async function main() {
  const agent = await createTradingAgent()
  const balanceManager = new BalanceManager()
  
  await balanceManager.initialize()

  while (true) {
    try {
      // Check balance before making decision
      if (!await balanceManager.canMakeDecision()) {
        console.log("Insufficient balance for trading decision")
        
        // Try to refill
        if (!await balanceManager.checkAndRefill()) {
          console.log("Cannot refill balance. Pausing agent.")
          break
        }
      }

      // Make trading decision using Dreams Router
      const decision = await agent.send({
        context: tradingContext,
        args: {
          accountId: "account123",
          symbol: "BTC/USDT"
        },
        input: "Should I trade now?"
      })

      // Track cost
      const cost = BigInt("100000") // $0.10
      await balanceManager.trackCost(decision.action, cost)

      // Execute trade if recommended
      if (decision.action === "buy" || decision.action === "sell") {
        await executeTrade(decision)
      }

      // Check balance after decision
      await balanceManager.checkAndRefill()

      // Wait before next decision
      await sleep(60000) // 1 minute

    } catch (error) {
      console.error("Error in trading loop:", error)
      await sleep(60000)
    }
  }
}

main()
```

---

## Model Selection Strategy

### For Different Decision Types

```typescript
// Quick decisions (fast market moves)
async function quickDecision(symbol: string) {
  const model = dreamsRouter("groq/llama-3.1-405b-reasoning")
  // Cost: ~$0.01, Speed: <1s
}

// Standard decisions (regular trading)
async function standardDecision(symbol: string) {
  const model = dreamsRouter("openai/gpt-4o")
  // Cost: ~$0.10, Quality: Highest
}

// Complex analysis (portfolio rebalancing)
async function complexAnalysis(portfolio: any) {
  const model = dreamsRouter("anthropic/claude-3-5-sonnet-20241022")
  // Cost: ~$0.05, Reasoning: Excellent
}

// Risk assessment (emergency decisions)
async function riskAssessment(exposure: any) {
  const model = dreamsRouter("google-vertex/gemini-2.5-flash")
  // Cost: ~$0.02, Speed: Very fast
}
```

---

## Cost Optimization

### Strategy 1: Model Selection by Complexity

```typescript
interface DecisionRequest {
  type: "quick" | "standard" | "complex" | "emergency"
  symbol?: string
  portfolio?: any
  urgency: "low" | "medium" | "high"
}

function selectModel(request: DecisionRequest) {
  if (request.urgency === "high") {
    return dreamsRouter("groq/llama-3.1-405b-reasoning") // $0.01
  }
  
  if (request.type === "complex") {
    return dreamsRouter("anthropic/claude-3-5-sonnet-20241022") // $0.05
  }
  
  if (request.type === "quick") {
    return dreamsRouter("google-vertex/gemini-2.5-flash") // $0.02
  }
  
  return dreamsRouter("openai/gpt-4o") // $0.10 (default)
}
```

### Strategy 2: Batch Decisions

```typescript
// Instead of 100 individual decisions
// Batch into 10 portfolio-level decisions
async function batchDecisions(symbols: string[]) {
  const batches = chunk(symbols, 10)
  
  for (const batch of batches) {
    const decision = await agent.send({
      input: `Analyze these symbols: ${batch.join(", ")}`
    })
    
    // One decision for 10 symbols = 90% cost savings
  }
}
```

### Strategy 3: Caching Results

```typescript
// Cache decisions for 5 minutes
const decisionCache = new Map<string, any>()
const CACHE_TTL = 5 * 60 * 1000

async function getCachedDecision(symbol: string) {
  const cached = decisionCache.get(symbol)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.decision // No cost!
  }
  
  const decision = await agent.send({ input: `Trade ${symbol}?` })
  decisionCache.set(symbol, { decision, timestamp: Date.now() })
  
  return decision
}
```

---

## USDC Balance Management

### Monitoring

```typescript
// src/monitoring/balance-monitor.ts
export class BalanceMonitor {
  async monitorBalance() {
    const balance = await balanceManager.getBalance()
    
    console.log(`Current Balance: $${balance}`)
    
    if (balance < 1.0) {
      console.warn("⚠️ Low balance - refill needed")
      await this.alert("Balance below $1.00")
    }
    
    if (balance < 0.5) {
      console.error("❌ Critical balance - pausing agent")
      await this.pauseAgent()
    }
  }

  async trackSpending() {
    const dailySpend = await this.getDailySpend()
    const monthlyProjection = dailySpend * 30
    
    console.log(`Daily Spend: $${dailySpend}`)
    console.log(`Monthly Projection: $${monthlyProjection}`)
  }
}
```

### Refilling

```typescript
// Automatic refill when balance drops
async function autoRefill() {
  const balance = await balanceManager.getBalance()
  
  if (balance < 2.0) {
    // Refill to $10
    await account.refill(BigInt("10000000"))
    console.log("Auto-refilled to $10")
  }
}

// Manual refill
async function manualRefill(amount: number) {
  const usdc = BigInt(amount * 1000000)
  await account.refill(usdc)
  console.log(`Refilled $${amount}`)
}
```

---

## Configuration

### .env Setup

```bash
# Dreams Router
DREAMS_ROUTER_URL=https://router.daydreams.systems

# x402 / USDC
X402_WALLET_ADDRESS=0x...
X402_PRIVATE_KEY=0x...
X402_NETWORK=base-sepolia  # or "base" for mainnet

# Balance Management
MIN_BALANCE_USDC=1.0
REFILL_THRESHOLD_USDC=2.0
REFILL_AMOUNT_USDC=10.0

# Model Selection
PRIMARY_MODEL=openai/gpt-4o
FALLBACK_MODELS=anthropic/claude-3-5-sonnet-20241022,google-vertex/gemini-2.5-flash

# Cost Per Decision
COST_PER_DECISION_USDC=0.10
```

---

## Available Models

### OpenAI
- `openai/gpt-4o` - Best reasoning ($0.10)
- `openai/gpt-4-turbo` - Fast reasoning ($0.05)
- `openai/gpt-3.5-turbo` - Budget option ($0.01)

### Anthropic
- `anthropic/claude-3-5-sonnet-20241022` - Excellent analysis ($0.05)
- `anthropic/claude-3-opus-20250219` - Most capable ($0.08)
- `anthropic/claude-3-haiku-20250307` - Fast & cheap ($0.02)

### Google
- `google-vertex/gemini-2.5-flash` - Fast & capable ($0.02)
- `google-vertex/gemini-2.0-flash` - Reliable ($0.02)
- `google-vertex/gemini-pro` - Budget ($0.01)

### Groq
- `groq/llama-3.1-405b-reasoning` - Ultra-fast reasoning ($0.01)
- `groq/mixtral-8x7b-32768` - Fast & capable ($0.005)

### xAI
- `xai/grok-2` - Latest reasoning ($0.05)

---

## Error Handling & Fallbacks

```typescript
// Automatic fallback on error
async function makeDecisionWithFallback(symbol: string) {
  const models = [
    dreamsRouter("openai/gpt-4o"),
    dreamsRouter("anthropic/claude-3-5-sonnet-20241022"),
    dreamsRouter("google-vertex/gemini-2.5-flash")
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

## Monitoring & Logging

```typescript
// src/monitoring/router-monitor.ts
export class RouterMonitor {
  async logDecision(decision: any, model: string, cost: number) {
    console.log({
      timestamp: new Date().toISOString(),
      model,
      decision,
      costUSDC: cost,
      balanceAfter: await balanceManager.getBalance()
    })
  }

  async generateReport() {
    const stats = {
      totalDecisions: await this.getTotalDecisions(),
      totalCost: await this.getTotalCost(),
      averageCostPerDecision: await this.getAverageCost(),
      modelUsage: await this.getModelUsage(),
      successRate: await this.getSuccessRate()
    }
    
    return stats
  }
}
```

---

## Best Practices

### ✅ Do
- Use appropriate model for decision complexity
- Monitor balance continuously
- Cache decisions when possible
- Batch similar decisions
- Track all costs
- Set up automatic refills
- Use fallback models
- Log all decisions

### ❌ Don't
- Use expensive models for simple decisions
- Ignore balance warnings
- Make decisions without balance check
- Skip error handling
- Hardcode model selection
- Forget to track costs
- Ignore fallback options
- Leave agent running without monitoring

---

## Cost Comparison

### Old Approach (OpenAI API)
- $20/month subscription
- Unlimited requests
- Fixed cost

### Dreams Router Approach
- $0.10 per decision
- 100 decisions/month = $10
- 1000 decisions/month = $100
- Pay only for what you use

### With Smart Model Selection
- Quick decisions: $0.01 (Groq)
- Standard decisions: $0.05 (Claude)
- Complex decisions: $0.10 (GPT-4)
- Average: ~$0.04/decision
- 1000 decisions/month = $40

---

## Next Steps

1. **Set up Dreams Router**
   - Get x402 wallet
   - Configure .env
   - Initialize router

2. **Implement Balance Management**
   - Create BalanceManager
   - Set up monitoring
   - Configure auto-refill

3. **Integrate with Agent**
   - Update agent creation
   - Add model selection
   - Implement fallbacks

4. **Monitor & Optimize**
   - Track costs
   - Optimize model selection
   - Adjust thresholds

---

## Resources

- [Dreams Router Docs](https://docs.daydreams.systems/docs/router)
- [Dreams Router Quickstart](https://docs.daydreams.systems/docs/router/quickstart)
- [x402 Documentation](https://x402.org)
- [Daydreams Examples](https://github.com/daydreamsai/daydreams/tree/main/examples)
- [Nanoservice Example](https://github.com/daydreamsai/daydreams/tree/main/examples/x402/nanoservice)

---

This integration gives you:
✅ Multiple AI providers
✅ Automatic fallbacks
✅ x402 USDC payments
✅ Cost optimization
✅ Balance management
✅ Transparent pricing
