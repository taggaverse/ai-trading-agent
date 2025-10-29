# Daydreams Framework - Comprehensive Guide

## Overview

Daydreams is a TypeScript framework for building scalable AI agents with **composable contexts** - isolated, stateful workspaces that combine for complex behaviors.

**Key Innovation**: Unlike traditional stateless AI frameworks, Daydreams provides true state management and context composition, making agents production-ready.

---

## The Problem Daydreams Solves

Traditional AI agent development faces these challenges:

```
❌ Context switching breaks existing functionality
❌ State management becomes a nightmare
❌ Memory doesn't persist across sessions
❌ Code becomes a tangled mess of prompts and logic
```

**Result**: Most AI agents never make it to production.

---

## The Solution: Composable Context Architecture

Daydreams introduces **contexts** - isolated workspaces that:
- Maintain their own state
- Have their own memory
- Can be composed together
- Work seamlessly with LLMs

```typescript
// Individual contexts
const marketContext = context({ type: "market" })
const portfolioContext = context({ type: "portfolio" })
const riskContext = context({ type: "risk" })

// Composed context
const tradingContext = context({ type: "trading" })
  .use(state => [
    { context: marketContext, args: { symbol: state.symbol } },
    { context: portfolioContext, args: { accountId: state.accountId } },
    { context: riskContext, args: { accountId: state.accountId } }
  ])

// Result: LLM gets all three contexts automatically
```

---

## Core Architecture

### 1. Context System

**What**: Isolated stateful workspaces for different conversation types

**Structure**:
```typescript
const userContext = context({
  type: "user",
  schema: z.object({
    userId: z.string()
  }),
  create: () => ({
    preferences: {},
    history: []
  }),
  render: (state) => `User: ${state.args.userId} | History: ${state.memory.history.length} items`
})
```

**Key Concepts**:
- `type`: Unique identifier for the context
- `schema`: Zod schema for input arguments
- `create()`: Initialize memory for this context
- `render()`: How to display context state to LLM

**For Trading Agent**:
```typescript
// Market Context
const marketContext = context({
  type: "market",
  schema: z.object({ symbol: z.string() }),
  create: () => ({
    price: 0,
    indicators: {},
    signals: []
  })
})

// Portfolio Context
const portfolioContext = context({
  type: "portfolio",
  schema: z.object({ accountId: z.string() }),
  create: () => ({
    positions: {},
    balance: 0,
    trades: []
  })
})

// Risk Context
const riskContext = context({
  type: "risk",
  schema: z.object({ accountId: z.string() }),
  create: () => ({
    exposure: 0,
    leverage: 0,
    limits: {}
  })
})
```

### 2. Memory System

**Dual-Tier Storage**:

**Working Memory**:
- Temporary execution state
- Inputs, outputs, actions
- Cleared between cycles
- Fast access

**Context Memory**:
- Persistent data defined by `create()`
- Survives across sessions
- Defined by your schema
- Automatically persisted

```typescript
// Context memory persists
const ctx = {
  memory: {
    preferences: { theme: "dark" },
    history: [{ event: "login", time: "2025-10-28" }]
  }
}

// Working memory is temporary
const working = {
  currentInput: "user message",
  lastOutput: "agent response"
}
```

### 3. Action System

**What**: Type-safe functions with context access and schema validation

**Structure**:
```typescript
const savePreference = action({
  name: "save-preference",
  description: "Save a user preference",
  schema: z.object({
    key: z.string(),
    value: z.string()
  }),
  handler: async ({ key, value }, ctx) => {
    ctx.memory.preferences[key] = value
    return { saved: `${key} = ${value}` }
  }
})
```

**For Trading Agent**:
```typescript
// Execute Trade Action
const executeTrade = action({
  name: "execute-trade",
  description: "Execute a trade",
  schema: z.object({
    symbol: z.string(),
    side: z.enum(["buy", "sell"]),
    size: z.number()
  }),
  handler: async ({ symbol, side, size }, ctx) => {
    // Access context memory
    const balance = ctx.memory.balance
    
    // Validate
    if (size * currentPrice > balance) {
      return { error: "Insufficient balance" }
    }
    
    // Execute
    const order = await exchange.createOrder(symbol, side, size)
    
    // Update memory
    ctx.memory.trades.push(order)
    
    return { orderId: order.id, status: "filled" }
  }
})
```

### 4. Extension System

**What**: Modular integrations for platforms and services

**Built-in Extensions**:
- Discord
- Supabase
- Telegram
- Slack
- And more

