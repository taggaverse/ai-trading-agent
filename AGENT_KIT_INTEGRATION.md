# Agent Kit Integration with x402 LLM Fallback

## Problem

Agent-kit projects fail with:
```
[agent-kit] failed to initialise Ax LLM client: [agent-kit] createAxLLMClient requires an OpenAI API key (set apiKey or OPENAI_API_KEY)
warn: [agent-kit] createAxLLMClient requires an OpenAI API key (set apiKey or OPENAI_API_KEY)
OpenAI API not configured — routing will use fallback logic.
```

This happens when `OPENAI_API_KEY` is not set.

## Solution

Use the **x402 LLM Provider** as a fallback that uses **Daydreams Router** with **x402 USDC micropayments**.

## Implementation

### Step 1: Import the Provider

```typescript
import { X402LLMProvider, createX402LLMProvider } from './agent/x402-llm-provider.js'
import logger from './utils/logger.js'
```

### Step 2: Create Fallback Logic

```typescript
import { createAxLLMClient } from '@lucid-dreams/agent-kit'

let llmClient

try {
  // Try agent-kit's OpenAI client
  llmClient = await createAxLLMClient({
    apiKey: process.env.OPENAI_API_KEY
  })
  logger.info('Using OpenAI API for LLM')
} catch (error) {
  if (error instanceof Error && error.message.includes('OpenAI API key')) {
    logger.warn('OpenAI API key not configured, using x402 fallback')
    
    // Create x402 provider as fallback
    const x402Provider = new X402LLMProvider()
    
    // Wrap it to match agent-kit interface
    llmClient = {
      generateText: async (prompt: string) => {
        try {
          const response = await x402Provider.complete(prompt)
          return { text: response }
        } catch (err) {
          logger.error('x402 LLM call failed:', err)
          throw err
        }
      },
      
      chat: async (messages: any[]) => {
        try {
          const response = await x402Provider.call(messages)
          return { message: { content: response.content } }
        } catch (err) {
          logger.error('x402 LLM call failed:', err)
          throw err
        }
      }
    }
  } else {
    throw error
  }
}
```

### Step 3: Use the LLM Client

```typescript
// Works with both OpenAI and x402 fallback
const response = await llmClient.generateText('Your prompt here')
const chatResponse = await llmClient.chat([
  { role: 'system', content: 'You are helpful' },
  { role: 'user', content: 'Hello!' }
])
```

## Configuration

### Environment Variables

```bash
# Optional: OpenAI API key (if not set, x402 fallback is used)
OPENAI_API_KEY=sk-...

# Required for x402 fallback:
DREAMS_ROUTER_URL=https://router.daydreams.systems
X402_NETWORK=base-sepolia  # or 'base' for mainnet
X402_PRIVATE_KEY=0x...     # Wallet private key
X402_WALLET_ADDRESS=0x...  # Wallet address

# Optional: USDC balance for testing
MOCK_USDC_BALANCE=100
```

### Get Testnet USDC

For **Base Sepolia**:
```bash
# 1. Get Base Sepolia ETH from faucet
curl https://www.alchemy.com/faucets/base-sepolia

# 2. Swap ETH → USDC on Base Sepolia
# Use Uniswap or similar DEX

# 3. Verify balance
curl https://sepolia.basescan.org/address/0x...
```

## Cost Structure

| Item | Cost | Frequency |
|------|------|-----------|
| LLM Call (x402) | $0.10 USDC | Per request |
| Daydreams Router | Included | - |
| x402 Payment | Included | - |
| **Total** | **$0.10** | **Per request** |

## Comparison

| Feature | OpenAI API | x402 Fallback |
|---------|-----------|---------------|
| API Key Required | ✅ Yes | ❌ No |
| Cost | $0.01-0.03 | $0.10 |
| Models | Limited | Multiple |
| Payment | Credit card | USDC |
| Setup | Easy | Requires wallet |
| Testnet | ❌ No | ✅ Yes |

## Usage Patterns

### Pattern 1: Transparent Fallback

```typescript
async function getLLMClient() {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  } else {
    logger.warn('Using x402 fallback LLM provider')
    return new X402LLMProvider()
  }
}

const llm = await getLLMClient()
const response = await llm.call(messages)
```

### Pattern 2: Hybrid Approach

