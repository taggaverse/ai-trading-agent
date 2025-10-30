/**
 * Dreams Router LLM Client
 * Calls Dreams Router API with x402 payments
 */

import logger from '../utils/logger.js'
import axios from 'axios'
import { X402PaymentClient } from './x402-payment-client.js'
import config from '../config/index.js'

export interface TradeDecision {
  asset: string
  action: 'BUY' | 'SELL' | 'HOLD'
  rationale: string
  entryPrice?: number
  takeProfit?: number
  stopLoss?: number
  positionSize?: number
  exitPlan?: string
}

export class DreamsLLMClient {
  private paymentClient: X402PaymentClient
  private routerUrl: string
  private costPerCall: number = 0.1 // $0.10 USDC per LLM call

  constructor() {
    this.paymentClient = new X402PaymentClient()
    this.routerUrl = config.DREAMS_ROUTER_URL || 'https://router.daydreams.systems'
    logger.info(`[Dreams LLM] Initialized with router: ${this.routerUrl}`)
  }

  /**
   * Call LLM via Dreams Router with x402 payment
   */
  async callLLM(
    systemPrompt: string,
    userPrompt: string
  ): Promise<TradeDecision[]> {
    try {
      logger.info(`[Dreams LLM] Calling Dreams Router with x402 payment ($${this.costPerCall})...`)

      // Check balance before calling
      const hasBalance = await this.paymentClient.hasSufficientBalance(this.costPerCall)
      if (!hasBalance) {
        logger.error(`[Dreams LLM] Insufficient USDC balance for LLM call`)
        throw new Error('Insufficient USDC balance')
      }

      // Generate x402 payment header
      logger.info('[Dreams LLM] Generating x402 payment header...')
      const paymentHeader = await this.paymentClient.generatePaymentHeader(this.costPerCall)

      // Call Dreams Router
      logger.info('[Dreams LLM] Sending request to Dreams Router...')
      const response = await axios.post(
        `${this.routerUrl}/v1/chat/completions`,
        {
          model: 'openai/gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Payment': paymentHeader
          },
          timeout: 60000
        }
      )

      logger.info('[Dreams LLM] Response received from Dreams Router')

      // Parse response
      const content = response.data.choices?.[0]?.message?.content
      if (!content) {
        logger.warn('[Dreams LLM] Empty response from Dreams Router')
        return []
      }

      // Parse JSON response
      const parsed = JSON.parse(content)
      const decisions = parsed.decisions || []

      logger.info(`[Dreams LLM] Parsed ${decisions.length} trading decisions`)
      logger.info(`[Dreams LLM] USDC spent: $${this.costPerCall}`)

      return decisions
    } catch (error) {
      logger.error('[Dreams LLM] Failed to call Dreams Router:', error)
      throw error
    }
  }

  /**
   * Build user prompt for trading decisions with performance history
   */
  buildUserPrompt(context: any): string {
    const positions = context.positions
      .map((p: any) => `${p.asset}: ${p.size} @ $${p.currentPrice} (PnL: $${p.pnl})`)
      .join('\n')

    const indicators = Object.entries(context.indicators)
      .map(([asset, data]: [string, any]) => {
        const rsi = typeof data['5m']?.rsi === 'number' ? data['5m'].rsi.toFixed(2) : 'N/A'
        const macd = typeof data['5m']?.macd === 'number' ? data['5m'].macd.toFixed(4) : 'N/A'
        return `${asset}: RSI=${rsi}, MACD=${macd}`
      })
      .join('\n')

    // Build performance history section
    const performance = context.performance || {}
    const assetPerf = Object.entries(performance.assetPerformance || {})
      .map(([asset, data]: [string, any]) => {
        const winRate = data.wins + data.losses > 0 ? ((data.wins / (data.wins + data.losses)) * 100).toFixed(0) : 'N/A'
        return `${asset}: ${data.wins}W/${data.losses}L (${winRate}% win rate, PnL: $${data.totalPnL.toFixed(2)})`
      })
      .join('\n')

    const recentTrades = (performance.recentTrades || [])
      .map((t: any) => `${t.asset} ${t.action}: $${t.pnl.toFixed(2)} - ${t.rationale}`)
      .join('\n')

    return `
## CURRENT STATE

Portfolio:
- Balance: $${context.balance.toFixed(2)}
- Total Trades: ${context.totalTrades || 0}
- Total PnL: $${context.totalPnL?.toFixed(2) || '0.00'}
- Positions:
${positions || 'None'}

## YOUR PERFORMANCE (Learn from this!)

Overall Win Rate: ${performance.winRate || 'N/A'}% (${performance.winCount || 0}W / ${performance.lossCount || 0}L)

Per-Asset Performance:
${assetPerf || 'No history yet'}

Recent Trades (Last 5):
${recentTrades || 'No trades yet'}

## MARKET DATA

Technical Indicators (5m):
${indicators || 'None'}

## INSTRUCTIONS

Based on your performance history and current market data:
1. If win rate < 50%: Be more selective, wait for stronger signals
2. If recent losses: Reduce position size, increase stop loss
3. If specific asset underperforms: Avoid or reduce exposure
4. If specific asset outperforms: Consider increasing allocation

Provide trading decisions in JSON format:
{
  "decisions": [
    {
      "asset": "BTC",
      "action": "BUY|SELL|HOLD",
      "rationale": "explanation (reference your performance if relevant)",
      "entryPrice": optional_number,
      "takeProfit": optional_number,
      "stopLoss": optional_number,
      "positionSize": optional_number,
      "exitPlan": optional_string
    }
  ]
}

Only include decisions for assets with clear signals. Prioritize capital preservation.
`
  }

  /**
   * Get payment client for balance checking
   */
  getPaymentClient(): X402PaymentClient {
    return this.paymentClient
  }

  /**
   * Get cost per call
   */
  getCostPerCall(): number {
    return this.costPerCall
  }
}
