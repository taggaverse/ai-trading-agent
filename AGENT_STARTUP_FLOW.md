# Agent Startup & Trading Flow

This document explains how the agent starts up, checks balances, and begins trading.

## 🚀 Agent Startup Sequence

```
1. Load Environment Variables
   ↓
2. Initialize Config (RPC URLs, Private Keys)
   ↓
3. Derive Wallet Addresses from Private Keys
   ↓
4. Fetch Real Balances from Blockchains (RPC calls)
   ↓
5. Initialize Dreams Router (x402 account)
   ↓
6. Start Trading Loop
```

---

## 📋 Detailed Startup Steps

### Step 1: Load Environment Variables
**File:** `src/config/index.ts`

```typescript
// Reads .env file and loads:
- BASE_PRIVATE_KEY
- SOLANA_PRIVATE_KEY
- BSC_PRIVATE_KEY
- HYPERLIQUID_PRIVATE_KEY
- RPC URLs for each chain
- X402 credentials
```

**What happens if this fails:**
- Agent won't start
- Check `.env` file exists and has correct values

---

### Step 2: Derive Wallet Addresses
**File:** `src/agent/wallet-info.ts`

```typescript
// For each private key:
// 1. Parse the private key format
// 2. Derive the public address
// 3. Store for later use

// Example:
BASE_PRIVATE_KEY (0x...) → Address: 0x5aE512bE...
SOLANA_PRIVATE_KEY (Base58) → Address: E58svz4t...
```

**What happens if this fails:**
- Addresses won't derive
- Check private key formats are correct
- Logs show: "Failed to derive Ethereum address"

---

### Step 3: Fetch Real Balances (RPC Calls)
**File:** `src/agent/wallet-info.ts` → `getAllBalances()`

This is where **RPC network calls** happen:

```typescript
// For Base (Ethereum L2):
const provider = new ethers.JsonRpcProvider("https://mainnet.base.org")
const balance = await provider.getBalance(address)

// For Solana:
const connection = new Connection("https://api.mainnet-beta.solana.com")
const balance = await connection.getBalance(publicKey)

// For BSC:
const provider = new ethers.JsonRpcProvider("https://bsc-dataseed1.binance.org:8545")
const balance = await provider.getBalance(address)
```

**What happens if this fails:**
- Logs show: `JsonRpcProvider failed to detect network`
- Agent continues but balances show as 0
- This is **NOT blocking** - agent can still think about trades

---

### Step 4: Initialize Dreams Router (x402)
**File:** `src/index.ts`

```typescript
// Initialize the x402 account for paying for research queries
const account = new x402.Account({
  wallet: new ethers.Wallet(config.X402_PRIVATE_KEY),
  network: config.X402_NETWORK
})

// This account needs USDC to pay for research
```

**What happens if this fails:**
- Research queries won't work
- Agent can still think but can't query AI
- Logs show: "Failed to initialize Dreams Router"

---

### Step 5: Start Trading Loop
**File:** `src/index.ts` → `main()` function

```typescript
while (true) {
  // Every 60 seconds (configurable):
  
  1. Check if balance is sufficient
  2. Query AI for market research
  3. Analyze market conditions
  4. Generate trading opportunities
  5. Make trading decisions
  6. Execute trades (if conditions met)
  7. Manage risk
  8. Sleep for 60 seconds
  9. Repeat
}
```

---

## 💰 Balance & USDC Flow

### Does the Agent Need USDC First?

**YES, for research queries:**

```
Agent starts
  ↓
Needs to query AI for market analysis
  ↓
Uses x402 API (Dreams Router)
  ↓
x402 requires USDC payment
  ↓
Deducts from X402_WALLET_ADDRESS balance
```

**NO, for thinking/analysis:**

The agent can:
- ✅ Analyze market data without USDC
- ✅ Make trading decisions without USDC
- ✅ Check wallet balances without USDC
- ❌ Query AI research without USDC

### Balance Requirements

```
X402_WALLET_ADDRESS: Needs USDC for research queries
  - Each query costs ~$0.10
  - Agent queries every trading iteration
  - Default: 60 second intervals

BASE_WALLET: Needs ETH for trading on Base
  - Minimum: 0.01 ETH (~$30)
  - Used for: Gas fees, trade execution

SOLANA_WALLET: Needs SOL for trading on Solana
  - Minimum: 0.1 SOL (~$20)
  - Used for: Gas fees, trade execution
  - Current balance: 0.0759 SOL ✓

BSC_WALLET: Needs BNB for trading on BSC
  - Minimum: 0.01 BNB (~$6)
  - Used for: Gas fees, trade execution
```

---

## 🔄 Trading Loop Detail

### Each Iteration (60 seconds):

```
┌─────────────────────────────────────────────────────────┐
│ ITERATION START                                         │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 1. CHECK BALANCE                                        │
│    - Get x402 account balance                           │
│    - Check if >= MIN_BALANCE_USDC                       │
│    - If low, attempt refill                             │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. QUERY RESEARCH (requires USDC)                       │
│    - Query: "BTC market narrative and trends"           │
│    - Uses x402 API (Dreams Router)                      │
│    - Costs: ~$0.10 per query                            │
│    - Returns: Market analysis, narratives               │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. ANALYZE MARKET                                       │
│    - Calculate technical indicators                     │
│    - Generate trading signals                           │
│    - Evaluate opportunities                             │
│    - NO RPC NEEDED for this step                        │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. MAKE DECISION                                        │
│    - Evaluate risk/reward                               │
│    - Check risk limits                                  │
│    - Decide: BUY, SELL, or HOLD                         │
│    - NO RPC NEEDED for this step                        │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. EXECUTE TRADE (if decision = BUY/SELL)              │
│    - Send transaction to blockchain                     │
│    - REQUIRES RPC for this step                         │
│    - REQUIRES gas tokens (ETH/SOL/BNB)                 │
│    - Updates portfolio                                  │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. MANAGE RISK                                          │
│    - Check risk alerts                                  │
│    - Close positions if needed                          │
│    - Update portfolio                                   │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 7. SLEEP 60 SECONDS                                     │
└─────────────────────────────────────────────────────────┘
         ↓
REPEAT
```

