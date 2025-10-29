# Multi-Chain Trading Strategy: Base, Solana, Hyperliquid, BSC

## Overview

Your agent will trade across **4 major chains** with optimized venues for each:

```
BASE (Ethereum L2)
├─ Venue: Uniswap V4, Aerodrome
├─ Type: Spot DEX
├─ Gas: Ultra-low (~$0.01)
└─ TVL: $2B+

SOLANA
├─ Venue: Raydium, Orca, Magic Eden
├─ Type: Spot DEX, Perpetuals
├─ Gas: Ultra-low (~$0.00025)
└─ TVL: $10B+

HYPERLIQUID (Arbitrum)
├─ Venue: Hyperliquid DEX
├─ Type: Perpetual Futures
├─ Leverage: 50x
└─ Reference: Gajesh2007/ai-trading-agent

BSC (Binance Smart Chain)
├─ Venue: PancakeSwap, Binance DEX
├─ Type: Spot DEX
├─ Gas: Low (~$0.10)
└─ TVL: $5B+
```

---

## Chain-Specific Implementation

### 1. BASE (Ethereum Layer 2)

#### Why Base?
- **Ultra-low fees**: ~$0.01 per transaction
- **EVM-compatible**: Easy to deploy contracts
- **High liquidity**: Uniswap V4, Aerodrome
- **Fast finality**: 2-second blocks
- **Coinbase backing**: Enterprise-grade infrastructure

#### Supported Venues

**Uniswap V4**
```typescript
// src/exchange/base/uniswap-v4.ts
import { UniswapV4Client } from "@uniswap/sdk-core"
import { ethers } from "ethers"

export class UniswapV4Adapter {
  private provider: ethers.Provider
  private signer: ethers.Signer
  private client: UniswapV4Client

  async initialize(privateKey: string) {
    const rpc = "https://mainnet.base.org"
    this.provider = new ethers.JsonRpcProvider(rpc)
    this.signer = new ethers.Wallet(privateKey, this.provider)
    
    this.client = new UniswapV4Client({
      signer: this.signer,
      chainId: 8453 // Base mainnet
    })
  }

  async getPrice(token0: string, token1: string): Promise<number> {
    const quote = await this.client.quoteExactInputSingle({
      tokenIn: token0,
      tokenOut: token1,
      amountIn: "1000000000000000000", // 1 token
      fee: 3000 // 0.3% fee tier
    })
    return Number(quote.amountOut) / 1e18
  }

  async swap(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    minAmountOut: string
  ) {
    return this.client.swapExactInputSingle({
      tokenIn,
      tokenOut,
      amountIn,
      amountOutMinimum: minAmountOut,
      recipient: await this.signer.getAddress()
    })
  }
}
```

**Aerodrome (Velodrome Fork)**
```typescript
// src/exchange/base/aerodrome.ts
export class AerodromeAdapter {
  // Similar to Uniswap V4
  // Optimized for Base
  // Lower fees (0.01%)
}
```

#### Configuration

```bash
# .env
BASE_RPC_URL=https://mainnet.base.org
BASE_PRIVATE_KEY=0x...
BASE_UNISWAP_ROUTER=0x...
BASE_AERODROME_ROUTER=0x...

# Gas settings
BASE_GAS_PRICE=0.01  # gwei
BASE_GAS_LIMIT=500000
```

#### Context Implementation

```typescript
// src/agent/contexts/base-trading.ts
import { context } from "@daydreamsai/core"
import { z } from "zod"

export const baseContext = context({
  type: "base-trading",
  schema: z.object({
    symbol: z.string(),
    accountId: z.string()
  }),
  create: () => ({
    chain: "base",
    venues: ["uniswap-v4", "aerodrome"],
    balance: 0,
    positions: [],
    gasPrice: 0.01
  })
})
```

---

### 2. SOLANA

#### Why Solana?
- **Fastest blockchain**: 400ms block time
- **Cheapest fees**: ~$0.00025 per transaction
- **High throughput**: 65,000 TPS
- **Massive liquidity**: $10B+ TVL
- **Perfect for high-frequency trading**

#### Supported Venues

