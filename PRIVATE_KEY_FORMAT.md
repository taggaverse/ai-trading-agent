# Private Key Format Guide

Your private keys need to be in the correct format for the agent to derive wallet addresses. Here's how to format each one.

## 🔑 Ethereum-based Chains (Base, BSC, Hyperliquid)

### Format: Hex String with 0x prefix

**Correct:**
```
BASE_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
BSC_PRIVATE_KEY=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
HYPERLIQUID_PRIVATE_KEY=0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba
```

**Incorrect:**
```
❌ BASE_PRIVATE_KEY=0x...
❌ BASE_PRIVATE_KEY=1234567890abcdef... (missing 0x)
❌ BASE_PRIVATE_KEY=0x123 (too short)
```

### How to Get Your Ethereum Private Key

**From MetaMask:**
1. Open MetaMask
2. Click account icon → Settings → Security & Privacy
3. Click "Reveal Secret Recovery Phrase" or "Export Private Key"
4. Copy the private key (starts with 0x)
5. Paste into .env file

**From Etherscan (if you have a contract):**
1. Go to your wallet address on Etherscan
2. Look for "Private Key" in wallet details
3. Copy and paste into .env

**From Hardware Wallet:**
1. Use wallet software to export private key
2. Should be 66 characters (0x + 64 hex chars)
3. Paste into .env

## 🔐 Solana

### Format: Base58 Encoded String (NOT Base64)

**Correct:**
```
SOLANA_PRIVATE_KEY=4Zw8...YourBase58EncodedKeyHere...xKpQ
```

**Incorrect:**
```
❌ SOLANA_PRIVATE_KEY=base58_encoded_key (placeholder)
❌ SOLANA_PRIVATE_KEY=base64_string (wrong encoding)
❌ SOLANA_PRIVATE_KEY=[1,2,3,4,...] (JSON array format)
```

### How to Get Your Solana Private Key

**From Phantom Wallet:**
1. Open Phantom
2. Click Settings → Security & Privacy
3. Click "Export Private Key"
4. Copy the Base58 string
5. Paste into .env

**From Solana CLI:**
```bash
# If you have a keypair file
cat ~/.config/solana/id.json | jq -r '.[]' | tr ',' '\n' | tr -d '[]' | paste -sd '' | base58 -d | base58

# Or use solana-keygen
solana-keygen show ~/.config/solana/id.json --outfile /tmp/key.txt
cat /tmp/key.txt
```

**From Solflare:**
1. Open Solflare wallet
2. Settings → Security
3. Export private key (Base58 format)
4. Paste into .env

## 📋 Private Key Length Reference

| Chain | Format | Length | Example |
|-------|--------|--------|---------|
| Base | Hex | 66 chars | 0x1234...abcd |
| BSC | Hex | 66 chars | 0xabcd...1234 |
| Hyperliquid | Hex | 66 chars | 0x9876...fedc |
| Solana | Base58 | ~88 chars | 4Zw8...YourKey...xKpQ |

## ✅ Validation Checklist

Before starting the agent, verify:

- [ ] **Base Private Key**
  - Starts with `0x`
  - 66 characters total (0x + 64 hex)
  - Only hex characters (0-9, a-f)

- [ ] **BSC Private Key**
  - Starts with `0x`
  - 66 characters total
  - Only hex characters

- [ ] **Hyperliquid Private Key**
  - Starts with `0x`
  - 66 characters total
  - Only hex characters

- [ ] **Solana Private Key**
  - Base58 encoded (NOT Base64)
  - ~88 characters
  - Only Base58 characters (123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz)

## 🔍 How to Verify Your Keys

### Test Ethereum Key
```bash
node -e "
const ethers = require('ethers');
const pk = '0x...your_key_here...';
try {
  const wallet = new ethers.Wallet(pk);
  console.log('✓ Valid Ethereum key');
  console.log('Address:', wallet.address);
} catch (e) {
  console.log('✗ Invalid Ethereum key:', e.message);
}
"
```

### Test Solana Key
```bash
node -e "
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const pk = 'your_base58_key_here';
try {
  const keypair = Keypair.fromSecretKey(Buffer.from(bs58.decode(pk)));
  console.log('✓ Valid Solana key');
  console.log('Address:', keypair.publicKey.toString());
} catch (e) {
  console.log('✗ Invalid Solana key:', e.message);
}
"
```

## 🚨 Common Mistakes

### 1. Using Placeholder Format
```
❌ BASE_PRIVATE_KEY=0x...
✓ BASE_PRIVATE_KEY=0x1234567890abcdef...
```

### 2. Wrong Solana Format
```
❌ SOLANA_PRIVATE_KEY=base64_string
❌ SOLANA_PRIVATE_KEY=[1,2,3,...]
✓ SOLANA_PRIVATE_KEY=4Zw8...
```

### 3. Missing 0x Prefix
```
❌ BASE_PRIVATE_KEY=1234567890abcdef...
✓ BASE_PRIVATE_KEY=0x1234567890abcdef...
```

### 4. Wrong Length
```
❌ BASE_PRIVATE_KEY=0x123 (too short)
✓ BASE_PRIVATE_KEY=0x1234...abcd (66 chars)
```

## 🔄 Updating Private Keys

1. **Edit .env file**
   ```bash
   nano .env
   ```

2. **Replace placeholder with real key**
   ```
   BASE_PRIVATE_KEY=0x...your_real_key...
   ```

3. **Save and exit** (Ctrl+X, Y, Enter)

4. **Restart agent**
   ```bash
   pkill -9 node
   ./start-all.sh
   ```

5. **Verify addresses appear**
   ```bash
   curl http://localhost:3000/wallets | python3 -m json.tool
   ```

## 🆘 Troubleshooting

### "invalid BytesLike value"
- Your Ethereum private key is not valid hex
- Check it starts with 0x
- Check it's 66 characters
- Verify it only contains 0-9 and a-f

### "bad secret key size"
- Your Solana private key is wrong format
- Should be Base58, not Base64
- Should be ~88 characters
- Verify it's not a JSON array

### Addresses Still Show Empty
- Check .env file is saved
- Verify private keys are correct format
- Restart agent: `pkill -9 node && npm start`
- Check logs: `tail -f agent.log`

## 🔐 Security Reminders

⚠️ **Important:**
- Never commit .env to git
- Never share private keys
- Use different keys for different environments
- Keep backups in secure location
- Consider hardware wallets for production

---

**Once your private keys are formatted correctly, restart the agent and your addresses will appear! 🚀**
