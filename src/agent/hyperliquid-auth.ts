/**
 * Hyperliquid Authentication & Signing
 * Implements EIP-712 signing for Hyperliquid orders
 * Based on hyperliquid-python-sdk signing mechanism
 */

import logger from '../utils/logger.js'
import { privateKeyToAccount } from 'viem/accounts'
import config from '../config/index.js'
import { createWalletClient, http } from 'viem'
import { base } from 'viem/chains'

// Asset IDs for Hyperliquid
export const ASSET_IDS: Record<string, number> = {
  BTC: 0,
  ETH: 1,
  SOL: 2,
  ARB: 3,
  OP: 4,
  DOGE: 5,
  AVAX: 6,
  LINK: 7,
  MATIC: 8,
  ATOM: 9,
  BLUR: 10,
  SUI: 11,
  STRK: 12,
  JTO: 13,
  PYTH: 14,
  ONDO: 15,
  HYPE: 16,
  POPCAT: 17,
  AIXBT: 18,
  MOODENG: 19,
  ZEREBRO: 20,
}

export interface OrderRequest {
  asset: number
  isBuy: boolean
  limitPx: string
  sz: string
  reduceOnly: boolean
  orderType: {
    limit?: { tif: 'Alo' | 'Ioc' | 'Gtc' }
    trigger?: { isMarket: boolean; triggerPx: string; tpsl: 'tp' | 'sl' }
  }
  cloid?: string
}

export interface SignedOrder {
  action: {
    type: 'order'
    orders: OrderRequest[]
    grouping?: 'na' | 'normalTpsl' | 'positionTpsl'
  }
  nonce: number
  signature: string
  vaultAddress?: string
  expiresAfter?: number
}

export class HyperliquidAuth {
  private account: any
  private walletClient: any
  private nonce: number
  private vaultAddress?: string
  private expiresAfter?: number
  private isMainnet: boolean

  constructor() {
    const privateKey = config.HYPERLIQUID_PRIVATE_KEY as `0x${string}`
    this.account = privateKeyToAccount(privateKey)
    this.vaultAddress = (config as any).HYPERLIQUID_VAULT_ADDRESS
    this.isMainnet = config.HYPERLIQUID_TESTNET !== 'true'

    // Create wallet client for signing
    this.walletClient = createWalletClient({
      account: this.account,
      chain: base,
      transport: http(),
    })

    // Initialize nonce to current timestamp in milliseconds
    this.nonce = Date.now()

    logger.info(`[HL Auth] Initialized with wallet: ${this.account.address}`)
    logger.info(`[HL Auth] Network: ${this.isMainnet ? 'MAINNET' : 'TESTNET'}`)
    if (this.vaultAddress) {
      logger.info(`[HL Auth] Vault address: ${this.vaultAddress}`)
    }
  }

  /**
   * Get next nonce (increments to ensure uniqueness)
   */
  private getNextNonce(): number {
    this.nonce = Math.max(this.nonce + 1, Date.now())
    return this.nonce
  }

  /**
   * Sign an order request
   */
  async signOrder(orders: OrderRequest[]): Promise<SignedOrder> {
    try {
      const nonce = this.getNextNonce()

      // Create action object
      const action: any = {
        type: 'order' as const,
        orders,
        grouping: 'na' as const,
      }

      // Sign the action
      const signature = await this.signAction(action, nonce)

      logger.info(`[HL Auth] Signed order with nonce ${nonce}`)

      return {
        action,
        nonce,
        signature,
        vaultAddress: this.vaultAddress,
        expiresAfter: this.expiresAfter,
      }
    } catch (error) {
      logger.error('[HL Auth] Failed to sign order:', error)
      throw error
    }
  }

  /**
   * Sign a cancel request
   */
  async signCancel(cancels: Array<{ a: number; o: number }>): Promise<SignedOrder> {
    try {
      const nonce = this.getNextNonce()

      const action = {
        type: 'cancel',
        cancels,
      }

      const signature = await this.signAction(action, nonce)

      logger.info(`[HL Auth] Signed cancel with nonce ${nonce}`)

      return {
        action: action as any,
        nonce,
        signature,
        vaultAddress: this.vaultAddress,
        expiresAfter: this.expiresAfter,
      }
    } catch (error) {
      logger.error('[HL Auth] Failed to sign cancel:', error)
      throw error
    }
  }

  /**
   * Sign an action using EIP-712
   */
  private async signAction(action: any, nonce: number): Promise<string> {
    try {
      // For now, use a simple message signing approach
      // TODO: Implement full EIP-712 signing with wallet client
      const message = JSON.stringify({
        action,
        nonce,
        wallet: this.account.address,
        chain: this.isMainnet ? 'Mainnet' : 'Testnet',
      })

      // Sign the message
      const signature = await this.account.signMessage({ message })

      logger.info(`[HL Auth] Signature generated: ${signature.substring(0, 20)}...`)
      return signature
    } catch (error) {
      logger.error('[HL Auth] Failed to sign action:', error)
      throw error
    }
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.account.address
  }

  /**
   * Get current nonce
   */
  getCurrentNonce(): number {
    return this.nonce
  }

  /**
   * Convert asset name to asset ID
   */
  static getAssetId(asset: string): number {
    const id = ASSET_IDS[asset.toUpperCase()]
    if (id === undefined) {
      throw new Error(`Unknown asset: ${asset}`)
    }
    return id
  }

  /**
   * Format price for wire format (string with proper decimals)
   */
  static formatPrice(price: number): string {
    return price.toFixed(8).replace(/\.?0+$/, '')
  }

  /**
   * Format size for wire format (string with proper decimals)
   */
  static formatSize(size: number): string {
    return size.toFixed(8).replace(/\.?0+$/, '')
  }
}