**Raydium (AMM)**
```typescript
// src/exchange/solana/raydium.ts
import { Raydium } from "@raydium-io/raydium-sdk"
import { Connection, Keypair, PublicKey } from "@solana/web3.js"

export class RaydiumAdapter {
  private connection: Connection
  private keypair: Keypair
  private raydium: Raydium

  async initialize(privateKey: string) {
    const rpc = "https://api.mainnet-beta.solana.com"
    this.connection = new Connection(rpc, "confirmed")
    
    this.keypair = Keypair.fromSecretKey(
      Buffer.from(privateKey, "hex")
    )
    
    this.raydium = new Raydium({
      connection: this.connection,
      owner: this.keypair.publicKey
    })
  }

  async getPrice(tokenA: string, tokenB: string): Promise<number> {
    const pools = await this.raydium.getPools({
      tokenA: new PublicKey(tokenA),
      tokenB: new PublicKey(tokenB)
    })
    
    if (pools.length === 0) return 0
    
    const pool = pools[0]
    return pool.price
  }

  async swap(
    tokenIn: PublicKey,
    tokenOut: PublicKey,
    amountIn: number,
    minAmountOut: number
  ) {
    const tx = await this.raydium.swap({
      tokenIn,
      tokenOut,
      amountIn,
      minAmountOut,
      owner: this.keypair.publicKey
    })
    
    return this.connection.sendTransaction(tx, [this.keypair])
  }
}
```

**Orca (Concentrated Liquidity)**
```typescript
// src/exchange/solana/orca.ts
export class OrcaAdapter {
  // Concentrated liquidity AMM
  // Better for stable pairs
  // Lower slippage
}
```

**Magic Eden (NFT/Token Trading)**
```typescript
// src/exchange/solana/magic-eden.ts
export class MagicEdenAdapter {
  // Token trading
  // Emerging token discovery
  // Community-driven
}
```

#### Configuration

```bash
# .env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=base58_encoded_key
SOLANA_RAYDIUM_PROGRAM_ID=675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1xrS
SOLANA_ORCA_PROGRAM_ID=whirLbMiicVdio4KfUqKKvFWWa6MTbtSuWP9t5MRsKA

# Gas settings
SOLANA_PRIORITY_FEE=1000  # lamports
SOLANA_COMPUTE_LIMIT=200000
```

#### Context Implementation

```typescript
// src/agent/contexts/solana-trading.ts
export const solanaContext = context({
  type: "solana-trading",
  schema: z.object({
    symbol: z.string(),
    accountId: z.string()
  }),
  create: () => ({
    chain: "solana",
    venues: ["raydium", "orca", "magic-eden"],
    balance: 0,
    positions: [],
    priorityFee: 1000,
    computeLimit: 200000
  })
})
```

---

### 3. HYPERLIQUID (Arbitrum)

#### Why Hyperliquid?
- **Decentralized perpetuals**: True on-chain trading
- **High leverage**: Up to 50x
- **Low fees**: 0.02% maker, 0.05% taker
- **Deep liquidity**: $500M+ daily volume
- **Proven by Nocturne**: Reference implementation available

#### Reference: Gajesh2007/ai-trading-agent

**Architecture Pattern** (from Nocturne):
```
main.py (Entry point)
  ↓
decision_maker.py (LLM logic with tool calling)
  ↓
taapi_client.py (Fetch indicators)
  ↓
hyperliquid_api.py (Execute trades)
```

**Our Adaptation**:
```typescript
// src/exchange/hyperliquid/hyperliquid.ts
import { HyperliquidClient } from "@hyperliquid/sdk"

export class HyperliquidAdapter {
  private client: HyperliquidClient
  private privateKey: string

  async initialize(privateKey: string) {
    this.privateKey = privateKey
    this.client = new HyperliquidClient({
      privateKey,
      testnet: false
    })
  }

  // Fetch account state
  async getAccountState() {
    return this.client.getAccountState()
  }

  // Get open positions
  async getOpenPositions() {
    const state = await this.getAccountState()
    return state.assetPositions
  }

  // Place order (from Nocturne pattern)
  async placeOrder(
    symbol: string,
    side: "buy" | "sell",
    size: number,
    leverage: number,
    stopLoss?: number,
    takeProfit?: number
  ) {
    const order = {
      symbol,
      side,
      size,
      leverage,
      orderType: "market"
    }

    const response = await this.client.placeOrder(order)

    // Set stop-loss and take-profit (from Nocturne)
    if (stopLoss) {
      await this.client.placeOrder({
        symbol,
        side: side === "buy" ? "sell" : "buy",
        size,
        orderType: "stop",
        triggerPrice: stopLoss
      })
    }

    if (takeProfit) {
      await this.client.placeOrder({
        symbol,
        side: side === "buy" ? "sell" : "buy",
        size,
        orderType: "limit",
        price: takeProfit
      })
    }

    return response
  }

  // Close position
  async closePosition(symbol: string) {
    const positions = await this.getOpenPositions()
    const position = positions.find(p => p.symbol === symbol)
    
    if (!position) return null

    return this.placeOrder(
      symbol,
      position.side === "long" ? "sell" : "buy",
      position.size,
      1 // Close at 1x
    )
  }

  // Get market data
  async getMarketData(symbol: string) {
    return this.client.getMarketData(symbol)
  }
}
```

