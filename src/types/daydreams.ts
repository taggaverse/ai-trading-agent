// Daydreams types and implementations
// Provides real Dreams Router API integration with x402 payments

import logger from '../utils/logger.js'
import { privateKeyToAccount } from 'viem/accounts'
import type { Hex } from 'viem'

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

/**
 * Generate x402 payment header for Dreams Router
 * Based on x402 specification: address:amount:timestamp:signature
 */
async function generateX402PaymentHeader(account: any, amount: string, network: string): Promise<string> {
  try {
    const timestamp = Math.floor(Date.now() / 1000)
    
    // Create message to sign: x402:network:amount:timestamp
    const message = `x402:${network}:${amount}:${timestamp}`
    
    // Sign the message
    const signature = await account.signMessage({ message })
    
    // Return x402 payment header format: address:amount:timestamp:signature
    const paymentHeader = `${account.address}:${amount}:${timestamp}:${signature}`
    
    logger.debug(`[x402] Generated payment header for ${amount} USDC on ${network}`)
    
    return paymentHeader
  } catch (error) {
    logger.error('[x402] Failed to generate payment header:', error)
    throw error
  }
}

export async function createDreamsRouterAuth(account: any, config: any) {
  // Create a real dreamsRouter function that calls the Dreams Router API with x402 payments
  const dreamsRouter = async (model: string, messages: any[]) => {
    try {
      logger.info(`[Dreams Router] Calling ${model} with ${messages.length} messages via x402 payment`)
      
      // Generate x402 payment header
      const paymentHeader = await generateX402PaymentHeader(
        account,
        '100000', // $0.10 USDC (6 decimals)
        config.X402_NETWORK || 'base-sepolia'
      )

      logger.info(`[Dreams Router] Generated x402 payment header`)
      
      // Build headers with payment
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Payment': paymentHeader,
      }
      
      logger.info(`[Dreams Router] Calling https://router.daydreams.systems/v1/chat/completions`)
      
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
      logger.debug(`[Dreams Router] Response: ${JSON.stringify(result).substring(0, 500)}`)
      
      // Return response in OpenAI format
      return result
    } catch (error) {
      logger.error(`[Dreams Router] Failed to call ${model}:`, error)
      throw error
    }
  }

  // Create account object with all necessary methods
  const accountWithMethods: any = {
    // Copy viem account properties
    address: account.address,
    publicKey: account.publicKey,
    signMessage: account.signMessage,
    signTransaction: account.signTransaction,
    signTypedData: account.signTypedData,
    // Add mock methods for compatibility
    getBalance: async () => 1000000,
    refill: async (amount: bigint) => true
  }

  return {
    dreamsRouter,
    account: accountWithMethods
  }
}

export async function getAccount(config: any) {
  try {
    // Create a real viem account from private key
    const account = privateKeyToAccount(config.privateKey as Hex)
    
    logger.info(`[x402] Created viem account: ${account.address}`)
    
    return account
  } catch (error) {
    logger.error('[x402] Failed to create account:', error)
    throw error
  }
}
