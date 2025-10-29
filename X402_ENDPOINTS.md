# x402 Endpoints for Market Alpha Research

## Overview
The x402 protocol provides AI-powered market research endpoints that can be integrated into our trading agent to generate alpha signals and identify emerging opportunities before the market catches on.

## Available Endpoints

### 1. Indigo AI Agent
**Endpoint**: `POST /v1/agents/indigo`

**Purpose**: Chat with the Indigo AI agent to discover emerging narratives and market opportunities

**Request Format**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Which developing narrative has the most potential for growth?"
    }
  ]
}
```

**Response Format**:
```json
{
  "status": 200,
  "error": "",
  "data": {
    "text": "Based on current momentum, [narrative analysis with opportunities]..."
  }
}
```

**Use Cases for Trading Agent**:
- Identify emerging narratives before mainstream adoption
- Discover undervalued projects with strong fundamentals
- Find correlation patterns between narratives and price movements
- Generate long-term thesis for portfolio positioning
- Validate trading signals against macro narratives

**Example Queries**:
- "Which emerging protocols have institutional backing?"
- "What narratives are gaining traction in crypto?"
- "Which projects are solving real problems with strong teams?"
- "What's the next major trend after [current trend]?"
- "Which Layer 2 solutions are gaining adoption?"

---

### 2. Crypto Projects API
**Endpoint**: `GET /v1/projects`

**Purpose**: Get a list of crypto projects with surging momentum and signal summaries

**Query Parameters**:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | number | 50 | 50 | Maximum number of results |
| `name` | string | - | - | Filter by project name (regex search) |
| `ticker` | string | - | - | Filter by exact ticker symbol |
| `xHandle` | string | - | - | Filter by Twitter/X handle |
| `sortBy` | string | score | - | Sort by `score` or `popularityScore` |
| `minScore` | number | - | - | Filter projects with minimum score |

**Request Examples**:
```
GET /v1/projects?limit=10&sortBy=score
GET /v1/projects?ticker=SOL
GET /v1/projects?name=.*AI.*&minScore=50
GET /v1/projects?xHandle=solana&limit=5
```

**Response Format**:
```json
{
  "status": 200,
  "data": {
    "projects": [
      {
        "name": "Project Name",
        "ticker": "PROJ",
        "xHandle": "@projecthandle",
        "score": 85,
        "popularityScore": 72,
        "signals": {
          "momentum": "high",
          "sentiment": "positive",
          "adoption": "growing"
        },
        "summary": "Project description and signal summary..."
      }
    ]
  }
}
```

**Use Cases for Trading Agent**:
- Screen for projects with surging momentum
- Identify trending narratives by filtering projects
- Discover emerging opportunities with high scores
- Monitor social sentiment and adoption metrics
- Build watchlist of high-potential projects
- Validate project fundamentals before trading

**Example Queries**:
```
// Get top 10 trending projects
GET /v1/projects?limit=10&sortBy=popularityScore

// Find all AI-related projects
GET /v1/projects?name=.*AI.*&limit=20

// Get high-scoring DeFi projects
GET /v1/projects?minScore=70&limit=15

// Monitor specific project
GET /v1/projects?ticker=SOL
```

---

## Payment & Response Headers

### Payment Response Header
All x402 API calls include payment information in the response header:

**Header Name**: `x-payment-response`

**Decoding Payment Response**:
```typescript
import { decodeXPaymentResponse } from '@x402/sdk'

// For fetch
const paymentResponse = decodeXPaymentResponse(
  response.headers.get("x-payment-response")
)

// For axios
const paymentResponse = decodeXPaymentResponse(
  response.headers["x-payment-response"]
)

