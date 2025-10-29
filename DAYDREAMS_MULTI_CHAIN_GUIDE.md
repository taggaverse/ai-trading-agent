# Daydreams Multi-Chain Integration Guide

## Overview

This guide shows how to use Daydreams contexts for multi-chain trading across Base, Solana, Hyperliquid, and BSC.

---

## Core Concept: Chain-Specific Contexts

Each chain has its own context that manages:
- Chain-specific configuration
- Venue connections
- Balance tracking
- Position management
- Gas/fee optimization

```typescript
// Each chain gets its own context
const baseContext = context({ type: "base-trading" })
const solanaContext = context({ type: "solana-trading" })
const hyperliquidContext = context({ type: "hyperliquid-trading" })
const bscContext = context({ type: "bsc-trading" })

// Composed into multi-chain context
const multiChainContext = context({ type: "multi-chain-trading" })
  .use(state => [
    { context: baseContext },
    { context: solanaContext },
    { context: hyperliquidContext },
    { context: bscContext }
  ])
```

---

## 1. BASE Context

### Setup

```typescript
// src/agent/contexts/base.ts
import { context } from "@daydreamsai/core"
import { z } from "zod"
import { UniswapV4Adapter } from "../../exchange/base/uniswap-v4"
import { AerodromeAdapter } from "../../exchange/base/aerodrome"

export const baseContext = context({
  type: "base-trading",
  schema: z.object({
    symbol: z.string(),
    accountId: z.string()
  }),
  create: async (state) => {
    const uniswap = new UniswapV4Adapter()
    const aerodrome = new AerodromeAdapter()
    
    await uniswap.initialize(process.env.BASE_PRIVATE_KEY!)
    await aerodrome.initialize(process.env.BASE_PRIVATE_KEY!)

    return {
      chain: "base",
      chainId: 8453,
      rpc: "https://mainnet.base.org",
      venues: {
        uniswap: uniswap,
        aerodrome: aerodrome
      },
      balance: 0,
      positions: [],
      gasPrice: 0.01,
      symbol: state.args.symbol
    }
  }
})
```

### Usage in Agent

```typescript
// src/agent/index.ts
import { createDreams } from "@daydreamsai/core"
import { baseContext } from "./contexts/base"
import { dreamsRouter } from "@daydreamsai/router"

const agent = createDreams({
  model: dreamsRouter("openai/gpt-4o"),
  contexts: [baseContext],
  instructions: `You are trading on Base (Ethereum L2).
  Available venues: Uniswap V4, Aerodrome
  Focus on: Spot trading, low fees, high liquidity
  Analyze: Price, volume, liquidity depth`
})

// Use the agent
const decision = await agent.send({
  context: baseContext,
  args: {
    symbol: "ETH/USDC",
    accountId: "account123"
  },
  input: "Should I trade ETH on Base?"
})
```

---

## 2. SOLANA Context

### Setup

```typescript
// src/agent/contexts/solana.ts
import { context } from "@daydreamsai/core"
import { z } from "zod"
import { RaydiumAdapter } from "../../exchange/solana/raydium"
import { OrcaAdapter } from "../../exchange/solana/orca"

export const solanaContext = context({
  type: "solana-trading",
  schema: z.object({
    symbol: z.string(),
    accountId: z.string()
  }),
  create: async (state) => {
    const raydium = new RaydiumAdapter()
    const orca = new OrcaAdapter()
    
    await raydium.initialize(process.env.SOLANA_PRIVATE_KEY!)
    await orca.initialize(process.env.SOLANA_PRIVATE_KEY!)

    return {
      chain: "solana",
      rpc: "https://api.mainnet-beta.solana.com",
      venues: {
        raydium: raydium,
        orca: orca
      },
      balance: 0,
      positions: [],
      priorityFee: 1000,
      computeLimit: 200000,
      symbol: state.args.symbol
    }
  }
})
```

### Usage in Agent

```typescript
const agent = createDreams({
  model: dreamsRouter("groq/llama-3.1-405b-reasoning"), // Fast for Solana
  contexts: [solanaContext],
  instructions: `You are trading on Solana.
  Available venues: Raydium, Orca
  Focus on: High-frequency trading, ultra-low fees, speed
  Optimize for: Transaction speed, priority fees
  Analyze: Price, volume, emerging tokens`
})

const decision = await agent.send({
  context: solanaContext,
  args: {
    symbol: "SOL/USDC",
    accountId: "account123"
  },
  input: "Any high-frequency trading opportunities on Solana?"
})
```

---

## 3. HYPERLIQUID Context

### Setup (Based on Nocturne)

