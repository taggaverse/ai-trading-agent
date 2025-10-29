# Bridge API - Cross-Chain Gas Rebalancing

The agent now integrates with **gas.zip** to automatically bridge gas tokens across chains for rebalancing.

## Overview

The Bridge API allows you to:
- Get quotes for bridging gas tokens between chains
- Check if rebalancing is needed
- Find optimal bridge routes
- Automatically rebalance gas across chains

## API Endpoints

### 1. Check Rebalance Status

**Endpoint:** `POST /bridge/rebalance-check`

Check if any chains have insufficient gas and need rebalancing.

**Response:**
```json
{
  "needsRebalance": false,
  "deficitChains": ["base", "solana", "bsc"],
  "surplusChains": [],
  "currentBalances": {
    "base": 0,
    "solana": 0.0759,
    "bsc": 0,
    "hyperliquid": 0
  },
  "minRequired": {
    "base": 0.01,
    "solana": 0.1,
    "bsc": 0.01,
    "hyperliquid": 0
  },
  "timestamp": "2025-10-29T04:48:11.398Z"
}
```

**Fields:**
- `needsRebalance`: Whether rebalancing is recommended
- `deficitChains`: Chains below minimum gas threshold
- `surplusChains`: Chains with excess gas (>2x minimum)
- `currentBalances`: Current gas balance on each chain
- `minRequired`: Minimum gas required per chain

---

### 2. Get Bridge Quote

**Endpoint:** `GET /bridge/quote`

Get a quote for bridging gas tokens from one chain to another.

**Parameters:**
- `from` (string): Source chain (ethereum, base, bsc, arbitrum, optimism, polygon)
- `to` (string): Destination chain(s), comma-separated
- `amount` (number): Amount to bridge in native units (ETH, SOL, BNB, etc.)

**Example:**
```bash
curl "http://localhost:3000/bridge/quote?from=ethereum&to=base&amount=0.1"
```

**Response:**
```json
{
  "quote": {
    "expires": 1761713384,
    "quotes": [
      {
        "chain": 8453,
        "decimals": 18,
        "expected": 99999600000000000,
        "expectedNative": 99999600000000000,
        "gas": 0,
        "speed": 4,
        "usd": 401.71
      }
    ]
  },
  "timestamp": "2025-10-29T04:48:43.992Z"
}
```

**Quote Fields:**
- `chain`: Destination chain ID
- `expected`: Expected output in wei
- `expectedNative`: Expected output in native units
- `gas`: Estimated gas cost in wei
- `speed`: Estimated time to inclusion (seconds)
- `usd`: Estimated cost in USD

---

### 3. Get Recommended Route

**Endpoint:** `GET /bridge/route`

Get the recommended bridge route with cost and time estimates.

**Parameters:**
- `from` (string): Source chain
- `to` (string): Destination chain
- `amount` (number): Amount to bridge

**Example:**
```bash
curl "http://localhost:3000/bridge/route?from=ethereum&to=base&amount=0.1"
```

**Response:**
```json
{
  "route": {
    "quote": {
      "chain": 8453,
      "expected": 99999600000000000,
      "gas": 0,
      "speed": 4,
      "usd": 401.71
    },
    "estimatedTime": "4s",
    "estimatedCost": "$401.71"
  },
  "timestamp": "2025-10-29T04:48:43.992Z"
}
```

---

## Supported Chains

| Chain | ID | Min Gas |
|-------|----|----|
| Ethereum | 1 | 0.05 ETH |
| Base | 8453 | 0.01 ETH |
| BSC | 56 | 0.01 BNB |
| Arbitrum | 42161 | 0.01 ETH |
| Optimism | 10 | 0.01 ETH |
| Polygon | 137 | 1 MATIC |

**Note:** Solana is not directly supported by gas.zip. Bridge via Ethereum first.

---

## Usage Examples

### Example 1: Check if rebalancing is needed

```bash
curl -X POST http://localhost:3000/bridge/rebalance-check
```

If `needsRebalance` is `true`, you have deficit chains that need gas.

### Example 2: Bridge 0.1 ETH from Ethereum to Base

```bash
# Get a quote first
curl "http://localhost:3000/bridge/quote?from=ethereum&to=base&amount=0.1"

# Get recommended route
curl "http://localhost:3000/bridge/route?from=ethereum&to=base&amount=0.1"
```

### Example 3: Bridge to multiple chains

```bash
# Bridge 0.1 ETH to both Base and Arbitrum
curl "http://localhost:3000/bridge/quote?from=ethereum&to=base,arbitrum&amount=0.1"
```

---

## Rebalancing Logic

The agent automatically detects when rebalancing is needed:

1. **Deficit Detection**: Chain has less than minimum required gas
2. **Surplus Detection**: Chain has more than 2x minimum required gas
3. **Rebalance Trigger**: If deficit + surplus chains exist, rebalancing is recommended

### Minimum Gas Requirements

- **Base**: 0.01 ETH (~$30)
- **Solana**: 0.1 SOL (~$20)
- **BSC**: 0.01 BNB (~$6)
- **Hyperliquid**: 0 (uses USDC)

---

## Integration with Agent

The agent will:

1. **Monitor balances** every trading iteration
2. **Check for rebalance needs** using `/bridge/rebalance-check`
3. **Get quotes** for optimal routes
4. **Execute bridges** when needed to maintain minimum gas

---

## Cost Considerations

Bridge costs vary based on:
- **Source chain**: Network congestion
- **Destination chain**: Network congestion
- **Amount**: Larger amounts may have better rates
- **Speed**: Faster routes cost more

Typical costs:
- Ethereum → Base: $200-500
- Ethereum → BSC: $100-300
- Base → Arbitrum: $50-150

---

## Troubleshooting

### "Unsupported source chain"
- Check chain name is lowercase (ethereum, base, bsc, etc.)
- Verify chain is in the supported list

### "No supported destination chains"
- Ensure destination chain is spelled correctly
- Check destination chain is supported by gas.zip

### High bridge costs
- Try bridging smaller amounts
- Wait for lower network congestion
- Consider bridging during off-peak hours

---

## API Reference

### BridgeManager Class

```typescript
// Get a quote
await BridgeManager.getQuote(
  fromChain: string,
  toChains: string[],
  amountWei: string,
  fromAddress?: string,
  toAddress?: string
): Promise<BridgeQuoteResponse>

// Check if rebalancing is needed
BridgeManager.shouldRebalance(
  balances: Record<string, number>,
  minGasPerChain: Record<string, number>
): { needsRebalance: boolean; deficitChains: string[]; surplusChains: string[] }

// Calculate optimal bridge amount
BridgeManager.calculateBridgeAmount(
  surplusBalance: number,
  deficitRequired: number,
  minKeep?: number
): number

// Get recommended route
await BridgeManager.getRecommendedRoute(
  fromChain: string,
  toChain: string,
  amountEth: number
): Promise<{ quote: BridgeQuote; estimatedTime: string; estimatedCost: string } | null>

// Convert to/from wei
BridgeManager.toWei(amount: number): string
BridgeManager.fromWei(wei: string): number
```

---

## Related Documentation

- **WALLET_ADDRESSES.md** - Wallet address management
- **FUNDING_GUIDE.md** - How to fund wallets
- **QUICK_START.md** - Quick start guide

---

**Gas.zip Integration Ready! 🌉**

Your agent can now automatically rebalance gas across chains using gas.zip.
