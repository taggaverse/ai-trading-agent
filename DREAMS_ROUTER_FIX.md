# Dreams Router API Fix - Analysis & Solution

**Date:** November 6, 2025 - 04:45 UTC  
**Status:** Analyzed Daydreams x402 nanoservice example

---

## 🔍 KEY FINDINGS FROM DAYDREAMS EXAMPLE

### **The Critical Difference**

The Daydreams example uses **`x402-fetch`** library, NOT direct HTTP calls:

```typescript
// ❌ WRONG (What we're doing)
const response = await axios.post(
  'https://router.daydreams.systems/v1/chat/completions',
  { model, messages },
  { headers: { 'Content-Type': 'application/json' } }
)

// ✅ CORRECT (What Daydreams does)
import { wrapFetchWithPayment } from 'x402-fetch'

const fetchWithPayment = wrapFetchWithPayment(fetch, account)
const response = await fetchWithPayment('/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, sessionId })
})
```

---

## 📊 DAYDREAMS ARCHITECTURE vs OUR AGENT

### **Daydreams Nano Service Flow:**

```
Client
  ↓
x402-fetch (wraps fetch with payment)
  ↓
x402 Payment Middleware (on server)
  ↓
Daydreams Agent
  ↓
Response with x-payment-response header
```

### **Our Agent Current Flow:**

```
Agent
  ↓
axios.post() ← Direct HTTP, NO payment handling
  ↓
Dreams Router API
  ↓
❌ 404 Not Found (API doesn't exist or requires auth)
  ↓
Fallback to mock provider
```

---

## 🎯 THE PROBLEM

We're trying to call a **non-existent endpoint**:
- `https://router.daydreams.systems/v1/chat/completions` ← **Doesn't exist**

The Daydreams example calls:
- `http://localhost:4021/assistant` ← **Local service**
- OR deployed service with x402 payment middleware

**We need to either:**
1. Deploy our own Daydreams nano service, OR
2. Use an existing Daydreams service endpoint, OR
3. Use a different LLM provider

---

## 📋 DAYDREAMS EXAMPLE STRUCTURE

```
/examples/x402/nanoservice/
├── index.ts          ← Server implementation
├── client.ts         ← Client example (uses x402-fetch)
├── package.json      ← Dependencies
└── README.md         ← Documentation

Key files:
- Uses: x402-fetch, daydreams, viem
- Server: Runs on port 4021
- Endpoint: POST /assistant
- Payment: x402 middleware
```

---

## 🔧 WHAT WE NEED TO DO

### **Option 1: Use x402-fetch (Recommended)**

Replace our direct HTTP calls with x402-fetch:

```typescript
import { wrapFetchWithPayment } from 'x402-fetch'
import { privateKeyToAccount } from 'viem/accounts'

// Create payment-enabled fetch
const account = privateKeyToAccount(config.X402_PRIVATE_KEY)
const fetchWithPayment = wrapFetchWithPayment(fetch, account)

// Call LLM with payment
const response = await fetchWithPayment('https://your-daydreams-service/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: userPrompt, sessionId: 'trading-agent' })
})
```

### **Option 2: Deploy Local Daydreams Service**

```bash
# Clone Daydreams repo
git clone https://github.com/daydreamsai/daydreams.git

# Go to nanoservice example
cd daydreams/examples/x402/nanoservice

# Install and run
npm install
npm run dev

# Now call: http://localhost:4021/assistant
```

### **Option 3: Use Alternative LLM**

Use OpenAI, Anthropic, or other provider instead of Daydreams.

---

## 🔑 KEY INSIGHTS FROM EXAMPLE

### **1. x402-fetch is the Key**

```typescript
// This library handles:
// ✅ x402 payment header generation
// ✅ EIP-712 signing
// ✅ USDC balance checking
// ✅ Payment response decoding
// ✅ Automatic retry on payment failure

import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch'
```

### **2. Service Endpoint Structure**

```
Basic Server:
  POST /assistant
  - Input: { query, sessionId }
  - Output: { response, sessionId, requestCount }

Advanced Server:
  POST /service/assistant
  - Input: { query, userId }
  - Output: { response, usage }
```

