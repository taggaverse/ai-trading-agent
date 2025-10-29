# Wallet Addresses & Balances

Your AI Trading Agent now automatically derives and displays wallet addresses from your private keys, and fetches real blockchain balances.

## 🔑 Getting Your Wallet Addresses

### Option 1: Dashboard (Easiest)

1. Start the dashboard:
   ```bash
   ./start-all.sh
   ```

2. Open http://localhost:5173

3. Scroll to "Wallet Addresses & Balances" section

4. Each chain shows:
   - **Address**: Your public wallet address (click 📋 to copy)
   - **Balance**: Real SOL/ETH/BNB from blockchain
   - **Status**: ✓ Ready or ⚠️ Low Gas

### Option 2: API Endpoints

Get wallet addresses:
```bash
curl http://localhost:3000/wallets | python3 -m json.tool
```

Response:
```json
{
  "addresses": {
    "base": "0x...",
    "solana": "...",
    "bsc": "0x...",
    "hyperliquid": "0x..."
  },
  "timestamp": "2025-10-29T02:17:02.537Z"
}
```

Get real blockchain balances:
```bash
curl http://localhost:3000/wallets/balances | python3 -m json.tool
```

Response:
```json
{
  "balances": {
    "base": {
      "chain": "base",
      "address": "0x...",
      "balance": 0.05,
      "gasToken": "ETH"
    },
    "solana": {
      "chain": "solana",
      "address": "...",
      "balance": 1.5,
      "gasToken": "SOL"
    },
    ...
  },
  "timestamp": "2025-10-29T02:17:02.537Z"
}
```

## 🔗 Blockchain Explorers

View your addresses on explorers:

### Base (Ethereum L2)
- Explorer: https://basescan.org
- Format: `https://basescan.org/address/0x...`

### Solana
- Explorer: https://explorer.solana.com
- Format: `https://explorer.solana.com/address/...`

### BSC (Binance Smart Chain)
- Explorer: https://bscscan.com
- Format: `https://bscscan.com/address/0x...`

### Hyperliquid
- Dashboard: https://app.hyperliquid.xyz
- Format: Same Ethereum address

## 💰 Checking Balances

### From Dashboard
- Real-time balance display
- Auto-updates every 5 seconds
- Shows gas token status

### From Command Line
```bash
# Get all balances
curl http://localhost:3000/wallets/balances

# Check Solana balance
curl https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getBalance","params":["YOUR_SOLANA_ADDRESS"]}'

# Check Base/BSC balance
curl https://mainnet.base.org -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getBalance","params":["0x...","latest"]}'
```

## 🔐 Private Keys → Public Addresses

The agent automatically derives public addresses from your private keys:

### Ethereum-based (Base, BSC, Hyperliquid)
- Private Key Format: `0x...` (hex string)
- Public Address: Derived using ethers.js
- Same address across all EVM chains

### Solana
- Private Key Format: Base64-encoded keypair
- Public Address: Derived from keypair
- Unique to Solana network

## ⚙️ How It Works

1. **Private Keys in .env**
   ```bash
   BASE_PRIVATE_KEY=0x...
   SOLANA_PRIVATE_KEY=base64_encoded_key
   BSC_PRIVATE_KEY=0x...
   HYPERLIQUID_PRIVATE_KEY=0x...
   ```

2. **Agent Derives Addresses**
   - On startup, derives public addresses from private keys
   - Stores addresses in memory
   - Exposes via `/wallets` endpoint

3. **Dashboard Displays Addresses**
   - Fetches from `/wallets` endpoint
   - Shows truncated address (first 10 + last 8 chars)
   - Provides copy button for full address

4. **Fetches Real Balances**
   - Queries blockchain RPC nodes
   - Base: https://mainnet.base.org
   - Solana: https://api.mainnet-beta.solana.com
   - BSC: https://bsc-dataseed1.binance.org:8545
   - Updates every 5 seconds

## 🚨 Security Notes

⚠️ **Important**: Private keys are sensitive!

1. **Never Share**
   - Private keys in .env file
   - Never commit .env to git
   - Never share addresses with untrusted sources

2. **Safe Storage**
   - Keep .env file secure
   - Use different keys for different environments
   - Consider using hardware wallets for production

3. **Monitoring**
   - Dashboard shows real balances
   - Monitor for unexpected transactions
   - Set up alerts for low balances

## 📊 Dashboard Display

The dashboard shows each wallet as a card:

```
┌─────────────────────────────────────────┐
│ BASE                          ✓ Ready   │
├─────────────────────────────────────────┤
│ Address: 0x1234...5678  [📋 Copy]      │
│ ETH (Gas Token): 0.050000 ETH           │
│ Min Gas Required: 0.01 ETH              │
└─────────────────────────────────────────┘
```

**Color Coding:**
- 🟢 **Green**: Sufficient gas (Ready)
- 🔴 **Red**: Low gas (⚠️ Low Gas)

## 🔄 Updating Balances

Balances update automatically:
- Dashboard: Every 5 seconds
- API: On-demand via `/wallets/balances`

To force refresh:
- Dashboard: Hard refresh (Cmd+Shift+R)
- API: Make new request

## 🆘 Troubleshooting

### Addresses Show Empty
- Check .env file has private keys
- Verify private key format is correct
- Check agent logs: `tail -f agent.log`

### Balances Show Zero
- Verify wallet has funds
- Check blockchain explorer
- Verify RPC endpoint is working
- Wait for blockchain to sync

### Can't Copy Address
- Check browser allows clipboard access
- Try copying manually from explorer
- Verify address format is correct

## 📝 Example Workflow

1. **Start Agent & Dashboard**
   ```bash
   ./start-all.sh
   ```

2. **View Wallet Addresses**
   - Open http://localhost:5173
   - Scroll to "Wallet Addresses & Balances"
   - Copy addresses to fund

3. **Fund Wallets**
   - Send gas tokens to each address
   - Use bridges or DEXs (see FUNDING_GUIDE.md)

4. **Monitor Balances**
   - Dashboard updates every 5 seconds
   - Watch for status change to ✓ Ready
   - Begin trading once funded

## 🔗 Related Documentation

- **FUNDING_GUIDE.md** - How to fund your wallets
- **QUICK_START.md** - Quick start guide
- **DASHBOARD_SETUP.md** - Dashboard setup
- **ARCHITECTURE.md** - System architecture

---

**Your wallet addresses are now visible in the dashboard! 🎉**

Copy them and fund your wallets to start trading.
