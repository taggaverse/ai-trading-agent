# x402 LLM Provider - Fallback for Missing OpenAI API Key

## Overview

The `X402LLMProvider` is a generic LLM provider that uses **Daydreams Router** with **x402 USDC micropayments**. It can be used as a fallback when the OpenAI API key is not configured.

## Features

- ✅ **x402 Payments** - Pay per request using USDC micropayments
- ✅ **Multiple Models** - Support for Google Vertex, OpenAI, Anthropic, etc.
- ✅ **Balance Checking** - Verify sufficient USDC before making requests
- ✅ **OpenAI Compatible** - Works with existing OpenAI SDK patterns
- ✅ **Error Handling** - Automatic fallback and retry logic

## Installation

The provider is already included in the project:
```typescript
import { X402LLMProvider, createX402LLMProvider } from './agent/x402-llm-provider.js'
```

## Usage

### Basic Usage

```typescript
import { X402LLMProvider } from './agent/x402-llm-provider.js'

// Create provider
const provider = new X402LLMProvider()

// Make a request
const response = await provider.call([
  { role: 'system', content: 'You are a helpful assistant' },
  { role: 'user', content: 'Hello!' }
])

console.log(response.content)
```

### Convenience Methods

```typescript
// Simple text completion
const result = await provider.complete('What is 2+2?')

// Chat with system prompt
const result = await provider.chat(
  'You are a math tutor',
  'What is 2+2?'
)
```

### Custom Model

```typescript
// Use different model
const provider = new X402LLMProvider('openai/gpt-4-turbo')

// Or change after creation
provider.setModel('anthropic/claude-3-opus')
```

### Custom Cost

```typescript
// Set cost per request (in USDC)
provider.setCostPerCall(0.05) // $0.05 per request
```

## As Fallback for Missing OpenAI API Key

### Pattern 1: Try OpenAI, Fall Back to x402

```typescript
import OpenAI from 'openai'
import { createX402LLMProvider } from './agent/x402-llm-provider.js'
import logger from './utils/logger.js'

let llmProvider: any

// Try to use OpenAI
if (process.env.OPENAI_API_KEY) {
  llmProvider = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
  logger.info('Using OpenAI API')
} else {
  // Fallback to x402
  llmProvider = createX402LLMProvider()
  logger.warn('OpenAI API key not configured, using x402 fallback')
}

// Use the provider
const response = await llmProvider.call([
  { role: 'user', content: 'Hello!' }
])
```

### Pattern 2: Wrapper Function

```typescript
import { X402LLMProvider } from './agent/x402-llm-provider.js'

async function callLLM(messages: any[], options?: any) {
  try {
    // Try OpenAI first
    const openai = new OpenAI()
    return await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages,
      ...options
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('API key')) {
      logger.warn('OpenAI API key missing, using x402 fallback')
      const provider = new X402LLMProvider()
      return await provider.call(messages, options)
    }
    throw error
  }
}
```

### Pattern 3: Agent Kit Integration

For agent-kit projects that fail with "OpenAI API not configured":

```typescript
import { createAxLLMClient } from '@lucid-dreams/agent-kit'
import { X402LLMProvider } from './agent/x402-llm-provider.js'

let llmClient

try {
  // Try agent-kit's OpenAI client
  llmClient = await createAxLLMClient({
    apiKey: process.env.OPENAI_API_KEY
  })
} catch (error) {
  if (error instanceof Error && error.message.includes('OpenAI API key')) {
    logger.warn('OpenAI API key not configured, using x402 fallback')
    // Create x402 provider as fallback
    const x402Provider = new X402LLMProvider()
    
    // Wrap it to match agent-kit interface
    llmClient = {
      generateText: async (prompt: string) => {
        const response = await x402Provider.complete(prompt)
        return { text: response }
      },
      chat: async (messages: any[]) => {
        const response = await x402Provider.call(messages)
        return { message: { content: response.content } }
      }
    }
  } else {
    throw error
  }
}
```

## Configuration

### Environment Variables

