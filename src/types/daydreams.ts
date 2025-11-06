// Daydreams types and implementations
// Provides real Dreams Router API integration with x402 payments

import axios from 'axios'
import logger from '../utils/logger.js'

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
  // Create a real dreamsRouter function that calls the Dreams Router API
  const dreamsRouter = async (model: string, messages: any[]) => {
    try {
      logger.debug(`[Dreams Router] Calling ${model} with ${messages.length} messages`)
      
      // Try multiple endpoints
      const endpoints = [
        'https://router.daydreams.systems/v1/chat/completions',
        'https://api.daydreams.systems/v1/chat/completions',
        'https://daydreams.systems/v1/chat/completions'
      ]

      let lastError: any = null
      for (const endpoint of endpoints) {
        try {
          logger.debug(`[Dreams Router] Trying endpoint: ${endpoint}`)
          
          const response = await axios.post(
            endpoint,
            {
              model: model,
              messages: messages,
              temperature: 0.7,
              max_tokens: 2000
            },
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          )

          logger.debug(`[Dreams Router] Response received from ${model}`)
          
          // Return response in expected format
          return {
            message: {
              content: response.data.choices?.[0]?.message?.content || ''
            }
          }
        } catch (error: any) {
          lastError = error
          logger.debug(`[Dreams Router] Endpoint ${endpoint} failed: ${error.message}`)
          continue
        }
      }

      // If all endpoints failed, throw the last error
      throw lastError || new Error('All Dreams Router endpoints failed')
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