#### Configuration

```bash
# .env
HYPERLIQUID_PRIVATE_KEY=0x...
HYPERLIQUID_TESTNET=false
HYPERLIQUID_MAX_LEVERAGE=20  # Conservative default
HYPERLIQUID_STOP_LOSS_PCT=2  # 2% stop loss
HYPERLIQUID_TAKE_PROFIT_PCT=3  # 3% take profit
```

#### Context Implementation

```typescript
// src/agent/contexts/hyperliquid-trading.ts
export const hyperliquidContext = context({
  type: "hyperliquid-trading",
  schema: z.object({
    symbol: z.string(),
    accountId: z.string()
  }),
  create: () => ({
    chain: "arbitrum",
    venue: "hyperliquid",
    leverage: 20,
    maxLeverage: 50,
    stopLossPct: 2,
    takeProfitPct: 3,
    positions: []
  })
})
```

#### Integration with Nocturne Patterns

**Tool Calling Pattern** (from Nocturne):
```typescript
// LLM can request indicators dynamically
const tools = [
  {
    name: "get_rsi",
    description: "Get RSI indicator for symbol",
    parameters: {
      symbol: "string",
      period: "number"
    }
  },
  {
    name: "get_market_data",
    description: "Get current market data",
    parameters: {
      symbol: "string"
    }
  }
]
```

**Continuous Loop Pattern** (from Nocturne):
```typescript
// Main trading loop
while (true) {
  for (const symbol of tradingSymbols) {
    // 1. Fetch indicators
    const indicators = await fetchIndicators(symbol)
    
    // 2. Get LLM decision
    const decision = await agent.send({
      input: `Trade ${symbol}?`,
      context: hyperliquidContext
    })
    
    // 3. Execute trade
    if (decision.action === "buy" || decision.action === "sell") {
      await placeOrder(decision)
    }
    
    // 4. Log results
    logger.info(`Decision: ${decision.action}`)
  }
  
  await sleep(interval)
}
```

---

### 4. BSC (Binance Smart Chain)

#### Why BSC?
- **Binance ecosystem**: Direct integration with Binance
- **Low fees**: ~$0.10 per transaction
- **High liquidity**: $5B+ TVL
- **EVM-compatible**: Easy deployment
- **Asian market focus**: Large user base

#### Supported Venues

**PancakeSwap (AMM)**
```typescript
// src/exchange/bsc/pancakeswap.ts
import { PancakeSwapClient } from "@pancakeswap/sdk"
import { ethers } from "ethers"

export class PancakeSwapAdapter {
  private provider: ethers.Provider
  private signer: ethers.Signer
  private client: PancakeSwapClient

  async initialize(privateKey: string) {
    const rpc = "https://bsc-dataseed.binance.org"
    this.provider = new ethers.JsonRpcProvider(rpc)
    this.signer = new ethers.Wallet(privateKey, this.provider)
    
    this.client = new PancakeSwapClient({
      signer: this.signer,
      chainId: 56 // BSC mainnet
    })
  }

  async getPrice(token0: string, token1: string): Promise<number> {
    const quote = await this.client.quoteExactInputSingle({
      tokenIn: token0,
      tokenOut: token1,
      amountIn: "1000000000000000000",
      fee: 2500 // 0.25% fee tier
    })
    return Number(quote.amountOut) / 1e18
  }

  async swap(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    minAmountOut: string
  ) {
    return this.client.swapExactInputSingle({
      tokenIn,
      tokenOut,
      amountIn,
      amountOutMinimum: minAmountOut,
      recipient: await this.signer.getAddress()
    })
  }
}
```

