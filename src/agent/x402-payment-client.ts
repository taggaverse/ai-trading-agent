/**
 * x402 Payment Client
 * Generates x402 payment headers for Dreams Router API calls
 * Deducts USDC from wallet for each API call
 */

import logger from '../utils/logger.js'
import { privateKeyToAccount, signMessage } from 'viem/accounts'
import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'
import config from '../config/index.js'

/**
 * Generate x402 payment header using EIP-712 signing
 */
async function generateX402Payment(account: any, options: any): Promise<string> {
  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const amount = options.amount
    const network = options.network || 'base'
    
    // Create message to sign
    const message = `x402:${network}:${amount}:${timestamp}`
    
    // Sign the message using account's sign method
    const signature = await account.signMessage({
      message
    })
    
    // Return x402 payment header format
    const paymentHeader = `${account.address}:${amount}:${timestamp}:${signature}`
    logger.info(`[x402] Generated payment header: ${paymentHeader.substring(0, 50)}...`)
    return paymentHeader
  } catch (error) {
    logger.error('[x402] Failed to generate payment:', error)
    throw error
  }
}

export class X402PaymentClient {
  private account: any
  private publicClient: any
  private network: 'base' | 'base-sepolia'

  constructor() {
    this.network = (config.X402_NETWORK as 'base' | 'base-sepolia') || 'base'
    
    // Initialize account from private key
    const privateKey = config.X402_PRIVATE_KEY as `0x${string}`
    this.account = privateKeyToAccount(privateKey)

    // Initialize viem client for Base chain
    const rpcUrl = 'https://mainnet.base.org'
    
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl)
    })

    logger.info(`[x402] Initialized with account: ${this.account.address}`)
    logger.info(`[x402] Network: ${this.network}`)
  }

  /**
   * Generate x402 payment header for API call
   */
  async generatePaymentHeader(amountUsdc: number): Promise<string> {
    try {
      logger.info(`[x402] Generating payment header for ${amountUsdc} USDC...`)

      const paymentHeader = await generateX402Payment(this.account, {
        amount: Math.floor(amountUsdc * 1_000_000).toString(), // Convert to 6 decimals
        network: this.network
      })

      if (!paymentHeader) {
        throw new Error('Failed to generate x402 payment header')
      }

      logger.info(`[x402] Payment header generated successfully`)
      return paymentHeader as string
    } catch (error) {
      logger.error('[x402] Failed to generate payment header:', error)
      throw error
    }
  }

  /**
   * Get wallet USDC balance from Base chain
   */
  async getUSDCBalance(): Promise<number> {
    try {
      // USDC on Base Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48
      const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48' as `0x${string}`
      
      // Standard ERC20 ABI for balanceOf
      const abi = [
        {
          constant: true,
          inputs: [{ name: '_owner', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: 'balance', type: 'uint256' }],
          type: 'function'
        }
      ] as const

      const balance = await this.publicClient.readContract({
        address: USDC_ADDRESS,
        abi,
        functionName: 'balanceOf',
        args: [this.account.address as `0x${string}`]
      })

      const balanceUsdc = Number(balance) / 1_000_000 // Convert from 6 decimals
      logger.info(`[x402] USDC Balance: $${balanceUsdc.toFixed(2)}`)
      return balanceUsdc
    } catch (error) {
      logger.error('[x402] Failed to get USDC balance:', error)
      // Return 0 on error - don't allow trading without verified balance
      return 0
    }
  }

  /**
   * Check if sufficient balance for payment
   */
  async hasSufficientBalance(amountUsdc: number): Promise<boolean> {
    try {
      const balance = await this.getUSDCBalance()
      const hasSufficient = balance >= amountUsdc
      
      if (!hasSufficient) {
        logger.warn(`[x402] Insufficient balance: ${balance.toFixed(2)} < ${amountUsdc.toFixed(2)}`)
      }
      
      return hasSufficient
    } catch (error) {
      logger.error('[x402] Error checking balance:', error)
      return false
    }
  }

  /**
   * Get account address
   */
  getAddress(): string {
    return this.account.address
  }

  /**
   * Get network
   */
  getNetwork(): string {
    return this.network
  }
}