```typescript
import { discordExtension } from "@daydreamsai/discord"
import { supabaseExtension } from "@daydreamsai/supabase"

const agent = createDreams({
  extensions: [
    discordExtension({ token: process.env.DISCORD_TOKEN }),
    supabaseExtension({ url: process.env.SUPABASE_URL })
  ]
})
```

---

## Context Patterns

### Pattern 1: Single Context (Simple & Focused)

**Use Case**: Straightforward bots with one responsibility

```typescript
const faqBot = context({
  type: "faq",
  instructions: "Answer questions about our product"
})

const agent = createDreams({
  model: openai("gpt-4o"),
  contexts: [faqBot]
})
```

**For Trading**: Not suitable - trading needs multiple contexts

---

### Pattern 2: Multiple Contexts (Separate Workspaces)

**Use Case**: Isolated functionality that doesn't interact

```typescript
const agent = createDreams({
  contexts: [
    chatContext,      // User conversations
    gameContext,      // Game sessions
    adminContext      // Admin functions
  ]
})
```

**For Trading**: Partially suitable - contexts exist but don't compose

---

### Pattern 3: Composed Contexts (Maximum Power) ⭐

**Use Case**: Complex agents where contexts work together

```typescript
const smartAssistant = context({
  type: "assistant",
  schema: z.object({
    userId: z.string(),
    plan: z.enum(["free", "pro"])
  })
}).use((state) => [
  // Always include user profile
  { context: profileContext, args: { userId: state.args.userId } },
  
  // Always include basic analytics
  { context: analyticsContext, args: { userId: state.args.userId } },
  
  // Add premium features for pro users
  ...(state.args.plan === "pro" ? [{ context: premiumContext }] : [])
])
```

**For Trading**: PERFECT - This is what we need!

```typescript
const tradingContext = context({
  type: "trading",
  schema: z.object({
    accountId: z.string(),
    symbol: z.string()
  })
}).use((state) => [
  // Always include market data
  { context: marketContext, args: { symbol: state.args.symbol } },
  
  // Always include research
  { context: researchContext, args: { symbol: state.args.symbol } },
  
  // Always include portfolio
  { context: portfolioContext, args: { accountId: state.args.accountId } },
  
  // Always include risk
  { context: riskContext, args: { accountId: state.args.accountId } }
])
```

---

## Dreams Router - Universal AI Gateway

**What**: Access any AI model through one API with built-in authentication and payments

**Features**:
- Universal Access: OpenAI, Anthropic, Google, Groq, xAI, and more
- x402 Payments: Pay-per-use with USDC micropayments
- OpenAI Compatible: Works with existing OpenAI SDK clients
- Automatic Fallbacks: Built-in provider redundancy

```typescript
import { dreamsRouter } from "@daydreamsai/ai-sdk-provider"

// Use any model from any provider
const models = [
  dreamsRouter("openai/gpt-4o"),
  dreamsRouter("anthropic/claude-3-5-sonnet-20241022"),
  dreamsRouter("google-vertex/gemini-2.5-flash"),
  dreamsRouter("groq/llama-3.1-405b-reasoning")
]

// Pay-per-use with USDC micropayments (no subscriptions)
const { dreamsRouter } = await createDreamsRouterAuth(account, {
  payments: {
    amount: "100000",  // $0.10 per request
    network: "base-sepolia"
  }
})
```

**For Trading Agent**:
```typescript
const agent = createDreams({
  model: dreamsRouter("openai/gpt-4o"),  // Or any other model
  contexts: [tradingContext]
})
```

---

## MCP Integration

**What**: Model Context Protocol - Connect to external tools and services

**Use Cases**:
- Fetch real-time data
- Execute external APIs
- Connect to databases
- Integrate with services

```typescript
import { mcpClient } from "@daydreamsai/mcp"

const agent = createDreams({
  mcp: {
    servers: [
      {
        name: "exchange-server",
        command: "node exchange-mcp.js"
      }
    ]
  }
})
```

**For Trading Agent**:
```typescript
// MCP server for exchange integration
const exchangeMCP = {
  name: "exchange",
  tools: [
    {
      name: "fetch_ohlcv",
      description: "Fetch OHLCV data",
      inputSchema: {
        symbol: "string",
        timeframe: "string"
      }
    },
    {
      name: "create_order",
      description: "Create an order",
      inputSchema: {
        symbol: "string",
        side: "buy|sell",
        size: "number"
      }
    }
  ]
}
```

---

## Building Your First Agent

### Step 1: Create a Context