```typescript
// src/agent/contexts/hyperliquid.ts
import { context } from "@daydreamsai/core"
import { z } from "zod"
import { HyperliquidAdapter } from "../../exchange/hyperliquid/hyperliquid"

export const hyperliquidContext = context({
  type: "hyperliquid-trading",
  schema: z.object({
    symbol: z.string(),
    accountId: z.string()
  }),
  create: async (state) => {
    const hyperliquid = new HyperliquidAdapter()
    await hyperliquid.initialize(process.env.HYPERLIQUID_PRIVATE_KEY!)

    const accountState = await hyperliquid.getAccountState()

    return {
      chain: "arbitrum",
      venue: "hyperliquid",
      rpc: "https://arb1.arbitrum.io/rpc",
      adapter: hyperliquid,
      balance: accountState.balance,
      positions: accountState.assetPositions,
      leverage: 20,
      maxLeverage: 50,
      stopLossPct: 2,
      takeProfitPct: 3,
      symbol: state.args.symbol
    }
  }
})
```

### Usage in Agent (Nocturne Pattern)

```typescript
const agent = createDreams({
  model: dreamsRouter("openai/gpt-4o"), // Best reasoning for leverage
  contexts: [hyperliquidContext],
  instructions: `You are trading perpetual futures on Hyperliquid.
  Reference: Gajesh2007/ai-trading-agent (Nocturne)
  Available: BTC, ETH, SOL, AVAX, and 100+ altcoins
  Max leverage: 50x (use conservatively, default 20x)
  
  For each trade decision:
  1. Analyze technical indicators (RSI, MACD, SMA)
  2. Check market conditions
  3. Determine entry point
  4. Set stop-loss at 2%
  5. Set take-profit at 3%
  6. Recommend position size
  
  Follow Nocturne's patterns:
  - Use tool calling for indicators
  - Manage positions carefully
  - Log all decisions
  - Monitor P&L continuously`
})

const decision = await agent.send({
  context: hyperliquidContext,
  args: {
    symbol: "BTC",
    accountId: "account123"
  },
  input: "Should I open a leveraged position on BTC?"
})
```

---

## 4. BSC Context

### Setup

```typescript
// src/agent/contexts/bsc.ts
import { context } from "@daydreamsai/core"
import { z } from "zod"
import { PancakeSwapAdapter } from "../../exchange/bsc/pancakeswap"

export const bscContext = context({
  type: "bsc-trading",
  schema: z.object({
    symbol: z.string(),
    accountId: z.string()
  }),
  create: async (state) => {
    const pancakeswap = new PancakeSwapAdapter()
    await pancakeswap.initialize(process.env.BSC_PRIVATE_KEY!)

    return {
      chain: "bsc",
      chainId: 56,
      rpc: "https://bsc-dataseed.binance.org",
      venues: {
        pancakeswap: pancakeswap
      },
      balance: 0,
      positions: [],
      gasPrice: 5,
      symbol: state.args.symbol
    }
  }
})
```

### Usage in Agent

```typescript
const agent = createDreams({
  model: dreamsRouter("google-vertex/gemini-2.5-flash"), // Good balance
  contexts: [bscContext],
  instructions: `You are trading on BSC (Binance Smart Chain).
  Available venues: PancakeSwap
  Focus on: Volume trading, Asian market, Binance ecosystem
  Analyze: Price, volume, liquidity, Asian market hours`
})

const decision = await agent.send({
  context: bscContext,
  args: {
    symbol: "BNB/BUSD",
    accountId: "account123"
  },
  input: "Any trading opportunities on BSC?"
})
```

---

## 5. Multi-Chain Context (Composition)

### Setup

```typescript
// src/agent/contexts/multi-chain.ts
import { context } from "@daydreamsai/core"
import { z } from "zod"
import { baseContext } from "./base"
import { solanaContext } from "./solana"
import { hyperliquidContext } from "./hyperliquid"
import { bscContext } from "./bsc"

export const multiChainContext = context({
  type: "multi-chain-trading",
  schema: z.object({
    symbol: z.string(),
    accountId: z.string()
  }),
  create: () => ({
    chains: ["base", "solana", "hyperliquid", "bsc"],
    balances: {},
    positions: {},
    bestChain: null,
    opportunities: []
  })
}).use((state) => [
  { context: baseContext, args: state.args },
  { context: solanaContext, args: state.args },
  { context: hyperliquidContext, args: state.args },
  { context: bscContext, args: state.args }
])
```

### Usage in Agent

