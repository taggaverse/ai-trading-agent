/**
 * LLM Client for OpenRouter
 * Handles trading decisions via structured prompting
 */

import logger from '../utils/logger.js'
import axios from 'axios'
import config from '../config/index.js'

export interface TradeDecision {
  asset: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  reasoning: string
  targetPrice?: number
  stopLoss?: number
  takeProfit?: number
}

export interface LLMContext {
  balance: number
  positions: any[]
  marketData: Record<string, any>
  indicators: Record<string, any>
  timestamp: string
}

export class LLMClient {
  private apiKey: string
  private model: string
  private baseUrl: string = 'https://openrouter.io/api/v1'

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || ''
    this.model = model || 'openai/gpt-4-turbo'

    if (!this.apiKey) {
      logger.warn('[LLM] No OpenRouter API key provided, using mock decisions')
    }

    logger.info(`[LLM] Initialized with model: ${this.model}`)
  }

  /**
   * Get trading decisions from LLM
   */
  async getDecisions(context: LLMContext, systemPrompt: string): Promise<TradeDecision[]> {
    try {
      if (!this.apiKey) {
        logger.warn('[LLM] No API key, returning mock decisions')
        return this.getMockDecisions(context)
      }

      logger.info('[LLM] Calling OpenRouter for trading decisions...')

      const userMessage = this.buildUserMessage(context)

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      const content = response.data.choices[0]?.message?.content
      if (!content) {
        logger.warn('[LLM] Empty response from OpenRouter')
        return this.getMockDecisions(context)
      }

      const parsed = JSON.parse(content)
      const decisions = parsed.decisions || []

      logger.info(`[LLM] Received ${decisions.length} decisions`)
      return decisions
    } catch (error) {
      logger.error('[LLM] Failed to get decisions from OpenRouter:', error)
      return this.getMockDecisions(context)
    }
  }

  /**
   * Build user message with context
   */
  private buildUserMessage(context: LLMContext): string {
    const positions = context.positions.map(p => 
      `${p.asset}: ${p.size} @ $${p.currentPrice} (PnL: ${p.pnl})`
    ).join('\n')

    const indicators = Object.entries(context.indicators).map(([asset, data]: [string, any]) => 
      `${asset}: RSI=${data['5m']?.rsi?.toFixed(2)}, MACD=${data['5m']?.macd?.toFixed(4)}`
    ).join('\n')

    return `
Current Portfolio State:
- Balance: $${context.balance.toFixed(2)}
- Positions:
${positions || 'None'}

Technical Indicators (5m):
${indicators || 'None'}

Based on this data, provide trading decisions in JSON format:
{
  "decisions": [
    {
      "asset": "BTC",
      "action": "BUY|SELL|HOLD",
      "confidence": 0.0-1.0,
      "reasoning": "explanation",
      "targetPrice": optional_number,
      "stopLoss": optional_number,
      "takeProfit": optional_number
    }
  ]
}

Only include decisions for assets with clear signals. Prioritize capital preservation.
`
  }

  /**
   * Get mock decisions for testing
   */
  private getMockDecisions(context: LLMContext): TradeDecision[] {
    const decisions: TradeDecision[] = []

    // For each position, decide to HOLD or SELL based on PnL
    for (const pos of context.positions) {
      if (pos.pnl > 0) {
        // Take profits on winners
        decisions.push({
          asset: pos.asset,
          action: 'HOLD',
          confidence: 0.5,
          reasoning: 'Position in profit, holding for more gains'
        })
      } else if (pos.pnl < -100) {
        // Cut losses on big losers
        decisions.push({
          asset: pos.asset,
          action: 'SELL',
          confidence: 0.7,
          reasoning: 'Position in significant loss, cutting losses'
        })
      } else {
        // Hold small losses
        decisions.push({
          asset: pos.asset,
          action: 'HOLD',
          confidence: 0.6,
          reasoning: 'Waiting for recovery'
        })
      }
    }

    // For assets not held, consider BUY if indicators are strong
    const heldAssets = new Set(context.positions.map(p => p.asset))
    for (const [asset, indicators] of Object.entries(context.indicators)) {
      if (!heldAssets.has(asset)) {
        const rsi = indicators['5m']?.rsi || 50
        if (rsi < 30) {
          decisions.push({
            asset,
            action: 'BUY',
            confidence: 0.6,
            reasoning: `RSI ${rsi.toFixed(2)} indicates oversold conditions`
          })
        }
      }
    }

    return decisions
  }

  /**
   * Estimate token cost for a message
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
  }
}
