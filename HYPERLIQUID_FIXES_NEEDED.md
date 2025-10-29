# Critical Fixes Needed for Hyperliquid Trading Agent

## Current Issues

### 1. **Hardcoded Balance in Hyperliquid Client** ❌
- **File**: `src/agent/hyperliquid-client.ts`
- **Issue**: `getUserState()` returns hardcoded `balance: 10000` instead of real balance
- **Impact**: Agent doesn't know its real USDC balance, can't make informed decisions
- **Fix**: Call real Hyperliquid API to fetch account state

### 2. **No Real Market Data** ❌
- **File**: `src/agent/hyperliquid-trading-loop.ts`
- **Issue**: Mock RSI values (50-70 range) instead of real technical indicators
- **Impact**: Agent always makes HOLD decisions based on fake data
- **Fix**: Fetch real OHLCV data and calculate indicators (RSI, MACD, EMA)

### 3. **Hardcoded Asset List** ❌
- **File**: `src/agent/hyperliquid-trading-loop.ts` (line 304)
- **Issue**: Only trades BTC/ETH hardcoded, but agent doesn't hold these
- **Impact**: Agent tries to trade assets it doesn't have
- **Fix**: Dynamically detect assets from portfolio positions

### 4. **x402 Balance Not Connected to Real USDC** ❌
- **File**: `src/agent/x402-payment-manager.ts`
- **Issue**: x402 balance is mock (1000000), not connected to real USDC
- **Impact**: Agent can't pay for LLM calls with real funds
- **Fix**: Connect x402 balance to actual USDC balance from Hyperliquid

### 5. **No Real LLM Integration** ❌
- **File**: `src/agent/hyperliquid-trading-loop.ts`
- **Issue**: Falls back to mock decisions when Dreams Router unavailable
- **Impact**: Agent never actually calls LLM for decisions
- **Fix**: Implement real OpenRouter API calls with structured prompting

## Solution Path (Nocturne-Inspired)

### Step 1: Implement Real Hyperliquid API Client
```typescript
// Use Hyperliquid REST API or SDK
// Fetch: balance, positions, orders, funding rates
// Update: src/agent/hyperliquid-client.ts
```

### Step 2: Fetch Real Market Data
```typescript
// Option A: Use CCXT (already installed)
// Option B: Use Hyperliquid's market data API
// Option C: Use TAAPI (like Nocturne)
// Calculate: RSI, MACD, EMA, ATR for multiple timeframes
```

### Step 3: Dynamic Asset Detection
```typescript
// Get assets from portfolio.positions
// Only trade assets agent actually holds
// Skip hardcoded BTC/ETH if not in portfolio
```

### Step 4: Connect x402 to Real Balance
```typescript
// Fetch USDC balance from Hyperliquid
// Use as x402 payment balance
// Prevent overspending
```

### Step 5: Implement Real LLM Calls
```typescript
// Use OpenRouter API with structured prompting
// Pass real market data and account state
// Respect trading discipline (cooldowns, exit plans)
// Follow Nocturne's system prompt patterns
```

## Implementation Priority

1. **HIGH**: Fix `getUserState()` - get real balance
2. **HIGH**: Detect actual assets from portfolio
3. **HIGH**: Fetch real market data
4. **MEDIUM**: Connect x402 to real balance
5. **MEDIUM**: Implement real LLM calls

## Nocturne Reference

The Nocturne agent (https://github.com/Gajesh2007/ai-trading-agent) implements:
- Real Hyperliquid API integration with retry helpers
- TAAPI for technical indicators
- OpenRouter for LLM with tool calling
- Structured system prompt with trading discipline
- Exit plans, cooldowns, hysteresis

Key files to reference:
- `src/trading/hyperliquid_api.py` - Real API integration
- `src/agent/decision_maker.py` - LLM decision making
- `src/indicators/taapi_client.py` - Market data

## Next Steps

1. Install Hyperliquid SDK or use REST API
2. Implement real `getUserState()` 
3. Add market data fetching
4. Update trading loop to use real data
5. Test with small position sizes
