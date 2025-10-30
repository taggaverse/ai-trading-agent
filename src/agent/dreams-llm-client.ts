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
   * Build user prompt for trading decisions (fixed strategy, no adaptive learning)
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

    return `
## CURRENT PORTFOLIO STATE

Balance: $${context.balance.toFixed(2)}
Total Trades: ${context.totalTrades || 0}
Total PnL: $${context.totalPnL?.toFixed(2) || '0.00'}

Current Positions:
${positions || 'None'}

## MARKET DATA

Technical Indicators (5m):
${indicators || 'None'}

## TRADING INSTRUCTIONS

Use FIXED STRATEGY based on technical signals only:
- Apply the same rules to every asset
- Do NOT adjust based on past performance
- Do NOT increase size after wins or reduce after losses
- Do NOT favor or avoid specific assets based on history

Provide trading decisions in JSON format:
{
  "decisions": [
    {
      "asset": "BTC",
      "action": "BUY|SELL|HOLD",
      "rationale": "Clear technical explanation",
      "entryPrice": optional_number,
      "takeProfit": optional_number,
      "stopLoss": optional_number,
      "positionSize": optional_number,
      "exitPlan": optional_string
    }
  ]
}

Only include decisions for assets with clear technical signals. Prioritize capital preservation.
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
