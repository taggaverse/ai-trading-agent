/**
 * Real Hyperliquid API Integration
 * Fetches actual account state, positions, and market data
 */

import logger from '../utils/logger.js'
import axios from 'axios'
import config from '../config/index.js'

export interface HLPosition {
  asset: string
  isBuy: boolean
  size: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
}

export interface HLAccountState {
  balance: number
  positions: HLPosition[]
  orders: any[]
}

export class HyperliquidAPI {
  private apiUrl: string
  private walletAddress: string

  constructor() {
    const isTestnet = config.HYPERLIQUID_TESTNET === 'true'
    this.apiUrl = isTestnet
      ? 'https://testnet.hyperliquid.exchange/api/v1'
      : 'https://api.hyperliquid.exchange/api/v1'
    
    this.walletAddress = config.HYPERLIQUID_WALLET_ADDRESS || '0x0'
    logger.info(`[HL API] Initialized: ${this.apiUrl}`)
  }

  /**
   * Fetch real account state from Hyperliquid
   */
  async getAccountState(): Promise<HLAccountState> {
    try {
      logger.info('[HL API] Fetching account state...')
      
      const response = await axios.post(
        `${this.apiUrl}/info`,
        {
          type: 'userState',
          user: this.walletAddress
        },
        { timeout: 10000 }
      )

      if (!response.data) {
        logger.warn('[HL API] No data returned')
        return { balance: 0, positions: [], orders: [] }
      }

      const data = response.data
      const balance = data.marginSummary?.accountValue || 0
      
      const positions: HLPosition[] = (data.assetPositions || []).map((pos: any) => ({
        asset: pos.coin,
        isBuy: pos.szi > 0,
        size: Math.abs(pos.szi),
        entryPrice: pos.entryPx || 0,
        currentPrice: pos.markPx || 0,
        pnl: pos.unrealizedPnl || 0,
        pnlPercent: pos.unrealizedPnlPercent || 0
      }))

      logger.info(`[HL API] Balance: $${balance.toFixed(2)}, Positions: ${positions.length}`)
      
      return {
        balance,
        positions,
        orders: data.openOrders || []
      }
    } catch (error) {
      logger.error('[HL API] Failed to fetch account state:', error)
      return { balance: 0, positions: [], orders: [] }
    }
  }

  /**
   * Fetch market data for an asset
   */
  async getMarketData(asset: string): Promise<any> {
    try {
      logger.info(`[HL API] Fetching market data for ${asset}...`)
      
      const response = await axios.post(
        `${this.apiUrl}/info`,
        {
          type: 'candles',
          req: {
            coin: asset,
            interval: '5m',
            startTime: Date.now() - 24 * 60 * 60 * 1000,
            endTime: Date.now()
          }
        },
        { timeout: 10000 }
      )

      return response.data || []
    } catch (error) {
      logger.error(`[HL API] Failed to fetch market data for ${asset}:`, error)
      return []
    }
  }

  /**
   * Get funding rate for an asset
   */
  async getFundingRate(asset: string): Promise<number> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/info`,
        {
          type: 'fundingHistory',
          coin: asset,
          startTime: Date.now() - 60 * 60 * 1000,
          endTime: Date.now()
        },
        { timeout: 10000 }
      )

      if (response.data && response.data.length > 0) {
        return response.data[response.data.length - 1].fundingRate || 0
      }
      return 0
    } catch (error) {
      logger.error(`[HL API] Failed to fetch funding rate for ${asset}:`, error)
      return 0
    }
  }

  /**
   * Get user state (alias for getAccountState for compatibility)
   */
  async getUserState(): Promise<HLAccountState> {
    return this.getAccountState()
  }

  /**
   * Place an order (stub - requires wallet signing)
   */
  async placeOrder(asset: string, isBuy: boolean, size: number, price?: number): Promise<any> {
    logger.warn(`[HL API] placeOrder called but not yet implemented for ${asset}`)
    return { success: false, error: 'Not implemented' }
  }

  /**
   * Close a position (stub - requires wallet signing)
   */
  async closePosition(asset: string): Promise<any> {
    logger.warn(`[HL API] closePosition called but not yet implemented for ${asset}`)
    return { success: false, error: 'Not implemented' }
  }

  /**
   * Get current price for an asset
   */
  async getCurrentPrice(asset: string): Promise<number> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/info`,
        {
          type: 'lastPrice',
          coin: asset
        },
        { timeout: 10000 }
      )

      return response.data?.price || 0
    } catch (error) {
      logger.error(`[HL API] Failed to fetch price for ${asset}:`, error)
      return 0
    }
  }
}