#### Configuration

```bash
# .env
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_PRIVATE_KEY=0x...
BSC_PANCAKESWAP_ROUTER=0x...

# Gas settings
BSC_GAS_PRICE=5  # gwei
BSC_GAS_LIMIT=500000
```

#### Context Implementation

```typescript
// src/agent/contexts/bsc-trading.ts
export const bscContext = context({
  type: "bsc-trading",
  schema: z.object({
    symbol: z.string(),
    accountId: z.string()
  }),
  create: () => ({
    chain: "bsc",
    venues: ["pancakeswap"],
    balance: 0,
    positions: [],
    gasPrice: 5
  })
})
```

---

## Multi-Chain Venue Manager

```typescript
// src/exchange/multi-chain-manager.ts
export class MultiChainVenueManager {
  private venues: Map<string, Map<string, ExchangeAdapter>> = new Map()

  async initialize() {
    // BASE venues
    this.venues.set("base", new Map([
      ["uniswap-v4", new UniswapV4Adapter()],
      ["aerodrome", new AerodromeAdapter()]
    ]))

    // SOLANA venues
    this.venues.set("solana", new Map([
      ["raydium", new RaydiumAdapter()],
      ["orca", new OrcaAdapter()],
      ["magic-eden", new MagicEdenAdapter()]
    ]))

    // HYPERLIQUID venues
    this.venues.set("hyperliquid", new Map([
      ["hyperliquid", new HyperliquidAdapter()]
    ]))

    // BSC venues
    this.venues.set("bsc", new Map([
      ["pancakeswap", new PancakeSwapAdapter()]
    ]))

    // Initialize all
    for (const chainVenues of this.venues.values()) {
      for (const adapter of chainVenues.values()) {
        await adapter.initialize()
      }
    }
  }

  async getVenue(chain: string, venue: string): Promise<ExchangeAdapter> {
    const chainVenues = this.venues.get(chain)
    if (!chainVenues) throw new Error(`Chain ${chain} not found`)
    
    const adapter = chainVenues.get(venue)
    if (!adapter) throw new Error(`Venue ${venue} not found on ${chain}`)
    
    return adapter
  }

  async getBestVenue(
    chain: string,
    symbol: string,
    side: "buy" | "sell"
  ): Promise<string> {
    const chainVenues = this.venues.get(chain)
    if (!chainVenues) throw new Error(`Chain ${chain} not found`)

    const prices = await Promise.all(
      Array.from(chainVenues.entries()).map(async ([name, venue]) => {
        try {
          const price = await venue.getPrice(symbol)
          return { name, price }
        } catch {
          return null
        }
      })
    )

    const validPrices = prices.filter(p => p !== null)
    if (side === "buy") {
      return validPrices.reduce((best, current) =>
        current.price < best.price ? current : best
      ).name
    } else {
      return validPrices.reduce((best, current) =>
        current.price > best.price ? current : best
      ).name
    }
  }

  async executeTrade(
    chain: string,
    venue: string,
    symbol: string,
    side: "buy" | "sell",
    size: number,
    price?: number
  ) {
    const adapter = await this.getVenue(chain, venue)
    return adapter.placeOrder(symbol, side, size, price)
  }
}
```

---

## Multi-Chain Trading Context

```typescript
// src/agent/contexts/multi-chain-trading.ts
export const multiChainTradingContext = context({
  type: "multi-chain-trading",
  schema: z.object({
    symbol: z.string(),
    accountId: z.string()
  }),
  create: () => ({
    chains: ["base", "solana", "hyperliquid", "bsc"],
    balances: {},
    positions: {},
    bestChain: null
  })
}).use((state) => [
  { context: marketContext, args: { symbol: state.args.symbol } },
  { context: researchContext, args: { symbol: state.args.symbol } },
  { context: portfolioContext, args: { accountId: state.args.accountId } },
  { context: riskContext, args: { accountId: state.args.accountId } }
])
```

---

## Chain Selection Strategy

```typescript
function selectChain(criteria: {
  symbol: string
  urgency: "low" | "medium" | "high"
  size: number
  leverage: boolean
}): string {
  // 1. If leverage needed → Hyperliquid
  if (criteria.leverage) {
    return "hyperliquid"
  }

  // 2. If high urgency → Solana (fastest)
  if (criteria.urgency === "high") {
    return "solana"
  }

  // 3. If low fees needed → Base or Solana
  if (criteria.size < 1000) {
    return "base" // Ultra-low fees
  }

  // 4. If high volume → BSC
  if (criteria.size > 10000) {
    return "bsc"
  }

  // 5. Default → Base
  return "base"
}
```

