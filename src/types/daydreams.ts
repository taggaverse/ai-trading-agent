// Daydreams types and implementations
// Provides real Dreams Router API integration with x402 payments

import logger from '../utils/logger.js'
import { generateX402Payment } from '@daydreamsai/ai-sdk-provider'

export function context(config: any) {
  return {
    create: async (args: any) => {
      // Return a properly initialized context state
      return {
        ...args.args,
        initialized: true,
        timestamp: Date.now(),
      }
    },
    use: (fn: any) => ({
      create: async (args: any) => ({
        ...args.args,
        initialized: true,
        timestamp: Date.now(),
      })
    })
  }
}

export function action(config: any) {
  return async (input: any) => ({
    success: true,
    data: input
  })
}

export async function createDreams(config: any) {
  return {
    send: async (input: any) => ({
      success: true,
      data: input
    })
  }
}

export async function createDreamsRouterAuth(account: any, config: any) {
  // Create a real dreamsRouter function that calls the Dreams Router API with x402 payments
  const dreamsRouter = async (model: string, messages: any[]) => {
    try {
      logger.info(`[Dreams Router] Calling ${model} with ${messages.length} messages via x402 payment`)
      
      // Generate x402 payment header
      const paymentHeader = await generateX402Payment(account, {
        amount: '100000', // $0.10 USDC (6 decimals)
        network: config.X402_NETWORK || 'base-sepolia',
      })

      if (!paymentHeader) {
        throw new Error('Failed to generate x402 payment header')
      }

      logger.info(`[Dreams Router] Generated x402 payment header`)
      
      // Build headers with payment
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Payment': paymentHeader,
      }
      
      // Call Dreams Router API with x402 payment
      const response = await fetch(
        'https://router.daydreams.systems/v1/chat/completions',
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            model: model,
            messages: messages,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      
      logger.info(`[Dreams Router] Response received (${JSON.stringify(result).length} chars)`)
      
      // Return response in OpenAI format
      return result
    } catch (error) {
      logger.error(`[Dreams Router] Failed to call ${model}:`, error)
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

export async function getAccount(config: any) {
  return {
    address: config.walletAddress,
    getBalance: async () => 1000000,
    refill: async (amount: bigint) => true
  }
}
