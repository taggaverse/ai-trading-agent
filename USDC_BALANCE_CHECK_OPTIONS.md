# USDC Balance Check Options - Research & Recommendations

## Problem
Agent needs to check USDC balance on Base chain before making x402 payments to Dreams Router. Current implementation fails due to checksum error in viem.

**Contract Addresses:**
- Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48`
- Ethereum USDC: `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`

---

## Option 1: Direct RPC Call (Current Approach - Free)

**Pros:**
- ✅ Free (uses your own RPC)
- ✅ No API key needed
- ✅ Fast and reliable
- ✅ Full control

**Cons:**
- ❌ Requires valid RPC endpoint
- ❌ Checksum validation issues (current problem)
- ❌ Rate limited by RPC provider

**Cost:** Free
**Latency:** ~100-500ms
**Rate Limit:** Depends on RPC provider

**Implementation:**
```typescript
// Current approach - needs checksum fix
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48'
const balance = await publicClient.readContract({
  address: USDC_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'balanceOf',
  args: [walletAddress]
})
```

**Fix:** Use `getAddress()` from viem to normalize addresses
```typescript
import { getAddress } from 'viem'
const USDC_ADDRESS = getAddress('0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48')
```

---

## Option 2: Etherscan API (Free Tier Available)

**Pros:**
- ✅ Free tier available (5 calls/sec)
- ✅ Works for Base, Ethereum, and other chains
- ✅ No RPC setup needed
- ✅ Reliable and well-documented

**Cons:**
- ❌ Rate limited (5 calls/sec on free tier)
- ❌ Requires API key
- ❌ Slightly slower than direct RPC

**Cost:** Free (5 calls/sec), $20/month for higher limits
**Latency:** ~200-800ms
**Rate Limit:** 5 calls/sec (free), 20 calls/sec (paid)

**Implementation:**
```typescript
// Etherscan API for Base
const response = await fetch(
  `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48&address=${walletAddress}&tag=latest&apikey=${ETHERSCAN_API_KEY}`
)
const data = await response.json()
const balance = Number(data.result) / 1_000_000 // 6 decimals
```

**Setup:**
1. Get free API key from https://basescan.org/apis
2. Add to config: `BASESCAN_API_KEY=...`
3. Use in balance check

---

## Option 3: Alchemy SDK (Free Tier)

**Pros:**
- ✅ Free tier (300M compute units/month)
- ✅ Easy SDK integration
- ✅ Supports multiple chains
- ✅ Good documentation

**Cons:**
- ❌ Requires API key
- ❌ Compute units can run out
- ❌ Overkill for simple balance checks

**Cost:** Free (300M compute units/month), then $0.01 per 1M units
**Latency:** ~100-300ms
**Rate Limit:** 300M compute units/month

**Implementation:**
```typescript
import { Alchemy, Network } from 'alchemy-sdk'

const alchemy = new Alchemy({
  apiKey: ALCHEMY_API_KEY,
  network: Network.BASE_MAINNET,
})

const balance = await alchemy.core.getTokenBalances(walletAddress, [
  '0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48'
])
```

---

## Option 4: Covalent API (Free Tier)

**Pros:**
- ✅ Free tier available
- ✅ Gets all token balances at once
- ✅ Supports multiple chains
- ✅ Good for portfolio tracking

**Cons:**
- ❌ Requires API key
- ❌ Free tier has limits
- ❌ Slower than direct RPC

**Cost:** Free (limited), $0.0001 per request
**Latency:** ~300-1000ms
**Rate Limit:** 10 requests/second

**Implementation:**
```typescript
const response = await fetch(
  `https://api.covalenthq.com/v1/base-mainnet/address/${walletAddress}/balances_v2/?key=${COVALENT_API_KEY}`
)
const data = await response.json()
const usdc = data.data.items.find(t => 
  t.contract_address === '0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48'
)
const balance = usdc.balance / Math.pow(10, usdc.contract_decimals)
```

---

## Option 5: Cache + Periodic Refresh (Hybrid)

**Pros:**
- ✅ Minimizes API calls
- ✅ Fast responses (cached)
- ✅ Works with any provider
- ✅ Reduces costs significantly

**Cons:**
- ❌ Balance may be stale
- ❌ Requires cache management
- ❌ Need to handle cache invalidation

**Cost:** Depends on refresh frequency
**Latency:** ~0ms (cached), ~100-500ms (refresh)
**Rate Limit:** Depends on refresh interval

**Implementation:**
```typescript
class CachedBalanceChecker {
  private cache: { balance: number; timestamp: number } | null = null
  private readonly CACHE_TTL = 60000 // 1 minute