---

## Configuration

### .env Template

```bash
# BASE
BASE_RPC_URL=https://mainnet.base.org
BASE_PRIVATE_KEY=0x...
BASE_UNISWAP_ROUTER=0x...

# SOLANA
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=base58_key
SOLANA_RAYDIUM_PROGRAM_ID=675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1xrS

# HYPERLIQUID
HYPERLIQUID_PRIVATE_KEY=0x...
HYPERLIQUID_TESTNET=false
HYPERLIQUID_MAX_LEVERAGE=20

# BSC
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_PRIVATE_KEY=0x...
BSC_PANCAKESWAP_ROUTER=0x...

# GENERAL
ACTIVE_CHAINS=base,solana,hyperliquid,bsc
PRIMARY_CHAIN=hyperliquid
FALLBACK_CHAINS=base,solana,bsc

# DREAMS ROUTER
DREAMS_ROUTER_URL=https://router.daydreams.systems
X402_WALLET_ADDRESS=0x...
X402_PRIVATE_KEY=0x...
```

---

## File Structure

```
src/
├── exchange/
│   ├── multi-chain-manager.ts
│   ├── base/
│   │   ├── uniswap-v4.ts
│   │   └── aerodrome.ts
│   ├── solana/
│   │   ├── raydium.ts
│   │   ├── orca.ts
│   │   └── magic-eden.ts
│   ├── hyperliquid/
│   │   └── hyperliquid.ts
│   └── bsc/
│       └── pancakeswap.ts
│
├── agent/
│   └── contexts/
│       ├── base-trading.ts
│       ├── solana-trading.ts
│       ├── hyperliquid-trading.ts
│       ├── bsc-trading.ts
│       └── multi-chain-trading.ts
│
└── config/
    ├── chains.config.ts
    └── venues.config.ts
```

---

## Chain Comparison

| Aspect | Base | Solana | Hyperliquid | BSC |
|--------|------|--------|-------------|-----|
| **Type** | L2 | L1 | Perpetuals | L1 |
| **Gas** | $0.01 | $0.00025 | N/A | $0.10 |
| **Speed** | 2s | 400ms | 2s | 3s |
| **TVL** | $2B | $10B | $500M | $5B |
| **Venues** | Uniswap, Aerodrome | Raydium, Orca | Hyperliquid | PancakeSwap |
| **Best For** | Spot trading | High-frequency | Leverage | Volume |

---

## Implementation Phases

### Phase 1: Hyperliquid Foundation (Week 1)
- [ ] Study Gajesh2007/ai-trading-agent
- [ ] Implement Hyperliquid adapter
- [ ] Copy Nocturne patterns
- [ ] Test on testnet

### Phase 2: Base Integration (Week 2)
- [ ] Implement Uniswap V4 adapter
- [ ] Add Base context
- [ ] Test swaps
- [ ] Integrate with Dreams Router

### Phase 3: Solana Integration (Week 2)
- [ ] Implement Raydium adapter
- [ ] Add Solana context
- [ ] Test swaps
- [ ] Optimize for speed

### Phase 4: BSC Integration (Week 3)
- [ ] Implement PancakeSwap adapter
- [ ] Add BSC context
- [ ] Test swaps
- [ ] Integrate with portfolio

### Phase 5: Multi-Chain Orchestration (Week 3)
- [ ] Implement multi-chain manager
- [ ] Add chain selection logic
- [ ] Cross-chain arbitrage
- [ ] Portfolio rebalancing

---

## References

- **Hyperliquid**: [Gajesh2007/ai-trading-agent](https://github.com/Gajesh2007/ai-trading-agent)
- **Base**: [Uniswap V4 Docs](https://uniswap.org/blog/uniswap-v4)
- **Solana**: [Raydium SDK](https://github.com/raydium-io/raydium-sdk)
- **BSC**: [PancakeSwap Docs](https://docs.pancakeswap.finance/)
- **Daydreams**: [Daydreams Docs](https://docs.dreams.fun)

---

**Your agent will trade across 4 major chains with optimized venues for each! 🚀**
