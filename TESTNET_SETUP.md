# Testnet Setup Guide

## Current Status

Agent is ready to test on **Hyperliquid Testnet**, but needs:
1. ✅ Hyperliquid testnet enabled
2. ⚠️ USDC on Base Sepolia for x402 payments
3. ⚠️ Testnet funds on Hyperliquid

## Step 1: Enable Testnet Mode

Edit `.env`:
```bash
HYPERLIQUID_TESTNET=true
```

This will:
- Use Hyperliquid testnet API
- Use testnet order signing
- No real money at risk

## Step 2: Get Base Sepolia USDC

You need USDC on **Base Sepolia** for x402 payments ($0.10 per LLM call).

### Option A: Use Faucet (Recommended)
1. Go to https://www.alchemy.com/faucets/base-sepolia
2. Connect wallet: `0x5aE512bE3a017d5a86a5b5564e082b9291564788`
3. Request Base Sepolia ETH
4. Swap ETH → USDC on Base Sepolia

### Option B: Bridge from Mainnet
1. Go to https://bridge.base.org/
2. Bridge USDC from Ethereum → Base Sepolia
3. Confirm transaction

### Option C: Mock Balance (For Testing)
Set in `.env`:
```bash
MOCK_USDC_BALANCE=100  # $100 for testing
```

## Step 3: Get Hyperliquid Testnet Funds

1. Go to https://testnet.hyperliquid.exchange/
2. Sign in with your wallet
3. Request testnet funds (usually $10,000 USDC)
4. Confirm in wallet

## Step 4: Verify Configuration

Check `.env`:
```bash
# Hyperliquid
HYPERLIQUID_TESTNET=true
HYPERLIQUID_PRIVATE_KEY=0x...
HYPERLIQUID_WALLET_ADDRESS=0x...

# x402 (Base Sepolia)
X402_NETWORK=base-sepolia
X402_PRIVATE_KEY=0x...
X402_WALLET_ADDRESS=0x...

# Optional: Mock balance for testing
MOCK_USDC_BALANCE=100
```

## Step 5: Start Agent

```bash
npm start
```

Monitor logs:
```bash
# In another terminal
tail -f logs/agent.log
```

## Step 6: Monitor Trading

Check endpoints:
- Health: http://localhost:3000/health
- Portfolio: http://localhost:3000/portfolio
- Diary: http://localhost:3000/diary

## Step 7: Check Logs

```bash
# See trading logs
ls -la trading-logs/

# See CSV export
cat trading-data.csv

# See summary
tail -50 logs/agent.log
```

## Expected Behavior

### First Iteration (60 seconds)
1. Fetch portfolio state
2. Fetch technical indicators
3. Call LLM for trading decision
4. Log decision with market data
5. Execute trade (or HOLD)

### Logs Created
```
trading-logs/
├── trading-session-2025-10-30-06-50-00.json
└── ...

trading-data.csv
```

## Troubleshooting

### "Insufficient USDC balance"
- Check Base Sepolia balance: https://sepolia.basescan.org/
- Need at least $0.10 per LLM call
- Get testnet ETH and swap to USDC

### "Failed to connect to Hyperliquid"
- Check HYPERLIQUID_TESTNET=true
- Verify private key is correct
- Check network connectivity

### "No decisions made"
- Check indicators are fetching
- Check LLM is responding
- Check logs for errors

## Next Steps

1. ✅ Enable testnet mode
2. ✅ Get testnet funds
3. ✅ Start agent
4. ✅ Monitor for 1-2 hours
5. ✅ Review logs
6. ✅ Deploy to mainnet

## Timeline

- **Now**: Setup testnet (5 minutes)
- **Next 1-2 hours**: Run agent and collect data
- **Tomorrow**: Review logs and deploy to mainnet
