# x402 Quick Reference Card

## Endpoints at a Glance

### 1. Indigo AI Agent
```
POST /v1/agents/indigo
```
**Purpose**: Chat with AI to discover emerging narratives and opportunities

**Request**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Which narratives are gaining traction?"
    }
  ]
}
```

**Response**:
```json
{
  "status": 200,
  "data": {
    "text": "Narrative analysis..."
  }
}
```

**Cost**: ~0.05 x402

**Use Cases**:
- Identify emerging trends
- Validate trading thesis
- Discover undervalued narratives
- Find correlation patterns

---

### 2. Crypto Projects API
```
GET /v1/projects?limit=10&sortBy=score&minScore=60
```

**Purpose**: Get trending projects with momentum signals

**Query Parameters**:
```
limit=10              # Max results (default: 50)
name=.*AI.*           # Filter by name (regex)
ticker=SOL            # Filter by ticker
xHandle=solana        # Filter by X handle
sortBy=score          # Sort by score or popularityScore
minScore=70           # Minimum score filter
```

**Response**:
```json
{
  "status": 200,
  "data": {
    "projects": [
      {
        "name": "Project Name",
        "ticker": "PROJ",
        "score": 85,
        "popularityScore": 72,
        "signals": {
          "momentum": "high",
          "sentiment": "positive"
        }
      }
    ]
  }
}
```

**Cost**: ~0.02 x402

**Use Cases**:
- Screen trending projects
- Find high-momentum assets
- Discover emerging opportunities
- Monitor specific projects

---

## Common Queries

### Query 1: Find Emerging Narratives
```typescript
const response = await fetch('https://api.x402.org/v1/agents/indigo', {
  method: 'POST',
  headers: { 'x-api-key': API_KEY },
  body: JSON.stringify({
    messages: [{
      role: 'user',
      content: 'What emerging narratives have institutional backing?'
    }]
  })
})
```

### Query 2: Screen High-Momentum Projects
```typescript
const response = await fetch(
  'https://api.x402.org/v1/projects?limit=20&sortBy=popularityScore&minScore=70',
  { headers: { 'x-api-key': API_KEY } }
)
```

### Query 3: Find AI-Related Projects
```typescript
const response = await fetch(
  'https://api.x402.org/v1/projects?name=.*AI.*&limit=15&minScore=60',
  { headers: { 'x-api-key': API_KEY } }
)
```

### Query 4: Monitor Specific Project
```typescript
const response = await fetch(
  'https://api.x402.org/v1/projects?ticker=SOL',
  { headers: { 'x-api-key': API_KEY } }
)
```

---

## Payment Response Decoding

Every x402 API call includes payment info in the response header:

```typescript
import { decodeXPaymentResponse } from '@x402/sdk'

// Extract payment details
const paymentResponse = decodeXPaymentResponse(
  response.headers['x-payment-response']
)

// Contains:
// - paymentAmount: number
// - transactionHash: string
// - blockchainConfirmation: boolean
// - timestamp: number
```

---

## Automatic Refunds

If query returns no results or fails, x402 automatically refunds:

```json
{
  "status": 404,
  "error": "No information found",
  "data": {
    "refund": {
      "attempted": true,
      "successful": true,
      "transactionHash": "0x...",
      "reason": "No information found"
    }
  }
}
```

---

## Cost Optimization Tips

### 1. Cache Results
```typescript
// Cache for 1 hour
const CACHE_DURATION = 3600000
if (Date.now() - lastQuery < CACHE_DURATION) {
  return cachedResults
}
```

### 2. Batch Queries
```typescript
// Instead of querying each project individually
// Query all at once
const projects = await fetch(
  '/v1/projects?limit=50&minScore=60'
)
```

### 3. Smart Scheduling
```typescript
// Run research queries hourly, not on every tick
setInterval(async () => {
  const signals = await generateAlphaSignals()
}, 3600000) // 1 hour
```

### 4. Validate Before Trading
```typescript
// Only execute trades with high-confidence signals
if (signal.confidence < 0.6) {
  return // Skip low-confidence signals
}
```

---

## Integration Checklist

- [ ] Add x402 API key to .env
- [ ] Import x402 client
- [ ] Create Research Context
- [ ] Implement Indigo AI queries
- [ ] Implement Projects API screening
- [ ] Add payment response decoding
- [ ] Implement caching layer
- [ ] Add cost tracking
- [ ] Test with small amounts
- [ ] Monitor performance
- [ ] Scale up after validation

---

## Example: Complete Research Cycle

```typescript
async function researchCycle() {
  // 1. Query Indigo AI for narratives
  const narrativeResponse = await fetch('/v1/agents/indigo', {
    method: 'POST',
    body: JSON.stringify({
      messages: [{
        role: 'user',
        content: 'What narratives are gaining traction?'
      }]
    })
  })
  
  const narrative = narrativeResponse.data.text
  const narrativeCost = decodeXPaymentResponse(
    narrativeResponse.headers['x-payment-response']
  ).paymentAmount
  
  // 2. Screen for related projects
  const projectsResponse = await fetch(
    '/v1/projects?limit=20&minScore=60'
  )
  
  const projects = projectsResponse.data.projects
  const projectsCost = decodeXPaymentResponse(
    projectsResponse.headers['x-payment-response']
  ).paymentAmount
  
  // 3. Generate trading signals
  const signals = projects
    .filter(p => p.score > 70)
    .map(p => ({
      symbol: p.ticker,
      action: 'buy',
      confidence: p.score / 100
    }))
  
  // 4. Track costs
  const totalCost = narrativeCost + projectsCost
  console.log(`Research cycle cost: ${totalCost} x402`)
  
  return signals
}
```

---

## Error Handling

```typescript
async function safeQuery(endpoint, params) {
  try {
    const response = await fetch(endpoint, {
      headers: { 'x-api-key': API_KEY }
    })
    
    if (response.status === 200) {
      return response.data
    } else if (response.status === 404) {
      // Refund issued automatically
      console.log('No data found, refund processed')
      return null
    } else {
      throw new Error(`API error: ${response.status}`)
    }
  } catch (error) {
    console.error('Query failed:', error)
    // Retry logic here
    return null
  }
}
```

---

## Pricing Summary

| Operation | Cost | Frequency | Monthly |
|-----------|------|-----------|---------|
| Indigo AI | 0.05 x402 | 500 | 25 x402 |
| Projects API | 0.02 x402 | 500 | 10 x402 |
| **Total** | - | - | **35 x402** |

At $1/x402: **~$35/month** for comprehensive market research

---

## Resources

- [x402 GitHub](https://github.com/aixbt/x402)
- [x402 Website](https://x402.org)
- [Daydream Docs](https://docs.dreams.fun)
- [Full Integration Guide](./RESEARCH_INTEGRATION.md)
- [x402 Endpoints](./X402_ENDPOINTS.md)
