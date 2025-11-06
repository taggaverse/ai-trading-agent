# Dreams Router Correct Implementation - Complete Analysis

**Date:** November 6, 2025 - 04:56 UTC  
**Status:** Corrected understanding of Dreams Router API

---

## 🎯 THE KEY INSIGHT

**The `/assistant` endpoint in the nanoservice example is NOT the Dreams Router itself.**

It's a **custom service built ON TOP of the Dreams Router** that:
1. Takes user queries
2. Calls the Dreams Router API
3. Returns responses

**The actual Dreams Router is at:**
```
https://router.daydreams.systems/v1/chat/completions
```

This is the **real endpoint we should be calling directly!**

---

## 📊 ARCHITECTURE CLARIFICATION

### **What We Thought:**
```
Agent → /assistant endpoint (nanoservice example)
```

### **What's Actually Happening:**
```
Agent → Dreams Router API (https://router.daydreams.systems/v1/chat/completions)
         ↓
         x402 Payment Header (X-Payment)
         ↓
         OpenAI-compatible endpoint
         ↓
         Routes to: OpenAI, Anthropic, Google, etc.
```

### **The Nanoservice Example:**
```
Client → /assistant endpoint (custom service)
         ↓
         Nanoservice (built with Daydreams)
         ↓
         Dreams Router API
         ↓
         AI Model
```

**The nanoservice is an EXAMPLE of a service built with Daydreams, not the router itself!**

---

## 🔑 CORRECT x402 IMPLEMENTATION

From the official documentation:

```typescript
import { generateX402Payment } from "@daydreamsai/ai-sdk-provider";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...your-private-key");

// Generate x402-compliant payment header
const paymentHeader = await generateX402Payment(account, {
  amount: "100000", // $0.10 USDC (6 decimals)
  network: "base-sepolia", // or "base" for mainnet
});

// Make request with X-Payment header
const response = await fetch(
  "https://router.daydreams.systems/v1/chat/completions",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Payment": paymentHeader, // ← x402 payment header
    },
    body: JSON.stringify({
      model: "google-vertex/gemini-2.5-flash",
      messages: [{ role: "user", content: "Hello!" }],
    }),
  }
);
```

**Key Points:**
1. ✅ Endpoint: `https://router.daydreams.systems/v1/chat/completions`
2. ✅ Header: `X-Payment` (not Authorization)
3. ✅ Function: `generateX402Payment` from `@daydreamsai/ai-sdk-provider`
4. ✅ Format: OpenAI-compatible (model + messages)
5. ✅ Payment: USDC micropayment via x402

---

## 📚 DREAMS SDK INTEGRATION

The official way to use Dreams Router with x402 payments:

```typescript
import { generateText } from 'ai';
import { createEVMAuthFromPrivateKey } from '@daydreamsai/ai-sdk-provider';

// Create Dreams Router with x402 payments
const { dreamsRouter } = await createEVMAuthFromPrivateKey(
  process.env.EVM_PRIVATE_KEY as `0x${string}`,
  {
    payments: {
      network: 'base-sepolia',
    },
  }
);

// Use with Vercel AI SDK
const { text } = await generateText({
  model: dreamsRouter('google-vertex/gemini-2.5-flash'),
  prompt: 'Hello from Dreams Router!',
});
```

**This is the recommended approach!**

---

## 🔧 WHAT WE NEED TO DO

### **Option 1: Use @daydreamsai/ai-sdk-provider (Recommended)**

```typescript
import { createEVMAuthFromPrivateKey } from '@daydreamsai/ai-sdk-provider'
import { privateKeyToAccount } from 'viem/accounts'

export async function createDreamsRouterAuth(account: any, config: any) {
  // Use official Daydreams SDK
  const { dreamsRouter } = await createEVMAuthFromPrivateKey(
    config.X402_PRIVATE_KEY as `0x${string}`,
    {
      payments: {
        network: config.X402_NETWORK || 'base-sepolia',
      },
    }
  )

  return {
    dreamsRouter,
    account: {
      ...account,
      getBalance: async () => 1000000,
      refill: async (amount: bigint) => true
    }
  }
}
```

### **Option 2: Manual x402 Payment Header**

