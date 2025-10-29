# Research Context Integration Guide

## Overview
This guide explains how to integrate x402 AI research endpoints into the trading agent to generate market alpha and identify emerging opportunities before mainstream adoption.

## Why Research Context Matters

**Traditional Trading Agent**:
- Relies solely on technical analysis
- Reactive to price movements
- Limited to historical patterns
- Misses emerging narratives

**Enhanced with Research Context**:
- Combines technical + fundamental analysis
- Proactive identification of opportunities
- Discovers emerging narratives early
- Validates trades against macro trends

## Architecture

```
Market Data Stream
    ↓
Market Context (Technical)
    ↓
Research Context (Fundamental)
├─ Indigo AI (Narrative Analysis)
└─ Projects API (Momentum Screening)
    ↓
Trading Context (Composition)
    ↓
LLM Reasoning
    ↓
Actions (Execute Trades)
```

## Research Context Implementation

### File: `src/agent/contexts/research.ts`

```typescript
import { context } from '@daydreams/sdk'
import { x402Client } from '../../x402/client'

interface Narrative {
  name: string
  description: string
  strength: number // 0-100
  relatedProjects: string[]
  sentiment: 'bullish' | 'neutral' | 'bearish'
  lastUpdated: number
}

interface Project {
  name: string
  ticker: string
  score: number
  popularityScore: number
  signals: {
    momentum: string
    sentiment: string
    adoption: string
  }
  summary: string
}

interface AlphaSignal {
  type: 'narrative' | 'project' | 'trend'
  signal: string
  strength: number
  confidence: number
  action: 'buy' | 'sell' | 'hold'
  relatedAssets: string[]
}

export const researchContext = context({
  type: 'research',
  
  state: {
    narratives: new Map<string, Narrative>(),
    trendingProjects: [] as Project[],
    alphaSignals: [] as AlphaSignal[],
    researchCost: 0,
    lastResearchTime: 0,
    cacheExpiry: 3600000 // 1 hour
  },

  // Query Indigo AI for narrative analysis
  async getNarrativeAnalysis(query: string): Promise<string> {
    try {
      const response = await x402Client.post('/v1/agents/indigo', {
        messages: [
          {
            role: 'user',
            content: query
          }
        ]
      })

      if (response.status === 200) {
        const narrative = response.data.text
        
        // Track cost
        const paymentResponse = response.headers['x-payment-response']
        this.state.researchCost += parseFloat(paymentResponse.amount)
        
        return narrative
      } else if (response.status === 404) {
        // Automatic refund issued
        console.log('Query returned no results, refund processed')
        return null
      }
    } catch (error) {
      console.error('Error querying Indigo AI:', error)
      throw error
    }
  },

  // Screen projects by criteria
  async screenProjects(filters: {
    limit?: number
    name?: string
    ticker?: string
    minScore?: number
    sortBy?: 'score' | 'popularityScore'
  }): Promise<Project[]> {
    try {
      // Check cache first
      const now = Date.now()
      if (
        this.state.trendingProjects.length > 0 &&
        now - this.state.lastResearchTime < this.state.cacheExpiry
      ) {
        console.log('Using cached project data')
        return this.state.trendingProjects
      }

      // Build query string
      const params = new URLSearchParams()
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.name) params.append('name', filters.name)
      if (filters.ticker) params.append('ticker', filters.ticker)
      if (filters.minScore) params.append('minScore', filters.minScore.toString())
      if (filters.sortBy) params.append('sortBy', filters.sortBy)

      const response = await x402Client.get(`/v1/projects?${params.toString()}`)

      if (response.status === 200) {
        const projects = response.data.projects
        
        // Cache results
        this.state.trendingProjects = projects
        this.state.lastResearchTime = now
        
        // Track cost
        const paymentResponse = response.headers['x-payment-response']
        this.state.researchCost += parseFloat(paymentResponse.amount)
        
        return projects
      }
    } catch (error) {
      console.error('Error screening projects:', error)
      throw error
    }
  },

  // Get trending projects
  async getTrendingProjects(limit: number = 10): Promise<Project[]> {
    return this.screenProjects({
      limit,
      sortBy: 'popularityScore',
      minScore: 60
    })
  },

  // Find projects related to narrative
  async findProjectsByNarrative(narrative: string): Promise<Project[]> {
    return this.screenProjects({
      name: `.*${narrative}.*`,
      limit: 20,
      minScore: 50
    })
  },

  // Generate alpha signals from research
  async generateAlphaSignals(): Promise<AlphaSignal[]> {
    const signals: AlphaSignal[] = []

    try {
      // 1. Get current narratives
      const narrativeQuery = 'What are the strongest emerging narratives in crypto right now?'
      const narrativeAnalysis = await this.getNarrativeAnalysis(narrativeQuery)

      if (narrativeAnalysis) {
        // Parse narrative and create signals
        const narrativeSignal: AlphaSignal = {
          type: 'narrative',
          signal: narrativeAnalysis,
          strength: 75,
          confidence: 0.8,
          action: 'buy',
          relatedAssets: []
        }
        signals.push(narrativeSignal)
      }

      // 2. Get trending projects
      const trendingProjects = await this.getTrendingProjects(15)

      for (const project of trendingProjects) {
        if (project.score > 70) {
          const projectSignal: AlphaSignal = {
            type: 'project',
            signal: `${project.name} (${project.ticker}) showing strong momentum`,
            strength: project.score,
            confidence: 0.7,
            action: 'buy',
            relatedAssets: [project.ticker]
          }
          signals.push(projectSignal)
        }
      }

      // 3. Identify trends
      const trendQuery = 'What emerging trends could drive the next market cycle?'
      const trendAnalysis = await this.getNarrativeAnalysis(trendQuery)

      if (trendAnalysis) {
        const trendSignal: AlphaSignal = {
          type: 'trend',
          signal: trendAnalysis,
          strength: 65,
          confidence: 0.6,
          action: 'hold',
          relatedAssets: []
        }
        signals.push(trendSignal)
      }

      this.state.alphaSignals = signals
      return signals

    } catch (error) {
      console.error('Error generating alpha signals:', error)
      return []
    }
  },

  // Monitor specific project
  async monitorProject(ticker: string): Promise<Project | null> {
    try {
      const projects = await this.screenProjects({ ticker })
      return projects.length > 0 ? projects[0] : null
    } catch (error) {
      console.error(`Error monitoring project ${ticker}:`, error)
      return null
    }
  },

  // Get research state
  getState() {
    return {
      narratives: Array.from(this.state.narratives.values()),
      trendingProjects: this.state.trendingProjects,
      alphaSignals: this.state.alphaSignals,
      totalResearchCost: this.state.researchCost
    }
  },

  // Clear cache
  clearCache() {
    this.state.trendingProjects = []
    this.state.lastResearchTime = 0
  }
})
```