```typescript
import { context } from "@daydreamsai/core"
import { z } from "zod"

const chatContext = context({
  type: "chat",
  schema: z.object({
    userId: z.string()
  }),
  create: () => ({
    messages: [],
    preferences: {}
  })
})
```

### Step 2: Add Actions

```typescript
import { action } from "@daydreamsai/core"

const sendMessage = action({
  name: "send-message",
  schema: z.object({
    text: z.string()
  }),
  handler: async ({ text }, ctx) => {
    ctx.memory.messages.push({
      role: "assistant",
      content: text,
      timestamp: Date.now()
    })
    return { sent: true }
  }
})

const chatContext = context({
  type: "chat",
  schema: z.object({ userId: z.string() }),
  create: () => ({ messages: [], preferences: {} })
}).setActions([sendMessage])
```

### Step 3: Create Agent

```typescript
import { createDreams } from "@daydreamsai/core"
import { openai } from "@ai-sdk/openai"

const agent = createDreams({
  model: openai("gpt-4o"),
  contexts: [chatContext]
})
```

### Step 4: Use Agent

```typescript
const response = await agent.send({
  context: chatContext,
  args: { userId: "user123" },
  input: "Hello, how are you?"
})

console.log(response)
```

---

## For Our Trading Agent

### Context Setup

```typescript
// Market Context
const marketContext = context({
  type: "market",
  schema: z.object({ symbol: z.string() }),
  create: () => ({
    price: 0,
    indicators: { sma20: 0, sma50: 0, rsi: 0 },
    signals: { bullish: false, bearish: false }
  })
}).setActions([
  action({
    name: "fetch-market-data",
    handler: async (_, ctx) => {
      const data = await exchange.fetchOHLCV(ctx.args.symbol)
      ctx.memory.price = data[data.length - 1][4]
      return { price: ctx.memory.price }
    }
  })
])

// Portfolio Context
const portfolioContext = context({
  type: "portfolio",
  schema: z.object({ accountId: z.string() }),
  create: () => ({
    positions: {},
    balance: 0,
    trades: []
  })
}).setActions([
  action({
    name: "get-balance",
    handler: async (_, ctx) => {
      const balance = await exchange.fetchBalance()
      ctx.memory.balance = balance.USDT.free
      return { balance: ctx.memory.balance }
    }
  })
])

// Risk Context
const riskContext = context({
  type: "risk",
  schema: z.object({ accountId: z.string() }),
  create: () => ({
    exposure: 0,
    leverage: 0,
    limits: { maxExposure: 0.5, maxLeverage: 10 }
  })
}).setActions([
  action({
    name: "validate-trade",
    schema: z.object({ size: z.number(), price: z.number() }),
    handler: async ({ size, price }, ctx) => {
      const exposure = (size * price) / ctx.memory.balance
      if (exposure > ctx.memory.limits.maxExposure) {
        return { valid: false, reason: "Exceeds exposure limit" }
      }
      return { valid: true }
    }
  })
])

// Research Context (x402)
const researchContext = context({
  type: "research",
  schema: z.object({ symbol: z.string() }),
  create: () => ({
    narratives: [],
    projects: [],
    alphaSignals: []
  })
}).setActions([
  action({
    name: "query-indigo",
    schema: z.object({ query: z.string() }),
    handler: async ({ query }, ctx) => {
      const response = await x402Client.post('/v1/agents/indigo', {
        messages: [{ role: 'user', content: query }]
      })
      ctx.memory.narratives.push(response.data.text)
      return { narrative: response.data.text }
    }
  })
])

// Trading Context (Composed)
const tradingContext = context({
  type: "trading",
  schema: z.object({
    accountId: z.string(),
    symbol: z.string()
  })
}).use((state) => [
  { context: marketContext, args: { symbol: state.args.symbol } },
  { context: researchContext, args: { symbol: state.args.symbol } },
  { context: portfolioContext, args: { accountId: state.args.accountId } },
  { context: riskContext, args: { accountId: state.args.accountId } }
])
```

### Agent Creation

```typescript
const tradingAgent = createDreams({
  model: openai("gpt-4o"),
  contexts: [tradingContext],
  instructions: "You are a professional hedge fund trader. Make trading decisions based on technical and fundamental analysis."
})
```

### Usage

```typescript
const decision = await tradingAgent.send({
  context: tradingContext,
  args: {
    accountId: "account123",
    symbol: "BTC/USDT"
  },
  input: "Should I buy BTC right now?"
})

// Agent automatically has access to:
// - Market data (price, indicators, signals)
// - Research data (narratives, projects)
// - Portfolio state (positions, balance)
// - Risk constraints (exposure, leverage limits)
```

