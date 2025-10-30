/**
 * x402 LLM Client
 * Uses Dreams Router with x402 payments for LLM calls
 */

import logger from '../utils/logger.js'
import axios from 'axios'
import { generateX402Payment } from '@daydreamsai/ai-sdk-provider'
import { privateKeyToAccount } from 'viem/accounts'
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

export class X402LLMClient {
  private routerUrl: string
  private account: any
  private network: string

  constructor() {
    this.routerUrl = config.DREAMS_ROUTER_URL || 'https://router.daydreams.systems'
    this.network = config.X402_NETWORK || 'base-sepolia'

    // Initialize account from private key
    const privateKey = config.X402_PRIVATE_KEY as `0x${string}`
    this.account = privateKeyToAccount(privateKey)

    logger.info(`[x402 LLM] Initialized with account: ${this.account.address}`)
  }

  /**
   * Call LLM via Dreams Router with x402 payment
   */
  async callLLM(
    systemPrompt: string,
    userPrompt: string,
    amountUsdc: number = 0.1 // $0.10 default
  ): Promise<TradeDecision[]> {
    try {
      logger.info(`[x402 LLM] Calling Dreams Router (${amountUsdc} USDC)...`)

      // Generate x402 payment header
      const amountWei = Math.floor(amountUsdc * 1_000_000).toString() // Convert to 6 decimals
      const paymentHeader = await generateX402Payment(this.account, {
        amount: amountWei,
        network: this.network as 'base-sepolia' | 'base'
      })

      logger.info(`[x402 LLM] Payment header generated`)

      // Call Dreams Router
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
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Payment': paymentHeader
          },
          timeout: 60000
        }
      )

      logger.info(`[x402 LLM] Response received`)

      // Parse response
      const content = response.data.choices[0]?.message?.content
      if (!content) {
        logger.warn('[x402 LLM] Empty response from Dreams Router')
        return []
      }

      const parsed = JSON.parse(content)
      const decisions = parsed.decisions || []

      logger.info(`[x402 LLM] Parsed ${decisions.length} decisions`)
      return decisions
    } catch (error) {
      logger.error('[x402 LLM] Failed to call Dreams Router:', error)
      throw error
    }
  }

  /**
   * Build user prompt for trading decisions
   */
  buildUserPrompt(context: any): string {
    const positions = context.positions
      .map((p: any) => `${p.asset}: ${p.size} @ $${p.currentPrice} (PnL: $${p.pnl})`)
      .join('\n')

    const indicators = Object.entries(context.indicators)
      .map(([asset, data]: [string, any]) => {
        const rsi = data['5m']?.rsi?.toFixed(2) || 'N/A'
        const macd = data['5m']?.macd?.toFixed(4) || 'N/A'
        return `${asset}: RSI=${rsi}, MACD=${macd}`
      })
      .join('\n')

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
      "rationale": "explanation",
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
   * Get account address
   */
  getAddress(): string {
    return this.account.address
  }
}