// Contains:
// - paymentAmount: number (cost in x402)
// - transactionHash: string
// - blockchainConfirmation: boolean
// - timestamp: number
```

---

## Automatic Refunds

The x402 protocol includes automatic refund logic:

**When Refunds Are Issued**:
- No information found for query
- API error or timeout
- Insufficient data to generate response
- Invalid request format

**Refund Response Structure**:
```json
{
  "status": 404,
  "error": "No information found",
  "data": {
    "message": "The request was processed but no meaningful information was found.",
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

## Integration Strategy for Trading Agent

### Research Context Enhancement
Add a new `ResearchContext` that uses x402 endpoints:

```typescript
// src/agent/contexts/research.ts
class ResearchContext {
  // Query Indigo AI for narrative analysis
  async getNarrativeAnalysis(query: string): Promise<string>
  
  // Get trending projects
  async getTrendingProjects(limit: number): Promise<Project[]>
  
  // Screen projects by criteria
  async screenProjects(filters: ProjectFilters): Promise<Project[]>
  
  // Monitor specific project
  async monitorProject(ticker: string): Promise<ProjectData>
  
  // Generate alpha signals from research
  async generateAlphaSignals(): Promise<AlphaSignal[]>
}
```

### Research Action
Add a new action to leverage research data:

```typescript
// src/agent/actions/research-alpha.ts
class ResearchAlphaAction {
  // Execute research-driven trades
  async executeResearchTrade(signal: AlphaSignal): Promise<void>
  
  // Update portfolio based on narrative shifts
  async rebalanceByNarrative(narrative: string): Promise<void>
  
  // Add projects to watchlist
  async addToWatchlist(projects: Project[]): Promise<void>
}
```

### Data Flow Integration
```
Market Data Stream
    ↓
Market Context (technical analysis)
    ↓
Research Context (x402 endpoints)
├─ Indigo AI (narrative analysis)
└─ Projects API (momentum screening)
    ↓
Trading Context (compose all signals)
    ↓
LLM Reasoning (combine technical + fundamental)
    ↓
Actions (execute trades)
```

---

## Cost Estimation

**Indigo AI Agent Call**: ~0.05 x402 per query
**Projects API Call**: ~0.02 x402 per query
**Batch Screening**: ~0.10 x402 for 50 projects

**Monthly Budget (assuming 1000 queries)**:
- 500 Indigo calls × 0.05 = 25 x402
- 500 Projects calls × 0.02 = 10 x402
- **Total**: ~35 x402/month

---

## Implementation Examples

### Example 1: Query Indigo for Narrative
```typescript
async function queryIndigoAI(query: string) {
  const response = await fetch('https://api.x402.org/v1/agents/indigo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.X402_API_KEY
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: query
        }
      ]
    })
  })
  
  const data = await response.json()
  const paymentResponse = decodeXPaymentResponse(
    response.headers.get('x-payment-response')
  )
  
  return {
    narrative: data.data.text,
    cost: paymentResponse.paymentAmount,
    txHash: paymentResponse.transactionHash
  }
}
```

### Example 2: Screen for Trending Projects
```typescript
async function getTrendingProjects() {
  const response = await fetch(
    'https://api.x402.org/v1/projects?limit=20&sortBy=popularityScore&minScore=60',
    {
      headers: {
        'x-api-key': process.env.X402_API_KEY
      }
    }
  )
  
  const data = await response.json()
  const paymentResponse = decodeXPaymentResponse(
    response.headers.get('x-payment-response')
  )
  
  return {
    projects: data.data.projects,
    cost: paymentResponse.paymentAmount,
    txHash: paymentResponse.transactionHash
  }
}
```

### Example 3: Monitor Specific Project
```typescript
async function monitorProject(ticker: string) {
  const response = await fetch(
    `https://api.x402.org/v1/projects?ticker=${ticker}`,
    {
      headers: {
        'x-api-key': process.env.X402_API_KEY
      }
    }
  )
  
  const data = await response.json()
  
  if (data.status === 200 && data.data.projects.length > 0) {
    const project = data.data.projects[0]
    return {
      name: project.name,
      score: project.score,
      signals: project.signals,
      summary: project.summary
    }
  }
  
  return null
}
```

---

## Best Practices

1. **Cache Results**: Cache narrative analysis for 1 hour to reduce costs
2. **Batch Queries**: Use batch screening instead of individual queries
3. **Error Handling**: Handle refunds gracefully and retry failed queries
4. **Cost Tracking**: Log all x402 costs for billing analysis
5. **Rate Limiting**: Implement rate limiting to avoid excessive API calls
6. **Validation**: Validate x402 responses before using in trading decisions
7. **Monitoring**: Track which narratives generate profitable trades

---

## Integration Checklist

- [ ] Add x402 API key to environment
- [ ] Create ResearchContext class
- [ ] Implement Indigo AI integration
- [ ] Implement Projects API integration
- [ ] Add payment response decoding
- [ ] Create ResearchAlpha action
- [ ] Add research to Trading Context composition
- [ ] Implement caching layer
- [ ] Add cost tracking
- [ ] Create monitoring dashboard
- [ ] Test with small x402 amounts
- [ ] Scale up after validation