```bash
# Daydreams Router URL (optional, defaults to https://router.daydreams.systems)
DREAMS_ROUTER_URL=https://router.daydreams.systems

# x402 Payment Configuration
X402_NETWORK=base-sepolia  # or 'base' for mainnet
X402_PRIVATE_KEY=0x...     # Wallet private key for signing payments
X402_WALLET_ADDRESS=0x...  # Wallet address (derived from private key)

# USDC Balance (for x402 payments)
# Need at least $0.10 per request on Base Sepolia or Base mainnet
```

### Getting Testnet USDC

For **Base Sepolia** (testnet):
1. Go to https://www.alchemy.com/faucets/base-sepolia
2. Request Base Sepolia ETH
3. Swap ETH → USDC on Base Sepolia

For **Base Mainnet** (production):
1. Bridge USDC from Ethereum → Base
2. Or buy USDC on Base directly

## Supported Models

The provider supports any model available on Daydreams Router:

- **Google Vertex**: `google-vertex/gemini-2.5-flash`, `google-vertex/gemini-2.0-pro`
- **OpenAI**: `openai/gpt-4-turbo`, `openai/gpt-4o`, `openai/gpt-3.5-turbo`
- **Anthropic**: `anthropic/claude-3-opus`, `anthropic/claude-3-sonnet`
- **And more...**

See [Daydreams Router docs](https://docs.daydreams.systems/docs/router) for full list.

## Cost Tracking

```typescript
const provider = new X402LLMProvider()

// Check balance before calling
const balance = await provider.getPaymentClient().getUSDCBalance()
console.log(`Available balance: $${balance}`)

// Get cost per call
const cost = provider.getCostPerCall()
console.log(`Cost per request: $${cost}`)

// Make request
const response = await provider.call(messages)
console.log(`Total spent: $${cost}`)
```

## Error Handling

```typescript
import { X402LLMProvider } from './agent/x402-llm-provider.js'

const provider = new X402LLMProvider()

try {
  const response = await provider.call(messages)
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('Insufficient USDC balance')) {
      console.error('Need more USDC for x402 payments')
      // Get more testnet USDC or mainnet USDC
    } else if (error.message.includes('Empty response')) {
      console.error('LLM returned empty response')
      // Retry or use different model
    } else {
      console.error('LLM call failed:', error.message)
    }
  }
}
```

## Integration with Existing Code

### Replace OpenAI SDK

```typescript
// Before
import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const response = await openai.chat.completions.create({...})

// After (with fallback)
import { X402LLMProvider } from './agent/x402-llm-provider.js'

let llmProvider = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : new X402LLMProvider()

const response = process.env.OPENAI_API_KEY
  ? await llmProvider.chat.completions.create({...})
  : await llmProvider.call([...])
```

## Production Considerations

1. **Balance Management**
   - Monitor USDC balance regularly
   - Set up alerts when balance is low
   - Auto-refill mechanism recommended

2. **Cost Optimization**
   - Cache responses when possible
   - Use cheaper models for simple tasks
   - Batch requests to reduce overhead

3. **Rate Limiting**
   - Daydreams Router has rate limits
   - Implement exponential backoff
   - Queue requests if needed

4. **Monitoring**
   - Log all LLM calls
   - Track cost per request
   - Monitor success/failure rates

## Troubleshooting

### "Insufficient USDC balance"
- Check balance: `await provider.getPaymentClient().getUSDCBalance()`
- Get more testnet USDC from faucet
- Or bridge mainnet USDC to Base

### "Empty response from LLM"
- Try different model
- Increase max_tokens
- Check prompt for issues

### "Failed to connect to Daydreams Router"
- Verify DREAMS_ROUTER_URL is correct
- Check network connectivity
- Verify x402 payment header is valid

## Examples

See `/src/agent/dreams-llm-client.ts` for trading-specific usage.

## References

- [Daydreams Router Docs](https://docs.daydreams.systems/docs/router)
- [x402 Payments](https://www.x402.org/)
- [Nanoservice Example](https://github.com/daydreamsai/daydreams/tree/main/examples/x402/nanoservice)
