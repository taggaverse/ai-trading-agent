/**
 * x402 Payment Client
 * Generates x402 payment headers for Dreams Router API calls
 * Deducts USDC from wallet for each API call
 */

import logger from '../utils/logger.js'
import { privateKeyToAccount, signMessage } from 'viem/accounts'
import { createPublicClient, createWalletClient, http, getAddress } from 'viem'
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
  private balanceCache: { value: number; timestamp: number } | null = null
  private readonly CACHE_TTL = 60000 // 60 seconds

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
   * Get wallet USDC balance from Base chain with caching and fallback
   */
  async getUSDCBalance(): Promise<number> {
    try {
      const now = Date.now()
      
      // Return cached balance if fresh
      if (this.balanceCache && now - this.balanceCache.timestamp < this.CACHE_TTL) {
        logger.info(`[x402] USDC Balance (cached): $${this.balanceCache.value.toFixed(2)}`)
        return this.balanceCache.value
      }

      // Try RPC call first (primary method)
      try {
        const balance = await this.fetchBalanceFromRPC()
        this.balanceCache = { value: balance, timestamp: now }
        logger.info(`[x402] USDC Balance (RPC): $${balance.toFixed(2)}`)
        return balance
      } catch (rpcError) {
        logger.warn('[x402] RPC call failed, trying Etherscan fallback...')
        
        // Fallback to Etherscan API
        const balance = await this.fetchBalanceFromEtherscan()
        this.balanceCache = { value: balance, timestamp: now }
        logger.info(`[x402] USDC Balance (Etherscan): $${balance.toFixed(2)}`)
        return balance
      }
    } catch (error) {
      logger.error('[x402] Failed to get USDC balance:', error)
      // Return 0 on error - don't allow trading without verified balance
      return 0
    }
  }

  /**
   * Fetch USDC balance from RPC (primary method)
   */
  private async fetchBalanceFromRPC(): Promise<number> {
    try {
      // USDC on Base Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48
      // Use getAddress to normalize and validate checksums
      const USDC_ADDRESS = getAddress('0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48')
      const walletAddress = getAddress(this.account.address)
      
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
        args: [walletAddress]
      })

      return Number(balance) / 1_000_000 // Convert from 6 decimals
    } catch (error) {
      throw new Error(`RPC fetch failed: ${error}`)
    }
  }

  /**
   * Fetch USDC balance from Etherscan API (fallback method)
   */
  private async fetchBalanceFromEtherscan(): Promise<number> {
    try {
      const BASESCAN_API_KEY = (config as any).BASESCAN_API_KEY
      if (!BASESCAN_API_KEY) {
        throw new Error('BASESCAN_API_KEY not configured')
      }

      const response = await fetch(
        `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=0x833589fCD6eDb6E08f4c7C32D4f71b1566dA7c48&address=${this.account.address}&tag=latest&apikey=${BASESCAN_API_KEY}`
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json() as any
      
      if (data.status !== '1') {
        throw new Error(`Etherscan error: ${data.message}`)
      }

      return Number(data.result) / 1_000_000 // Convert from 6 decimals
    } catch (error) {
      throw new Error(`Etherscan fetch failed: ${error}`)
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
