# Funding Guide - Gas Tokens & Trading Capital

Your trading agent needs gas tokens on each chain to execute trades. Here's how to fund your wallets.

## 📊 Current Balance Status

The dashboard now shows:
- **Gas Token Status**: ✓ Ready or ⚠️ Low Gas
- **Minimum Requirements**: Per-chain gas token minimums
- **Trading Balance**: USDC available for trading
- **Gas Token Amount**: Current balance of gas token

## ⛽ Gas Token Requirements

| Chain | Gas Token | Min Required | Purpose |
|-------|-----------|--------------|---------|
| **Base** | ETH | 0.01 ETH | Pay for transactions |
| **Solana** | SOL | 0.1 SOL | Pay for transactions |
| **BSC** | BNB | 0.01 BNB | Pay for transactions |
| **Hyperliquid** | USDC | 0 | Uses USDC only |

## 🔑 Your Wallet Addresses

To find your wallet addresses, check your `.env` file:

```bash
# Base (Ethereum L2)
BASE_PRIVATE_KEY=0x...
# Address: Derived from private key

# Solana
SOLANA_PRIVATE_KEY=base58_encoded_key
# Address: Derived from private key

# BSC (Binance Smart Chain)
BSC_PRIVATE_KEY=0x...
# Address: Derived from private key

# Hyperliquid
HYPERLIQUID_PRIVATE_KEY=0x...
# Address: Derived from private key
```

## 💰 Funding Options

### Option 1: Bridge from Existing Wallets (Recommended)

If you already have crypto on one chain:

#### Bridge to Base
1. Go to https://bridge.base.org
2. Connect wallet with ETH on Ethereum
3. Bridge ETH to Base
4. Send to your Base address

#### Bridge to Solana
1. Go to https://www.wormhole.com/
2. Bridge USDC/SOL from another chain
3. Send to your Solana address

#### Bridge to BSC
1. Go to https://www.binance.org/bridge
2. Bridge BNB/USDC from Ethereum
3. Send to your BSC address

### Option 2: Buy Directly on Each Chain

#### Base (ETH)
1. Go to https://app.uniswap.org
2. Buy ETH with USDC
3. Keep 0.01 ETH for gas

#### Solana (SOL)
1. Go to https://jup.ag
2. Buy SOL with USDC
3. Keep 0.1 SOL for gas

#### BSC (BNB)
1. Go to https://pancakeswap.finance
2. Buy BNB with USDC
3. Keep 0.01 BNB for gas

#### Hyperliquid (USDC)
1. Deposit USDC directly to Hyperliquid
2. No gas token needed

### Option 3: Use Faucets (Testnet Only)

For testnet testing:

**Base Sepolia Testnet**
```bash
# Get testnet ETH from:
# https://www.alchemy.com/faucets/base-sepolia
```

**Solana Devnet**
```bash
# Get devnet SOL from:
# https://faucet.solana.com
```

## 📋 Funding Checklist

### Before Trading

- [ ] **Base**: 0.01+ ETH + USDC for trading
- [ ] **Solana**: 0.1+ SOL + USDC for trading
- [ ] **BSC**: 0.01+ BNB + USDC for trading
- [ ] **Hyperliquid**: USDC for trading
- [ ] Dashboard shows "✓ Ready" for all chains
- [ ] No "⚠️ Low Gas" warnings

### Verify Funding

1. Start the dashboard:
   ```bash
   ./start-all.sh
   ```

2. Open http://localhost:5173

3. Check "Wallet Balances & Gas Tokens" section

4. Verify:
   - All chains show "✓ Ready"
   - Gas token amounts meet minimums
   - USDC balances are sufficient

## 💸 Recommended Starting Balances

### Conservative (Testing)
- **Base**: 0.05 ETH + $100 USDC
- **Solana**: 0.5 SOL + $100 USDC
- **BSC**: 0.05 BNB + $100 USDC
- **Hyperliquid**: $100 USDC

**Total**: ~$500

### Moderate (Small Trading)
- **Base**: 0.1 ETH + $500 USDC
- **Solana**: 1 SOL + $500 USDC
- **BSC**: 0.1 BNB + $500 USDC
- **Hyperliquid**: $500 USDC

**Total**: ~$2,500

### Aggressive (Active Trading)
- **Base**: 0.5 ETH + $2,000 USDC
- **Solana**: 5 SOL + $2,000 USDC
- **BSC**: 0.5 BNB + $2,000 USDC
- **Hyperliquid**: $2,000 USDC

