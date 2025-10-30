/**
 * Base Chain API Integration
 * Handles spot trading and balance management on Base
 */

import logger from '../utils/logger.js'
import { ethers } from 'ethers'
import config from '../config/index.js'

export interface BaseBalance {
  eth: number
  usdc: number
  tokens: Record<string, number>
}

export interface BasePosition {
  token: string
  balance: number
  value: number
}

export interface BaseAccountState {
  balance: BaseBalance
  positions: BasePosition[]
  nativeBalance: number
}

// USDC contract address on Base
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// USDC ABI (minimal)
const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)'
]

export class BaseAPI {
  private provider: ethers.Provider
  private wallet: ethers.Wallet
  private walletAddress: string

  constructor() {
    const rpcUrl = config.BASE_RPC_URL
    const privateKey = config.BASE_PRIVATE_KEY

    this.provider = new ethers.JsonRpcProvider(rpcUrl)
    this.wallet = new ethers.Wallet(privateKey, this.provider)
    this.walletAddress = this.wallet.address

    logger.info(`[Base API] Initialized: ${rpcUrl}`)
    logger.info(`[Base API] Wallet: ${this.walletAddress}`)
  }

  /**
   * Get account state (balance and positions)
   */
  async getAccountState(): Promise<BaseAccountState> {
    try {
      logger.info('[Base API] Fetching account state...')

      // Get native ETH balance
      const ethBalance = await this.provider.getBalance(this.walletAddress)
      const nativeBalance = parseFloat(ethers.formatEther(ethBalance))

      // Get USDC balance
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, this.provider)
      const usdcBalance = await usdcContract.balanceOf(this.walletAddress)
      const usdcDecimals = await usdcContract.decimals()
      const usdcAmount = parseFloat(ethers.formatUnits(usdcBalance, usdcDecimals))

      const balance: BaseBalance = {
        eth: nativeBalance,
        usdc: usdcAmount,
        tokens: {
          ETH: nativeBalance,
          USDC: usdcAmount
        }
      }

      // Create positions array
      const positions: BasePosition[] = []
      if (nativeBalance > 0) {
        positions.push({
          token: 'ETH',
          balance: nativeBalance,
          value: nativeBalance // Would need price oracle for real value
        })
      }
      if (usdcAmount > 0) {
        positions.push({
          token: 'USDC',
          balance: usdcAmount,
          value: usdcAmount
        })
      }

      logger.info(`[Base API] ETH: ${nativeBalance.toFixed(4)}, USDC: ${usdcAmount.toFixed(2)}`)

      return {
        balance,
        positions,
        nativeBalance
      }
    } catch (error) {
      logger.error('[Base API] Failed to fetch account state:', error)
      return {
        balance: { eth: 0, usdc: 0, tokens: {} },
        positions: [],
        nativeBalance: 0
      }
    }
  }

  /**
   * Get USDC balance (for x402 payments)
   */
  async getUSDCBalance(): Promise<number> {
    try {
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, this.provider)
      const balance = await usdcContract.balanceOf(this.walletAddress)
      const decimals = await usdcContract.decimals()
      return parseFloat(ethers.formatUnits(balance, decimals))
    } catch (error) {
      logger.error('[Base API] Failed to fetch USDC balance:', error)
      return 0
    }
  }

  /**
   * Get ETH balance
   */
  async getETHBalance(): Promise<number> {
    try {
      const balance = await this.provider.getBalance(this.walletAddress)
      return parseFloat(ethers.formatEther(balance))
    } catch (error) {
      logger.error('[Base API] Failed to fetch ETH balance:', error)
      return 0
    }
  }

  /**
   * Send USDC to an address
   */
  async sendUSDC(to: string, amount: number): Promise<string> {
    try {
      logger.info(`[Base API] Sending ${amount} USDC to ${to}...`)

      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, this.wallet)
      const amountWei = ethers.parseUnits(amount.toString(), 6) // USDC has 6 decimals

      const tx = await usdcContract.transfer(to, amountWei)
      const receipt = await tx.wait()

      logger.info(`[Base API] Transfer complete: ${receipt?.hash}`)
      return receipt?.hash || ''
    } catch (error) {
      logger.error(`[Base API] Failed to send USDC:`, error)
      throw error
    }
  }

  /**
   * Approve USDC spending
   */
  async approveUSDC(spender: string, amount: number): Promise<string> {
    try {
      logger.info(`[Base API] Approving ${amount} USDC for ${spender}...`)

      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, this.wallet)
      const amountWei = ethers.parseUnits(amount.toString(), 6)

      const tx = await usdcContract.approve(spender, amountWei)
      const receipt = await tx.wait()

      logger.info(`[Base API] Approval complete: ${receipt?.hash}`)
      return receipt?.hash || ''
    } catch (error) {
      logger.error(`[Base API] Failed to approve USDC:`, error)
      throw error
    }
  }

  /**
   * Get gas price
   */
  async getGasPrice(): Promise<number> {
    try {
      const feeData = await this.provider.getFeeData()
      return parseFloat(ethers.formatUnits(feeData.gasPrice || 0, 'gwei'))
    } catch (error) {
      logger.error('[Base API] Failed to fetch gas price:', error)
      return 0
    }
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.walletAddress
  }
}