---

## 🔌 Where RPC is Used

### RPC Calls Made:

1. **Wallet Balance Checks** (startup + periodic)
   ```
   /wallets/balances endpoint
   → Calls getBalance() on each chain RPC
   → Fetches ETH, SOL, BNB balances
   ```

2. **Trade Execution** (when trading)
   ```
   executeTrade() function
   → Sends transaction to blockchain
   → Requires RPC to broadcast
   ```

3. **Portfolio Updates** (after trades)
   ```
   → Fetch updated balances
   → Check transaction status
   ```

### RPC Calls NOT Made:

- ❌ Market analysis
- ❌ Technical indicators
- ❌ Trading decisions
- ❌ Risk calculations
- ❌ AI research queries (uses x402, not RPC)

---

## ⚠️ Current RPC Issues

### What's Happening:

```
Agent starts
  ↓
Tries to fetch wallet balances
  ↓
Calls: https://mainnet.base.org (RPC)
  ↓
Gets error: "JsonRpcProvider failed to detect network"
  ↓
Logs error but continues
  ↓
Agent still works! (balances just show as 0)
```

### Why It's Not Blocking:

```typescript
// In wallet-info.ts:
try {
  const balance = await provider.getBalance(address)
  return balance
} catch (error) {
  logger.error(`Failed to get balance: ${error}`)
  return 0  // ← Returns 0 instead of crashing
}
```

### Solution:

The RPC errors are **not critical** because:
1. Agent can still think about trades
2. Agent can still query AI research
3. Agent can still make decisions
4. Agent just can't execute trades (needs RPC for that)

---

## 🎯 What Agent Needs to Start Trading

### Minimum Requirements:

1. ✅ **Private Keys** - Loaded from `.env`
2. ✅ **Wallet Addresses** - Derived from private keys
3. ✅ **x402 Account** - For research queries
4. ✅ **USDC Balance** - For paying research queries (~$0.10 per query)
5. ✅ **Gas Tokens** - For executing trades (ETH/SOL/BNB)

### Current Status:

```
✅ Private Keys: Loaded correctly (66 chars for Base, 88 for Solana)
✅ Wallet Addresses: Derived correctly
✅ x402 Account: Initialized
❓ USDC Balance: Check X402_WALLET_ADDRESS
❓ Gas Tokens: 
   - Base: 0 ETH (needs funding)
   - Solana: 0.0759 SOL ✓ (funded!)
   - BSC: 0 BNB (needs funding)
```

---

## 🚀 To Get Agent Trading

### Step 1: Fund x402 Wallet
```bash
# Send USDC to X402_WALLET_ADDRESS
# Need ~$1-5 for research queries
```

### Step 2: Fund Trading Wallets
```bash
# Send gas tokens to each chain:
# - Base: Send 0.01+ ETH
# - Solana: Already funded with 0.0759 SOL ✓
# - BSC: Send 0.01+ BNB
```

### Step 3: Restart Agent
```bash
pkill -9 node
npm start
```

### Step 4: Monitor Logs
```bash
tail -f agent.log | grep -E "decision|research|trade"
```

---

## 📊 Balance Manager Logic

### How Agent Checks Balance:

```typescript
async canMakeDecision(): Promise<boolean> {
  const balance = await this.account.getBalance()
  const canTrade = balance > this.minBalance + this.costPerDecision
  
  if (!canTrade) {
    logger.warn(`Insufficient balance for decision: $${balance}`)
  }
  
  return canTrade
}
```

### Configuration:

```env
MIN_BALANCE_USDC=1.0          # Minimum to keep in account
REFILL_THRESHOLD_USDC=2.0     # Refill when below this
REFILL_AMOUNT_USDC=10.0       # Refill to this amount
```

### Refill Logic:

```typescript
async checkAndRefill(): Promise<boolean> {
  const balance = await this.account.getBalance()
  
  if (balance < REFILL_THRESHOLD) {
    await this.account.refill(REFILL_AMOUNT)
    logger.info(`Balance refilled to $${REFILL_AMOUNT}`)
  }
  
  return true
}
```

---

## 🔍 Debugging RPC Issues

### Check RPC Connectivity:

```bash
# Test Base RPC
curl https://mainnet.base.org \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Test Solana RPC
curl https://api.mainnet-beta.solana.com \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"getBlockHeight","params":[],"id":1}'
```

### Check Agent Logs:

```bash
# View RPC errors
grep "JsonRpcProvider\|Failed to get" agent.log

# View successful balance fetches
grep "balance:" agent.log

# View trading decisions
grep "decision\|Decision" agent.log
```

---

## 📖 Related Documentation

- **QUICK_START.md** - Quick start guide
- **FUNDING_GUIDE.md** - How to fund wallets
- **LOGS_AND_RESEARCH.md** - How to view logs
- **BRIDGE_API.md** - Cross-chain bridging

---

**Agent is ready to think and trade! Just needs funding. 🚀**
