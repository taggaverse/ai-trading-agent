# Hyperliquid Agent Setup Guide

This guide explains how to configure your Hyperliquid trading agent with proper authentication.

## Overview

The agent uses **Agent Wallets** (also called API Wallets) to sign orders on Hyperliquid. This is a security best practice that allows you to:
- Keep your main account private key secure
- Limit the agent's permissions
- Easily revoke access if needed
- Use separate wallets for different trading strategies

## Key Concepts

### Main Account vs Agent Wallet

- **Main Account**: Your primary Hyperliquid account with funds
- **Agent Wallet**: A separate wallet authorized to sign orders on behalf of your main account
- **Nonce**: A unique counter per signer to prevent replay attacks

### Authentication Flow

```
1. Agent Wallet signs order with its private key
2. Hyperliquid verifies signature using Agent Wallet address
3. Hyperliquid checks if Agent Wallet is approved by Main Account
4. Order is executed on behalf of Main Account
```

## Setup Steps

### Step 1: Create an Agent Wallet

You can create a new Agent Wallet using the Hyperliquid Python SDK:

```python
from hyperliquid.exchange import Exchange
from eth_account import Account

# Generate a new agent wallet
agent_wallet = Account.create()
print(f"Agent Private Key: {agent_wallet.key.hex()}")
print(f"Agent Address: {agent_wallet.address}")
```

Or use an existing wallet's private key.

### Step 2: Register Agent Wallet with Main Account

Use the Hyperliquid Python SDK to approve your agent wallet:

```python
from hyperliquid.exchange import Exchange
from eth_account import Account

# Load your main account
main_account = Account.from_key("0x...")  # Your main account private key

# Create exchange client
exchange = Exchange(main_account, base_url="https://api.hyperliquid.xyz")

# Approve agent wallet
response = exchange.approve_agent(
    agent_address="0x...",  # Agent wallet address
    agent_name="trading-bot"  # Optional name
)

print(response)
```

### Step 3: Configure Environment Variables

Update your `.env` file with:

```bash
# Agent Wallet (the one that will sign orders)
HYPERLIQUID_PRIVATE_KEY=0x...  # Agent wallet private key

# Main Account (where funds are, optional if same as agent)
HYPERLIQUID_WALLET_ADDRESS=0x...  # Your main account address

# Optional: Vault or subaccount
HYPERLIQUID_VAULT_ADDRESS=0x...  # Leave blank if not using

# Network
HYPERLIQUID_TESTNET=false  # true for testnet, false for mainnet

# Trading parameters
HYPERLIQUID_MAX_LEVERAGE=2  # 1-20, recommend 2-5 for safety
```

## Configuration Examples

### Example 1: Simple Setup (Agent Wallet = Main Account)

If you want to use the same wallet for both signing and holding funds:

```bash
HYPERLIQUID_PRIVATE_KEY=0xabcd1234...
HYPERLIQUID_WALLET_ADDRESS=  # Leave blank
HYPERLIQUID_VAULT_ADDRESS=   # Leave blank
HYPERLIQUID_TESTNET=false
HYPERLIQUID_MAX_LEVERAGE=2
```

### Example 2: Separate Agent Wallet (Recommended)

For better security, use a separate agent wallet:

```bash
# Agent wallet (signs orders)
HYPERLIQUID_PRIVATE_KEY=0xagent1234...

# Main account (holds funds)
HYPERLIQUID_WALLET_ADDRESS=0xmain5678...

# Optional vault
HYPERLIQUID_VAULT_ADDRESS=  # Leave blank unless using vault

HYPERLIQUID_TESTNET=false
HYPERLIQUID_MAX_LEVERAGE=2
```

### Example 3: Vault/Subaccount Trading

If trading on behalf of a vault or subaccount:

```bash
# Agent wallet (signs orders)
HYPERLIQUID_PRIVATE_KEY=0xagent1234...

# Main account (owns the vault)
HYPERLIQUID_WALLET_ADDRESS=0xmain5678...

# Vault address (where trades happen)
HYPERLIQUID_VAULT_ADDRESS=0xvault9999...

HYPERLIQUID_TESTNET=false
HYPERLIQUID_MAX_LEVERAGE=2
```

## Testing

### Test on Testnet First

1. Set `HYPERLIQUID_TESTNET=true`
2. Get testnet funds from the faucet
3. Register your agent wallet on testnet
4. Test trading with small amounts
5. Monitor logs for errors

### Verify Configuration

The agent will log on startup:

```
[HL Auth] Initialized with wallet: 0xagent...
[HL Auth] Network: MAINNET
[HL Auth] Vault address: 0xvault...
```

### Check Nonce Management

The agent tracks nonces automatically:

```
[HL Auth] Signed order with nonce 1729000000000
[HL Auth] Signed order with nonce 1729000000001
```

Nonces must be:
- Unique (never reused)
- Increasing
- Within (T - 2 days, T + 1 day) where T is current time

## Troubleshooting

### "Insufficient balance" Error

**Cause**: Agent wallet has no funds, or main account not approved

**Solution**:
1. Verify main account has funds
2. Verify agent wallet is approved by main account
3. Check vault address if using vault

### "Invalid signature" Error

**Cause**: Signature verification failed

**Solution**:
1. Verify HYPERLIQUID_PRIVATE_KEY is correct
2. Verify agent wallet is registered with main account
3. Check network setting (testnet vs mainnet)

### "Nonce out of range" Error

**Cause**: Nonce too old or too new

**Solution**:
1. Restart agent to reset nonce counter
2. Verify system time is correct
3. Check if agent wallet was pruned (deregistered)

### "Order must have minimum value" Error

**Cause**: Order size too small

**Solution**:
1. Increase position size
2. Check minimum order value on Hyperliquid (typically $10)

## Security Best Practices

1. **Never share private keys** - Keep all private keys secret
2. **Use separate agent wallets** - Don't use main account key for agent
3. **Limit agent permissions** - Only approve what's needed
4. **Monitor nonce state** - Check logs for nonce issues
5. **Test on testnet first** - Always test before mainnet
6. **Use small position sizes** - Start small and scale up
7. **Monitor spending** - Track x402 payments and trading costs

## Asset IDs

Common assets on Hyperliquid:

| Asset | ID |
|-------|-----|
| BTC   | 0   |
| ETH   | 1   |
| SOL   | 2   |
| ARB   | 3   |
| OP    | 4   |
| DOGE  | 5   |
| AVAX  | 6   |
| LINK  | 7   |
| MATIC | 8   |
| ATOM  | 9   |

See [Hyperliquid Asset IDs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/asset-ids) for full list.

## API Documentation

- [Hyperliquid Exchange API](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint)
- [Nonces and API Wallets](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/nonces-and-api-wallets)
- [Python SDK](https://github.com/hyperliquid-dex/hyperliquid-python-sdk)

## Support

For issues or questions:
1. Check the logs: `npm start 2>&1 | grep "\[HL"`
2. Review this guide
3. Check Hyperliquid documentation
4. Test on testnet first