## Integration with Trading Context

### File: `src/agent/contexts/trading.ts`

```typescript
import { marketContext } from './market'
import { researchContext } from './research'
import { portfolioContext } from './portfolio'
import { riskContext } from './risk'

export const tradingContext = context({
  type: 'trading',

  async composeContexts(state: any) {
    // Compose all contexts
    return {
      market: await marketContext.getMarketState(),
      research: await researchContext.getState(),
      portfolio: await portfolioContext.getState(),
      risk: await riskContext.getRiskStatus()
    }
  },

  async generateTradeSetup(symbol: string) {
    // 1. Get technical signals from market
    const marketSignals = await marketContext.getSignals(symbol)

    // 2. Get research signals
    const alphaSignals = await researchContext.generateAlphaSignals()

    // 3. Check if research supports technical signal
    const supportingResearch = alphaSignals.find(s =>
      s.relatedAssets.includes(symbol) && s.action === 'buy'
    )

    // 4. Validate against risk
    const riskValidation = await riskContext.validateTrade({
      symbol,
      side: 'buy',
      size: 1
    })

    return {
      symbol,
      technicalSignal: marketSignals,
      researchSignal: supportingResearch,
      riskValidation,
      confidence: this.calculateConfidence(
        marketSignals,
        supportingResearch,
        riskValidation
      )
    }
  },

  calculateConfidence(technical: any, research: any, risk: any): number {
    let confidence = 0.5 // Base confidence

    if (technical.bullish) confidence += 0.2
    if (research && research.action === 'buy') confidence += 0.2
    if (risk.valid) confidence += 0.1

    return Math.min(confidence, 1.0)
  }
})
```