```typescript
async function callLLM(messages: any[], preferredModel?: string) {
  // Try OpenAI first if available
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      return await openai.chat.completions.create({
        model: preferredModel || 'gpt-4-turbo',
        messages
      })
    } catch (error) {
      logger.warn('OpenAI call failed, trying x402 fallback')
    }
  }
  
  // Fallback to x402
  const provider = new X402LLMProvider(preferredModel)
  return await provider.call(messages)
}
```

### Pattern 3: Agent Kit Integration

```typescript
import { createAxLLMClient } from '@lucid-dreams/agent-kit'
import { X402LLMProvider } from './agent/x402-llm-provider.js'

async function initializeAgent() {
  let llmClient
  
  try {
    llmClient = await createAxLLMClient({
      apiKey: process.env.OPENAI_API_KEY
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('OpenAI API key')) {
      logger.warn('Using x402 fallback for agent-kit')
      const x402 = new X402LLMProvider()
      
      // Wrap x402 to match agent-kit interface
      llmClient = {
        generateText: (prompt: string) => x402.complete(prompt),
        chat: (messages: any[]) => x402.call(messages)
      }
    } else {
      throw error
    }
  }
  
  return llmClient
}
```

## Monitoring

### Check Balance

```typescript
const provider = new X402LLMProvider()
const balance = await provider.getPaymentClient().getUSDCBalance()
console.log(`Available USDC: $${balance}`)

if (balance < 1.0) {
  logger.warn('Low USDC balance, please refill')
}
```

### Track Costs

```typescript
const provider = new X402LLMProvider()
const costPerCall = provider.getCostPerCall()
const estimatedCost = costPerCall * requestsPerDay * daysPerMonth

console.log(`Estimated monthly cost: $${estimatedCost}`)
```

### Log Calls

```typescript
logger.info(`[LLM] Calling with x402 payment`)
logger.info(`[LLM] Cost: $${provider.getCostPerCall()}`)
logger.info(`[LLM] Balance: $${balance}`)
logger.info(`[LLM] Response: ${response.content.substring(0, 100)}...`)
```

## Troubleshooting

### "Insufficient USDC balance"

```bash
# Check balance
curl https://sepolia.basescan.org/api?module=account&action=tokenbalance&contractaddress=0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48&address=0x...

# Get more testnet USDC
# 1. Get ETH from faucet
# 2. Swap ETH → USDC
# 3. Verify balance
```

### "Empty response from LLM"

```typescript
// Try different model
const provider = new X402LLMProvider('openai/gpt-4-turbo')

// Or increase max tokens
const response = await provider.call(messages, {
  maxTokens: 4000
})
```

### "Failed to connect to Daydreams Router"

```bash
# Verify router URL
echo $DREAMS_ROUTER_URL

# Test connectivity
curl https://router.daydreams.systems/health

# Check network
ping router.daydreams.systems
```

## Production Deployment

### Checklist

- [ ] Set `X402_PRIVATE_KEY` in production environment
- [ ] Set `X402_WALLET_ADDRESS` in production environment
- [ ] Fund wallet with USDC on Base mainnet
- [ ] Set `X402_NETWORK=base` (not base-sepolia)
- [ ] Monitor USDC balance regularly
- [ ] Set up alerts for low balance
- [ ] Test fallback logic before deploying
- [ ] Log all LLM calls for auditing
- [ ] Track costs and usage metrics

### Cost Optimization

1. **Cache responses** - Avoid duplicate requests
2. **Use cheaper models** - `gemini-2.5-flash` vs `gpt-4-turbo`
3. **Batch requests** - Combine multiple prompts
4. **Implement rate limiting** - Prevent excessive calls
5. **Monitor usage** - Track cost per feature

## References

- [x402 LLM Provider](./src/agent/x402-llm-provider.ts)
- [x402 LLM Fallback Guide](./X402_LLM_FALLBACK.md)
- [Daydreams Router Docs](https://docs.daydreams.systems/docs/router)
- [x402 Payments](https://www.x402.org/)
- [Nanoservice Example](https://github.com/daydreamsai/daydreams/tree/main/examples/x402/nanoservice)

## Support

For issues or questions:
1. Check [X402_LLM_FALLBACK.md](./X402_LLM_FALLBACK.md) for detailed docs
2. Review [Daydreams Router docs](https://docs.daydreams.systems/docs/router)
3. Check logs for error messages
4. Verify configuration and balances