### **3. Payment Response Header**

```typescript
// Server returns payment info in header
const paymentHeader = response.headers.get('x-payment-response')
const paymentResponse = decodeXPaymentResponse(paymentHeader)

// Contains:
// - success: boolean
// - transaction: string
// - network: string
// - payer: string
```

### **4. Session Management**

```typescript
// Daydreams maintains context per session
const result = await fetchWithPayment('/assistant', {
  body: JSON.stringify({
    query: 'What is the capital of France?',
    sessionId: 'user-123'  // ← Maintains conversation context
  })
})

// Follow-up question remembers previous context
const followUp = await fetchWithPayment('/assistant', {
  body: JSON.stringify({
    query: "What's the population?",
    sessionId: 'user-123'  // ← Same session = same context
  })
})
```

---

## 🚀 RECOMMENDED FIX

### **Step 1: Install x402-fetch**

```bash
npm install x402-fetch viem
```

### **Step 2: Update daydreams.ts**

```typescript
import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch'
import { privateKeyToAccount } from 'viem/accounts'
import config from '../config/index.js'

export async function createDreamsRouterAuth(account: any, config: any) {
  // Create payment-enabled fetch
  const fetchWithPayment = wrapFetchWithPayment(fetch, account)

  // Create dreamsRouter function
  const dreamsRouter = async (model: string, messages: any[]) => {
    try {
      logger.info(`[Dreams Router] Calling with x402 payment...`)
      
      // Convert messages to query format
      const userMessage = messages.find(m => m.role === 'user')?.content || ''
      const systemMessage = messages.find(m => m.role === 'system')?.content || ''
      
      const query = `${systemMessage}\n\n${userMessage}`
      
      // Call with x402 payment
      const response = await fetchWithPayment(
        'https://your-daydreams-service/assistant',  // ← Update this URL
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query,
            sessionId: 'trading-agent'
          })
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      
      // Decode payment response
      const paymentHeader = response.headers.get('x-payment-response')
      if (paymentHeader) {
        const paymentResponse = decodeXPaymentResponse(paymentHeader)
        logger.info(`[Dreams Router] Payment: ${paymentResponse.transaction}`)
      }

      // Return in expected format
      return {
        message: {
          content: result.response
        }
      }
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

### **Step 3: Update .env**

```env
# Add Daydreams service URL
DAYDREAMS_SERVICE_URL=https://your-daydreams-service
# OR for local development:
# DAYDREAMS_SERVICE_URL=http://localhost:4021
```

---

## 📊 COMPARISON TABLE

| Aspect | Our Current | Daydreams Example |
|--------|-------------|-------------------|
| HTTP Client | axios | x402-fetch |
| Payment Handling | Manual | Automatic |
| Endpoint | `/v1/chat/completions` | `/assistant` |
| Auth | None | x402 payment |
| Session | None | sessionId |
| Response Format | OpenAI | Daydreams |
| Error Handling | Basic | Advanced |

---

## 🎯 NEXT STEPS

### **Immediate (Today):**
1. Install x402-fetch
2. Update daydreams.ts to use x402-fetch
3. Test with local Daydreams service (if available)

### **Short-term (This week):**
1. Deploy Daydreams nano service OR
2. Find existing Daydreams service endpoint OR
3. Switch to alternative LLM provider

### **Long-term:**
1. Monitor Daydreams service performance
2. Optimize payment handling
3. Add session management for context

---

## 💡 KEY TAKEAWAY

**The Dreams Router API doesn't work with direct HTTP calls.**

It requires:
1. **x402-fetch** library for payment handling
2. **Proper endpoint** (not `/v1/chat/completions`)
3. **x402 payment middleware** on the server
4. **Correct request format** (not OpenAI format)

The Daydreams example shows the correct way to do it!

---

## 📚 RESOURCES

- Daydreams GitHub: https://github.com/daydreamsai/daydreams
- x402-fetch: https://github.com/daydreamsai/x402-fetch
- Example: https://github.com/daydreamsai/daydreams/tree/main/examples/x402/nanoservice