```typescript
const agent = createDreams({
  model: dreamsRouter("openai/gpt-4o"), // Best for complex decisions
  contexts: [multiChainContext],
  instructions: `You are a multi-chain trading agent.
  Available chains:
  - Base: Spot trading, ultra-low fees ($0.01)
  - Solana: High-frequency, ultra-fast (400ms)
  - Hyperliquid: Perpetual futures, up to 50x leverage
  - BSC: Volume trading, Asian market
  
  For each symbol:
  1. Analyze across all chains
  2. Compare prices and liquidity
  3. Select best chain for trade
  4. Consider fees and speed
  5. Recommend venue and chain
  
  Optimization:
  - Leverage on Hyperliquid for high-confidence trades
  - Speed on Solana for time-sensitive opportunities
  - Fees on Base for small trades
  - Volume on BSC for large trades`
})

const decision = await agent.send({
  context: multiChainContext,
  args: {
    symbol: "ETH",
    accountId: "account123"
  },
  input: "Where should I trade ETH and why?"
})
```

---

## 6. Chain Selection Logic

### Automatic Chain Selection

```typescript
// src/agent/contexts/chain-selector.ts
export const chainSelectorContext = context({
  type: "chain-selector",
  schema: z.object({
    symbol: z.string(),
    tradeType: z.enum(["spot", "leverage", "hft", "volume"])
  }),
  create: () => ({
    recommendations: {}
  })
}).use((state) => [
  { context: baseContext },
  { context: solanaContext },
  { context: hyperliquidContext },
  { context: bscContext }
])

// Use in agent
const agent = createDreams({
  model: dreamsRouter("openai/gpt-4o"),
  contexts: [chainSelectorContext],
  instructions: `Recommend the best chain for trading.
  
  Criteria:
  - Spot trading → Base (lowest fees)
  - Leverage trading → Hyperliquid (best leverage)
  - High-frequency → Solana (fastest)
  - Volume trading → BSC (highest liquidity)
  
  Return: { chain: string, reason: string }`
})

const recommendation = await agent.send({
  context: chainSelectorContext,
  args: {
    symbol: "BTC",
    tradeType: "leverage"
  },
  input: "Which chain should I use for leveraged BTC trading?"
})
// Returns: { chain: "hyperliquid", reason: "Best leverage (50x), deep liquidity" }
```

---

## 7. Portfolio Context (Multi-Chain)

### Setup

```typescript
// src/agent/contexts/portfolio-multi-chain.ts
export const portfolioMultiChainContext = context({
  type: "portfolio-multi-chain",
  schema: z.object({
    accountId: z.string()
  }),
  create: async (state) => {
    // Fetch balances from all chains
    const baseBalance = await getBaseBalance()
    const solanaBalance = await getSolanaBalance()
    const hyperliquidBalance = await getHyperliquidBalance()
    const bscBalance = await getBscBalance()

    return {
      accountId: state.args.accountId,
      chains: {
        base: baseBalance,
        solana: solanaBalance,
        hyperliquid: hyperliquidBalance,
        bsc: bscBalance
      },
      totalBalance: baseBalance + solanaBalance + hyperliquidBalance + bscBalance,
      positions: {},
      allocation: {
        base: 0.25,      // 25%
        solana: 0.25,    // 25%
        hyperliquid: 0.30, // 30%
        bsc: 0.20        // 20%
      }
    }
  }
}).use((state) => [
  { context: baseContext },
  { context: solanaContext },
  { context: hyperliquidContext },
  { context: bscContext }
])
```

---

## 8. Risk Management Context (Multi-Chain)

### Setup

```typescript
// src/agent/contexts/risk-multi-chain.ts
export const riskMultiChainContext = context({
  type: "risk-multi-chain",
  schema: z.object({
    accountId: z.string()
  }),
  create: () => ({
    accountId: state.args.accountId,
    limits: {
      base: {
        maxPositionSize: 50000,
        maxDailyVolume: 100000,
        maxDrawdown: 0.20
      },
      solana: {
        maxPositionSize: 25000,
        maxDailyVolume: 50000,
        maxDrawdown: 0.15
      },
      hyperliquid: {
        maxPositionSize: 100000,
        maxLeverage: 20,
        maxDailyVolume: 200000,
        maxDrawdown: 0.25
      },
      bsc: {
        maxPositionSize: 75000,
        maxDailyVolume: 150000,
        maxDrawdown: 0.20
      }
    },
    portfolio: {
      maxTotalExposure: 500000,
      maxAverageLeverage: 15,
      maxVenueConcentration: 0.50,
      maxCorrelation: 0.70
    }
  })
}).use((state) => [
  { context: baseContext },
  { context: solanaContext },
  { context: hyperliquidContext },
  { context: bscContext }
])
```

---