**Total**: ~$10,000

## 🔄 Gas Token Costs

Typical transaction costs:

| Chain | Avg Gas Cost | Frequency | Daily Cost |
|-------|--------------|-----------|-----------|
| Base | $0.01-0.05 | Per trade | $0.10-0.50 |
| Solana | $0.00025 | Per trade | $0.0025-0.01 |
| BSC | $0.10-0.50 | Per trade | $1-5 |
| Hyperliquid | $0 | N/A | $0 |

## 🛡️ Security Best Practices

⚠️ **Important**: Never share your private keys!

1. **Private Keys**
   - Only store in `.env` file
   - Never commit to git
   - Never share with anyone
   - Use different keys for different environments

2. **Wallet Management**
   - Use dedicated wallets for trading
   - Don't mix with personal wallets
   - Monitor balances regularly
   - Set up alerts for low balances

3. **Fund Management**
   - Start small and scale up
   - Don't fund more than you can afford to lose
   - Keep emergency gas reserves
   - Monitor spending regularly

## 📊 Monitoring Balances

### Dashboard Indicators

**Gas Status**
- ✓ **Ready**: Sufficient gas for trading
- ⚠️ **Low Gas**: Below minimum, refill needed

**Color Coding**
- 🟢 **Green**: Sufficient balance
- 🔴 **Red**: Low balance, needs refill

### API Endpoints

Check balances programmatically:

```bash
# Get portfolio data
curl http://localhost:3000/portfolio

# Response includes:
{
  "balances": {
    "base": {
      "eth": 0.05,
      "usdc": 500,
      "gasToken": "ETH"
    },
    "solana": {
      "sol": 0.5,
      "usdc": 500,
      "gasToken": "SOL"
    },
    ...
  }
}
```

## 🚨 Low Balance Alerts

The agent will:
1. ✓ Check gas balances before each trade
2. ⚠️ Skip trades on chains with low gas
3. 🔴 Alert if any chain is below minimum
4. 📊 Show status in dashboard

## 💡 Tips for Efficient Funding

### Minimize Costs
- Use Solana for frequent small trades (lowest gas)
- Use Base for medium trades (low gas)
- Use BSC for high-volume trades (higher gas)
- Use Hyperliquid for perpetuals (no gas)

### Optimize Gas
- Batch trades when possible
- Trade during low-congestion times
- Use limit orders to reduce failed transactions
- Monitor gas prices before trading

### Scale Gradually
1. Start with $100-500 total
2. Monitor performance for 1 week
3. Scale to $1,000-2,500 if profitable
4. Scale to $5,000+ if consistently profitable

## 🔗 Useful Links

### Bridges
- [Base Bridge](https://bridge.base.org)
- [Wormhole](https://www.wormhole.com/)
- [Binance Bridge](https://www.binance.org/bridge)

### DEXs
- [Uniswap (Base)](https://app.uniswap.org)
- [Jupiter (Solana)](https://jup.ag)
- [PancakeSwap (BSC)](https://pancakeswap.finance)

### Faucets (Testnet)
- [Base Sepolia](https://www.alchemy.com/faucets/base-sepolia)
- [Solana Devnet](https://faucet.solana.com)

### Explorers
- [Base Explorer](https://basescan.org)
- [Solana Explorer](https://explorer.solana.com)
- [BSC Explorer](https://bscscan.com)

## ❓ FAQ

**Q: How much gas do I need?**
A: Minimum: 0.01 ETH (Base), 0.1 SOL (Solana), 0.01 BNB (BSC)
Recommended: 2-3x minimum for buffer

**Q: Can I trade without gas tokens?**
A: No, you need gas tokens to pay for transactions on each chain

**Q: What if I run out of gas?**
A: Agent will skip trades on that chain until you refill

**Q: How do I refill gas?**
A: Send more gas token to your wallet address on that chain

**Q: Can I use the same wallet on all chains?**
A: No, each chain has different addresses. Use the private keys from `.env`

**Q: Is it safe to fund now?**
A: Yes, but start small ($100-500) and verify everything works first

## 📞 Support

If you have issues:

1. Check dashboard for gas status
2. Verify balances in explorer
3. Check agent logs for errors
4. Review this guide for troubleshooting

---

**Ready to fund your wallets? Start with the recommended amounts above! 🚀**
