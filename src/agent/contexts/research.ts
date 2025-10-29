import { context } from "../../types/daydreams.js"
import { z } from "zod"
import axios from "axios"
import logger from "../../utils/logger.js"

// Types
export interface Narrative {
  id: string
  title: string
  description: string
  sentiment: "positive" | "negative" | "neutral"
  strength: number // 0-1
  timestamp: number
  source: string
}

export interface Project {
  symbol: string
  name: string
  momentum: number // 0-1
  trendingScore: number // 0-100
  communityGrowth: number // 0-1
  developmentActivity: number // 0-1
  timestamp: number
}

export interface AlphaSignal {
  symbol: string
  signal: "buy" | "sell" | "hold"
  confidence: number // 0-1
  reason: string
  narratives: string[]
  projects: string[]
  timestamp: number
}

// Research context schema
const researchContextSchema = z.object({
  symbol: z.string(),
})

export type ResearchContextArgs = z.infer<typeof researchContextSchema>

// Research context state
export interface ResearchContextState {
  symbol: string
  narratives: Narrative[]
  projects: Project[]
  alphaSignals: AlphaSignal[]
  lastUpdate: number
  cache: Map<string, any>
}

// Create research context
export const researchContext = context({
  type: "research-trading",
  schema: researchContextSchema,
  create: async (state: any): Promise<ResearchContextState> => {
    logger.info(`Initializing research context for ${state.args.symbol}`)
    
    return {
      symbol: state.args.symbol,
      narratives: [],
      projects: [],
      alphaSignals: [],
      lastUpdate: 0,
      cache: new Map(),
    }
  },
})

// x402 API client
class X402ResearchClient {
  private baseUrl: string
  private walletAddress: string

  constructor(baseUrl: string, walletAddress: string) {
    this.baseUrl = baseUrl
    this.walletAddress = walletAddress
  }

  async queryIndigoAI(query: string): Promise<Narrative[]> {
    try {
      logger.info(`Querying Indigo AI: ${query}`)

      const response = await axios.post(
        `${this.baseUrl}/v1/agents/indigo`,
        {
          query,
          wallet: this.walletAddress,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      if (response.data.success) {
        const narratives: Narrative[] = response.data.narratives.map((n: any) => ({
          id: n.id,
          title: n.title,
          description: n.description,
          sentiment: n.sentiment || "neutral",
          strength: n.strength || 0.5,
          timestamp: Date.now(),
          source: "indigo-ai",
        }))

        logger.info(`Received ${narratives.length} narratives from Indigo AI`)
        return narratives
      }

      return []
    } catch (error) {
      logger.error("Failed to query Indigo AI:", error)
      return []
    }
  }

  async screenProjects(filters: {
    minMomentum?: number
    maxProjects?: number
  }): Promise<Project[]> {
    try {
      logger.info("Screening projects via x402...")

      const response = await axios.post(
        `${this.baseUrl}/v1/projects`,
        {
          filters,
          wallet: this.walletAddress,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      if (response.data.success) {
        const projects: Project[] = response.data.projects.map((p: any) => ({
          symbol: p.symbol,
          name: p.name,
          momentum: p.momentum || 0.5,
          trendingScore: p.trendingScore || 50,
          communityGrowth: p.communityGrowth || 0.5,
          developmentActivity: p.developmentActivity || 0.5,
          timestamp: Date.now(),
        }))

        logger.info(`Found ${projects.length} trending projects`)
        return projects
      }

      return []
    } catch (error) {
      logger.error("Failed to screen projects:", error)
      return []
    }
  }
}

// Helper functions
export async function queryResearch(
  symbol: string,
  x402Client: X402ResearchClient
): Promise<{
  narratives: Narrative[]
  projects: Project[]
}> {
  try {
    // Query narratives for the symbol
    const narratives = await x402Client.queryIndigoAI(`${symbol} market narrative and trends`)

    // Screen for trending projects related to the symbol
    const projects = await x402Client.screenProjects({
      minMomentum: 0.6,
      maxProjects: 10,
    })

    return { narratives, projects }
  } catch (error) {
    logger.error(`Failed to query research for ${symbol}:`, error)
    return { narratives: [], projects: [] }
  }
}

export function generateAlphaSignals(
  narratives: Narrative[],
  projects: Project[]
): AlphaSignal[] {
  const signals: AlphaSignal[] = []

  if (narratives.length === 0 && projects.length === 0) {
    return signals
  }

  // Calculate average sentiment from narratives
  const avgSentiment = narratives.length > 0
    ? narratives.reduce((sum, n) => sum + (n.sentiment === "positive" ? 1 : n.sentiment === "negative" ? -1 : 0), 0) / narratives.length
    : 0

  // Calculate average momentum from projects
  const avgMomentum = projects.length > 0
    ? projects.reduce((sum, p) => sum + p.momentum, 0) / projects.length
    : 0

  // Generate signal based on combined metrics
  const combinedScore = (avgSentiment + avgMomentum) / 2
  const confidence = Math.abs(combinedScore)

  let signal: "buy" | "sell" | "hold"
  if (combinedScore > 0.3) {
    signal = "buy"
  } else if (combinedScore < -0.3) {
    signal = "sell"
  } else {
    signal = "hold"
  }

  const narrativeIds = narratives.map(n => n.id)
  const projectSymbols = projects.map(p => p.symbol)

  signals.push({
    symbol: narratives[0]?.id || "UNKNOWN",
    signal,
    confidence,
    reason: `Based on ${narratives.length} narratives and ${projects.length} trending projects`,
    narratives: narrativeIds,
    projects: projectSymbols,
    timestamp: Date.now(),
  })

  return signals
}

export function updateResearchState(
  state: ResearchContextState,
  narratives: Narrative[],
  projects: Project[]
): ResearchContextState {
  const alphaSignals = generateAlphaSignals(narratives, projects)

  return {
    ...state,
    narratives,
    projects,
    alphaSignals,
    lastUpdate: Date.now(),
  }
}

// Export client for use in agent
export { X402ResearchClient }