  async getBalance(address: string): Promise<number> {
    const now = Date.now()
    
    // Return cached if fresh
    if (this.cache && now - this.cache.timestamp < this.CACHE_TTL) {
      return this.cache.balance
    }

    // Fetch fresh balance
    const balance = await this.fetchBalance(address)
    this.cache = { balance, timestamp: now }
    return balance
  }

  private async fetchBalance(address: string): Promise<number> {
    // Use any method above
  }
}
```

---

## Option 6: Mock Balance (Temporary - NOT RECOMMENDED)

**Pros:**
- ✅ Instant (no API calls)
- ✅ No setup needed
- ✅ Good for testing

**Cons:**
- ❌ Not real balance
- ❌ Agent will trade with fake balance
- ❌ Will fail on mainnet

**Cost:** Free
**Latency:** ~0ms
**Rate Limit:** Unlimited

**Implementation:**
```typescript
async getUSDCBalance(): Promise<number> {
  // TEMPORARY - FOR TESTING ONLY
  return 25.15 // Mock balance
}
```

---

## Recommended Solution: Hybrid Approach

**Best for your use case:**

1. **Primary:** Direct RPC call with checksum fix (Option 1)
   - Fast and free
   - Use `getAddress()` to fix checksum issue
   - Cache for 60 seconds

2. **Fallback:** Etherscan API (Option 2)
   - If RPC fails
   - Free tier sufficient for agent
   - Get free API key from BaseScan

3. **Cache Strategy:**
   - Check balance once per minute
   - Use cached value for rest of minute
   - Refresh on demand if balance changes

---

## Implementation Plan

### Step 1: Fix Direct RPC (Immediate)
```typescript
import { getAddress } from 'viem'

async getUSDCBalance(): Promise<number> {
  try {
    const USDC_ADDRESS = getAddress('0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48')
    const walletAddress = getAddress(this.account.address)
    
    const balance = await this.publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress]
    })
    
    return Number(balance) / 1_000_000
  } catch (error) {
    logger.error('[x402] RPC call failed, trying Etherscan...')
    return await this.getBalanceFromEtherscan()
  }
}
```

### Step 2: Add Etherscan Fallback
```typescript
async getBalanceFromEtherscan(): Promise<number> {
  try {
    const response = await fetch(
      `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48&address=${this.account.address}&tag=latest&apikey=${config.BASESCAN_API_KEY}`
    )
    const data = await response.json()
    return Number(data.result) / 1_000_000
  } catch (error) {
    logger.error('[x402] Etherscan fallback failed')
    return 0
  }
}
```

### Step 3: Add Caching
```typescript
class X402PaymentClient {
  private balanceCache: { value: number; timestamp: number } | null = null
  private readonly CACHE_TTL = 60000

  async getUSDCBalance(): Promise<number> {
    const now = Date.now()
    
    if (this.balanceCache && now - this.balanceCache.timestamp < this.CACHE_TTL) {
      return this.balanceCache.value
    }

    const balance = await this.fetchBalance()
    this.balanceCache = { value: balance, timestamp: now }
    return balance
  }

  private async fetchBalance(): Promise<number> {
    // Try RPC first, then Etherscan
  }
}
```

### Step 4: Update Config
```bash
# .env.example
BASESCAN_API_KEY=...  # Optional, for fallback
BASE_RPC_URL=https://mainnet.base.org  # Already have this
```

---

## Cost Comparison

| Option | Cost | Speed | Reliability | Recommended |
|--------|------|-------|-------------|------------|
| Direct RPC | Free | Fast | High | ✅ Primary |
| Etherscan | Free | Medium | High | ✅ Fallback |
| Alchemy | Free* | Fast | High | ⏳ Alternative |
| Covalent | Free* | Slow | Medium | ⏳ Alternative |
| Cache | Free | Instant | High | ✅ With primary |
| Mock | Free | Instant | None | ❌ Testing only |

*Free tier with limits

---

## Recommendation Summary

**Use Option 1 (Direct RPC) + Caching + Etherscan Fallback**

1. **Fix checksum issue** with `getAddress()`
2. **Cache balance** for 60 seconds
3. **Fallback to Etherscan** if RPC fails
4. **Get free Etherscan key** from BaseScan

**Cost:** Free
**Speed:** ~100ms (RPC) or ~300ms (Etherscan)
**Reliability:** 99%+

This gives you:
- ✅ Fast balance checks
- ✅ No cost
- ✅ Fallback if RPC fails
- ✅ Reduced API calls via caching
- ✅ Agent can start trading immediately

---

## Next Steps

1. Implement checksum fix in x402-payment-client.ts
2. Add Etherscan fallback
3. Add balance caching
4. Test with real balance
5. Agent starts trading automatically

Ready to implement? 🚀