## Research-Driven Actions

### File: `src/agent/actions/research-trade.ts`

```typescript
export const researchTradeAction = {
  name: 'research_trade',

  async execute(input: {
    symbol: string
    signal: AlphaSignal
    size: number
  }) {
    // 1. Validate research signal
    if (input.signal.confidence < 0.6) {
      return { status: 'rejected', reason: 'Low confidence' }
    }

    // 2. Execute trade based on research
    const order = await exchangeAdapter.createOrder({
      symbol: input.symbol,
      side: input.signal.action === 'buy' ? 'buy' : 'sell',
      amount: input.size,
      type: 'market'
    })

    // 3. Record research-driven trade
    await portfolioContext.recordTrade({
      ...order,
      source: 'research',
      signal: input.signal
    })

    return { status: 'executed', order }
  }
}
```

## Cost Optimization Strategies

### 1. Caching
```typescript
// Cache research for 1 hour to reduce API calls
const CACHE_DURATION = 3600000 // 1 hour

async function getCachedProjects() {
  const now = Date.now()
  if (
    this.cachedProjects &&
    now - this.lastCacheTime < CACHE_DURATION
  ) {
    return this.cachedProjects
  }
  // Fetch fresh data
}
```

### 2. Batch Queries
```typescript
// Instead of querying each project individually
// Query all trending projects at once
const projects = await researchContext.screenProjects({
  limit: 50,
  minScore: 60
})
```

### 3. Smart Scheduling
```typescript
// Run research queries at specific times
// Not on every market tick
const RESEARCH_INTERVAL = 3600000 // 1 hour

async function scheduledResearch() {
  setInterval(async () => {
    const signals = await researchContext.generateAlphaSignals()
    // Use signals for next hour
  }, RESEARCH_INTERVAL)
}
```

## Example Trading Scenarios

### Scenario 1: Narrative-Driven Trade
```
1. Research identifies "AI agents" as emerging narrative
2. Screens for AI-related projects
3. Finds high-scoring project (e.g., AIXBT)
4. Validates against technical analysis
5. If both align: Execute buy trade
6. Cost: ~0.07 x402 for research
```

### Scenario 2: Momentum Screening
```
1. Query trending projects (limit: 20, minScore: 70)
2. Identify top 3 projects
3. Check if any match portfolio strategy
4. Execute trades on high-confidence matches
5. Cost: ~0.02 x402 per screening
```

### Scenario 3: Narrative Shift Detection
```
1. Query Indigo AI for current narratives
2. Compare to previous narratives
3. If shift detected: Rebalance portfolio
4. Close positions in old narrative
5. Open positions in new narrative
6. Cost: ~0.05 x402 per analysis
```

## Monitoring & Metrics

### Track Research Performance
```typescript
interface ResearchMetrics {
  totalQueriesRun: number
  totalResearchCost: number
  costPerTrade: number
  alphaGenerated: number // Excess returns
  narrativeAccuracy: number // % of narratives that moved market
  projectSuccessRate: number // % of screened projects that profited
}
```

### Example Dashboard
```
Research Performance Dashboard
├─ Total Research Cost: 45.23 x402
├─ Queries Run: 523
├─ Cost Per Query: 0.087 x402
├─ Trades Generated: 87
├─ Win Rate: 62%
├─ Alpha Generated: 12.5%
└─ ROI on Research: 8.3x
```

## Best Practices

1. **Start Small**: Begin with 1-2 research queries per day
2. **Validate**: Compare research signals to technical signals
3. **Monitor Costs**: Track x402 spending vs. trading profits
4. **Cache Aggressively**: Reuse research data within cache window
5. **Batch Operations**: Group queries to reduce API calls
6. **Error Handling**: Gracefully handle refunds and failures
7. **Diversify**: Use multiple research endpoints for confirmation

## Next Steps

1. Implement Research Context
2. Integrate with Trading Context
3. Create Research-Trade Action
4. Add cost tracking and monitoring
5. Backtest research-driven strategies
6. Optimize for cost efficiency
7. Deploy and monitor performance
