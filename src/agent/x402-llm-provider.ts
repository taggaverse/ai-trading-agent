/**
 * x402 LLM Provider
 * Generic LLM provider using Daydreams Router with x402 payments
 * Can be used as a fallback when OpenAI API key is not configured
 * 
 * Usage:
 * const provider = new X402LLMProvider()
 * const response = await provider.call([
 *   { role: 'system', content: 'You are a helpful assistant' },
 *   { role: 'user', content: 'Hello!' }
 * ])
 */

import logger from '../utils/logger.js'
import axios from 'axios'
import { X402PaymentClient } from './x402-payment-client.js'
import config from '../config/index.js'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class X402LLMProvider {
  private paymentClient: X402PaymentClient
  private routerUrl: string
  private costPerCall: number = 0.1 // $0.10 USDC per LLM call
  private model: string = 'google-vertex/gemini-2.5-flash' // Default model

  constructor(model?: string) {
    this.paymentClient = new X402PaymentClient()
    this.routerUrl = config.DREAMS_ROUTER_URL || 'https://router.daydreams.systems'
    if (model) {
      this.model = model
    }
    logger.info(`[x402 LLM Provider] Initialized with router: ${this.routerUrl}`)
    logger.info(`[x402 LLM Provider] Model: ${this.model}`)
  }

  /**
   * Call LLM via Dreams Router with x402 payment
   * Generic method for any LLM request
   */
  async call(
    messages: LLMMessage[],
    options?: {
      temperature?: number
      maxTokens?: number
      model?: string
    }
  ): Promise<LLMResponse> {
    try {
      logger.info(`[x402 LLM Provider] Calling Dreams Router with x402 payment ($${this.costPerCall})...`)

      // Check balance before calling
      const hasBalance = await this.paymentClient.hasSufficientBalance(this.costPerCall)
      if (!hasBalance) {
        logger.error(`[x402 LLM Provider] Insufficient USDC balance for LLM call`)
        throw new Error('Insufficient USDC balance')
      }

      // Generate x402 payment header
      logger.info('[x402 LLM Provider] Generating x402 payment header...')
      const paymentHeader = await this.paymentClient.generatePaymentHeader(this.costPerCall)

      // Call Dreams Router
      logger.info('[x402 LLM Provider] Sending request to Dreams Router...')
      const response = await axios.post(
        `${this.routerUrl}/v1/chat/completions`,
        {
          model: options?.model || this.model,
          messages: messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Payment': paymentHeader
          },
          timeout: 60000
        }
      )

      logger.info('[x402 LLM Provider] Response received from Dreams Router')

      // Extract response
      const content = response.data.choices?.[0]?.message?.content
      if (!content) {
        logger.warn('[x402 LLM Provider] Empty response from Dreams Router')
        throw new Error('Empty response from LLM')
      }

      logger.info(`[x402 LLM Provider] USDC spent: $${this.costPerCall}`)

      return {
        content,
        model: options?.model || this.model,
        usage: response.data.usage
      }
    } catch (error) {
      logger.error('[x402 LLM Provider] Failed to call Dreams Router:', error)
      throw error
    }
  }

  /**
   * Simple text completion (convenience method)
   */
  async complete(
    prompt: string,
    options?: {
      temperature?: number
      maxTokens?: number
      model?: string
    }
  ): Promise<string> {
    const response = await this.call(
      [{ role: 'user', content: prompt }],
      options
    )
    return response.content
  }

  /**
   * Chat with system prompt (convenience method)
   */
  async chat(
    systemPrompt: string,
    userMessage: string,
    options?: {
      temperature?: number
      maxTokens?: number
      model?: string
    }
  ): Promise<string> {
    const response = await this.call(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      options
    )
    return response.content
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

  /**
   * Set cost per call (in USDC)
   */
  setCostPerCall(cost: number): void {
    this.costPerCall = cost
    logger.info(`[x402 LLM Provider] Cost per call updated to $${cost}`)
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    this.model = model
    logger.info(`[x402 LLM Provider] Model updated to ${model}`)
  }
}

/**
 * Factory function to create x402 LLM provider
 * Can be used as a fallback when OpenAI API is not configured
 */
export function createX402LLMProvider(model?: string): X402LLMProvider {
  logger.info('[x402 LLM Provider] Creating x402 LLM provider (fallback for missing OpenAI API key)')
  return new X402LLMProvider(model)
}

/**
 * Adapter to make x402 provider compatible with OpenAI SDK
 * Usage: const openai = new OpenAI({ apiKey: 'dummy', defaultHeaders: { 'X-Payment': ... } })
 */
export class X402OpenAIAdapter {
  private provider: X402LLMProvider

  constructor(model?: string) {
    this.provider = new X402LLMProvider(model)
  }

  /**
   * OpenAI-compatible chat completion
   */
  async createChatCompletion(params: {
    messages: LLMMessage[]
    temperature?: number
    max_tokens?: number
    model?: string
  }): Promise<{ choices: Array<{ message: { content: string } }> }> {
    const response = await this.provider.call(params.messages, {
      temperature: params.temperature,
      maxTokens: params.max_tokens,
      model: params.model
    })

    return {
      choices: [
        {
          message: {
            content: response.content
          }
        }
      ]
    }
  }
}