```typescript
import { generateX402Payment } from "@daydreamsai/ai-sdk-provider";

export async function createDreamsRouterAuth(account: any, config: any) {
  const dreamsRouter = async (model: string, messages: any[]) => {
    try {
      // Generate x402 payment header
      const paymentHeader = await generateX402Payment(account, {
        amount: "100000", // $0.10 USDC
        network: config.X402_NETWORK || 'base-sepolia',
      })

      // Call Dreams Router with payment header
      const response = await fetch(
        'https://router.daydreams.systems/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Payment': paymentHeader, // ← x402 payment
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('[Dreams Router] Failed:', error)
      throw error
    }
  }

  return {
    dreamsRouter,
    account: {
      ...account,
      getBalance: async () => 1000000,
      refill: async (amount: bigint) => true
    }
  }
}
```

---

## 📋 KEY DIFFERENCES FROM WHAT WE IMPLEMENTED

| Aspect | What We Did | What's Correct |
|--------|------------|-----------------|
| Endpoint | `/assistant` (nanoservice) | `/v1/chat/completions` (Dreams Router) |
| HTTP Client | x402-fetch | fetch + X-Payment header |
| Payment | wrapFetchWithPayment | generateX402Payment |
| Library | x402-fetch (wrong) | @daydreamsai/ai-sdk-provider |
| Format | Daydreams format | OpenAI format |
| Header | None | X-Payment |

---

## 🚀 CORRECT IMPLEMENTATION STEPS

### **Step 1: Install Correct Package**

```bash
npm install @daydreamsai/ai-sdk-provider
npm uninstall x402-fetch  # Remove incorrect package
```

### **Step 2: Update src/types/daydreams.ts**

Use `generateX402Payment` from `@daydreamsai/ai-sdk-provider`:

```typescript
import { generateX402Payment } from '@daydreamsai/ai-sdk-provider'
import logger from '../utils/logger.js'

export async function createDreamsRouterAuth(account: any, config: any) {
  const dreamsRouter = async (model: string, messages: any[]) => {
    try {
      logger.info(`[Dreams Router] Calling ${model} with x402 payment`)
      
      // Generate x402 payment header
      const paymentHeader = await generateX402Payment(account, {
        amount: "100000", // $0.10 USDC (6 decimals)
        network: config.X402_NETWORK || 'base-sepolia',
      })

      logger.info(`[Dreams Router] Generated payment header`)

      // Call Dreams Router API with payment
      const response = await fetch(
        'https://router.daydreams.systems/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Payment': paymentHeader,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`HTTP ${response.status}: ${error}`)
      }

      const result = await response.json()
      logger.info(`[Dreams Router] Response received`)

      return result
    } catch (error) {
      logger.error(`[Dreams Router] Failed:`, error)
      throw error
    }
  }

  return {
    dreamsRouter,
    account: {
      ...account,
      getBalance: async () => 1000000,
      refill: async (amount: bigint) => true
    }
  }
}
```

### **Step 3: Verify Configuration**

Ensure `.env` has:
```
X402_PRIVATE_KEY=0x...
X402_NETWORK=base-sepolia
```

### **Step 4: Test**

```bash
npm run build
npm start
```

---

## 🎯 SUMMARY

**What We Got Wrong:**
- ❌ Called `/assistant` endpoint (nanoservice example)
- ❌ Used x402-fetch library (wrong library)
- ❌ Didn't use X-Payment header

**What's Correct:**
- ✅ Call `https://router.daydreams.systems/v1/chat/completions`
- ✅ Use `@daydreamsai/ai-sdk-provider`
- ✅ Use `generateX402Payment` to create X-Payment header
- ✅ Send X-Payment header with request
- ✅ Use OpenAI-compatible format

**The Nanoservice Example:**
- It's a custom service BUILT WITH Daydreams
- It calls the Dreams Router internally
- It's not the router itself
- It's an example of what you can build

**The Real Dreams Router:**
- Endpoint: `https://router.daydreams.systems/v1/chat/completions`
- Auth: x402 payments via X-Payment header
- Format: OpenAI-compatible
- Payment: USDC micropayments

---

## 📚 REFERENCES

- Router Docs: https://docs.daydreams.systems/docs/router
- Quickstart: https://docs.daydreams.systems/docs/router/quickstart
- Dreams SDK: https://docs.daydreams.systems/docs/router/dreams-sdk
- Package: `@daydreamsai/ai-sdk-provider`