---

## Key Differences from Other Frameworks

| Feature | Traditional | Daydreams |
|---------|-----------|-----------|
| State Management | Manual | Automatic |
| Context Switching | Breaks functionality | Seamless composition |
| Memory Persistence | Not built-in | Dual-tier system |
| Context Composition | Manual integration | `.use()` method |
| Type Safety | Optional | First-class |
| Production Ready | Difficult | Built-in |

---

## Best Practices

### 1. Keep Contexts Focused
Each context should have a single responsibility:
```typescript
// ✅ Good
const marketContext = context({ type: "market" })
const portfolioContext = context({ type: "portfolio" })

// ❌ Bad
const everythingContext = context({ type: "everything" })
```

### 2. Use Composition Over Inheritance
```typescript
// ✅ Good - Compose contexts
const tradingContext = context({ type: "trading" })
  .use(state => [
    { context: marketContext },
    { context: portfolioContext }
  ])

// ❌ Bad - Try to do everything in one context
const tradingContext = context({ type: "trading" })
```

### 3. Type Your Schemas
```typescript
// ✅ Good - Clear schema
const context = context({
  schema: z.object({
    userId: z.string().uuid(),
    plan: z.enum(["free", "pro"])
  })
})

// ❌ Bad - No schema
const context = context({})
```

### 4. Document Your Actions
```typescript
// ✅ Good - Clear documentation
const action = action({
  name: "execute-trade",
  description: "Execute a trade with risk validation",
  schema: z.object({
    symbol: z.string().describe("Trading pair"),
    size: z.number().describe("Position size in base currency")
  })
})
```

### 5. Handle Errors Gracefully
```typescript
// ✅ Good - Proper error handling
handler: async (input, ctx) => {
  try {
    const result = await riskyOperation()
    return { success: true, result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

---

## Common Patterns

### Pattern: Conditional Composition
```typescript
const context = context({
  type: "assistant",
  schema: z.object({ tier: z.enum(["free", "pro"]) })
}).use((state) => [
  { context: baseContext },
  ...(state.args.tier === "pro" ? [{ context: premiumContext }] : [])
])
```

### Pattern: Chained Actions
```typescript
const action1 = action({
  name: "step1",
  handler: async (_, ctx) => {
    ctx.memory.step1Result = await doStep1()
    return { done: true }
  }
})

const action2 = action({
  name: "step2",
  handler: async (_, ctx) => {
    const prev = ctx.memory.step1Result
    ctx.memory.step2Result = await doStep2(prev)
    return { done: true }
  }
})
```

### Pattern: Conditional Actions
```typescript
const action = action({
  name: "conditional-action",
  handler: async (input, ctx) => {
    if (ctx.memory.condition) {
      return await doA()
    } else {
      return await doB()
    }
  }
})
```

---

## Tutorials Reference

### 1. Basic Agent
- Single context agent
- Simple conversational bot
- Perfect starting point

### 2. Multi-Context Agent
- Multiple independent contexts
- Handle multiple workflows
- Separate concerns

### 3. MCP Setup
- Connect external servers
- Fetch real-time data
- Execute external APIs

### 4. x402 Nanoservice
- Paid AI services
- Micropayments
- Per-request billing

---

## Resources

- **Website**: https://daydreams.systems
- **Documentation**: https://docs.dreams.fun
- **GitHub**: https://github.com/daydreamsai/daydreams
- **Discord**: https://discord.gg/rt8ajxQvXh
- **Quick Start**: https://docs.dreams.fun/docs/core/first-agent

---

## Next Steps for Trading Agent

1. **Set up Daydreams project**
   ```bash
   npm create daydream-app@latest trading-agent
   ```

2. **Create Market Context** (simplest, start here)
   - Fetch OHLCV data
   - Calculate indicators
   - Generate signals

3. **Create Research Context** (x402 integration)
   - Query Indigo AI
   - Screen projects
   - Generate alpha signals

4. **Create Portfolio Context**
   - Track positions
   - Monitor balance
   - Calculate P&L

5. **Create Risk Context**
   - Enforce limits
   - Validate trades
   - Calculate exposure

6. **Compose into Trading Context**
   - Use `.use()` to compose
   - Let LLM reason over all data
   - Execute trades

7. **Add Actions**
   - ExecuteTrade
   - ClosePosition
   - ResearchTrade
   - RiskManagement

8. **Deploy and Monitor**
   - Set up logging
   - Monitor performance
   - Track costs

---

This is the foundation for building your AI hedge fund trading agent with Daydreams!