## 9. Complete Multi-Chain Agent

```typescript
// src/agent/index.ts
import { createDreams } from "@daydreamsai/core"
import { dreamsRouter } from "@daydreamsai/router"
import { multiChainContext } from "./contexts/multi-chain"
import { portfolioMultiChainContext } from "./contexts/portfolio-multi-chain"
import { riskMultiChainContext } from "./contexts/risk-multi-chain"

export async function createMultiChainAgent() {
  const agent = createDreams({
    model: dreamsRouter("openai/gpt-4o"),
    contexts: [
      multiChainContext,
      portfolioMultiChainContext,
      riskMultiChainContext
    ],
    instructions: `You are an advanced multi-chain trading agent.

    Chains available:
    - Base: Spot trading, ultra-low fees
    - Solana: High-frequency trading, ultra-fast
    - Hyperliquid: Perpetual futures, up to 50x leverage
    - BSC: Volume trading, Asian market

    For each trading decision:
    1. Analyze the symbol across all chains
    2. Check portfolio allocation
    3. Verify risk limits
    4. Select optimal chain and venue
    5. Recommend position size and leverage
    6. Set stop-loss and take-profit

    Optimize for:
    - Risk-adjusted returns
    - Portfolio diversification
    - Fee minimization
    - Execution speed
    - Market conditions

    Reference: Gajesh2007/ai-trading-agent for Hyperliquid patterns`
  })

  return agent
}
```

### Usage

```typescript
// src/index.ts
async function main() {
  const agent = await createMultiChainAgent()

  while (true) {
    // Get trading decision
    const decision = await agent.send({
      context: multiChainContext,
      args: {
        symbol: "BTC",
        accountId: "account123"
      },
      input: "What's the best trading opportunity right now?"
    })

    // Execute trade
    if (decision.action === "buy" || decision.action === "sell") {
      await executeMultiChainTrade(decision)
    }

    // Wait for next interval
    await sleep(60000)
  }
}

main()
```

---

## 10. Daydreams Features for Multi-Chain

### Context Composition
```typescript
// Automatically compose all chain contexts
const composed = multiChainContext.use((state) => [
  { context: baseContext },
  { context: solanaContext },
  { context: hyperliquidContext },
  { context: bscContext }
])

// LLM gets all contexts automatically
```

### Memory System
```typescript
// Daydreams automatically persists state
// Working Memory: Current session
// Context Memory: Persistent storage

// Example: Remember best performing chain
agent.memory.set("best_chain", "hyperliquid")
agent.memory.set("best_venue", "uniswap-v4")
```

### Action System
```typescript
// Type-safe actions for each chain
const executeBaseAction = action({
  name: "execute_base_trade",
  schema: z.object({
    symbol: z.string(),
    side: z.enum(["buy", "sell"]),
    size: z.number()
  }),
  execute: async (input) => {
    const venue = await selectBestVenue("base", input.symbol)
    return await venue.placeOrder(input)
  }
})

// Similar for other chains
```

### Extension System
```typescript
// Add custom integrations
agent.extend({
  name: "hyperliquid-monitor",
  hooks: {
    onTrade: async (trade) => {
      // Monitor Hyperliquid trades
    }
  }
})
```

---

## Configuration

### .env

```bash
# BASE
BASE_RPC_URL=https://mainnet.base.org
BASE_PRIVATE_KEY=0x...

# SOLANA
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=base58_key

# HYPERLIQUID
HYPERLIQUID_PRIVATE_KEY=0x...
HYPERLIQUID_TESTNET=false

# BSC
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_PRIVATE_KEY=0x...

# DREAMS ROUTER
DREAMS_ROUTER_URL=https://router.daydreams.systems
X402_WALLET_ADDRESS=0x...
X402_PRIVATE_KEY=0x...

# ACTIVE CHAINS
ACTIVE_CHAINS=base,solana,hyperliquid,bsc
PRIMARY_CHAIN=hyperliquid
```

---

## References

- [Daydreams Docs](https://docs.dreams.fun)
- [Daydreams Contexts](https://docs.dreams.fun/docs/core#contexts)
- [Daydreams Composition](https://docs.dreams.fun/docs/core#composition)
- [Nocturne (Hyperliquid)](https://github.com/Gajesh2007/ai-trading-agent)
- [Base Docs](https://docs.base.org)
- [Solana Docs](https://docs.solana.com)
- [Hyperliquid Docs](https://hyperliquid.gitbook.io/hyperliquid-docs)
- [BSC Docs](https://docs.bnbchain.org)

---

**Your multi-chain agent is ready to trade across Base, Solana, Hyperliquid, and BSC! 🚀**
