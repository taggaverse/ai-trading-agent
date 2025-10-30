/**
 * Unified Portfolio Manager
 * Manages balances and positions across Hyperliquid + Base
 */

import logger from '../utils/logger.js'
import { HyperliquidAPI } from './hyperliquid-api.js'
import { BaseAPI } from './base-api.js'

export interface UnifiedPortfolio {
  totalBalance: number
  hyperliquid: {
    balance: number
    positions: any[]
    percentage: number
  }
  base: {
    eth: number
    usdc: number
    positions: any[]
    percentage: number
  }
  assets: Record<string, {
    chain: string
    balance: number
    value: number
  }>
  timestamp: number
}

export class PortfolioManager {
  private hlAPI: HyperliquidAPI
  private baseAPI: BaseAPI

  constructor(hlAPI: HyperliquidAPI, baseAPI: BaseAPI) {
    this.hlAPI = hlAPI
    this.baseAPI = baseAPI
  }

  /**
   * Get unified portfolio across both chains
   */
  async getPortfolio(): Promise<UnifiedPortfolio> {
    try {
      logger.info('[Portfolio] Fetching unified portfolio...')

      // Fetch from both chains in parallel
      const [hlState, baseState] = await Promise.all([
        this.hlAPI.getAccountState(),
        this.baseAPI.getAccountState()
      ])

      // Calculate totals
      const hlBalance = hlState.balance
      const baseBalance = baseState.balance.usdc + baseState.balance.eth
      const totalBalance = hlBalance + baseBalance

      // Calculate percentages
      const hlPercentage = totalBalance > 0 ? (hlBalance / totalBalance) * 100 : 0
      const basePercentage = totalBalance > 0 ? (baseBalance / totalBalance) * 100 : 0

      // Build unified assets map
      const assets: Record<string, any> = {}

      // Add Hyperliquid positions
      for (const pos of hlState.positions) {
        const key = `${pos.asset}-HL`
        assets[key] = {
          chain: 'hyperliquid',
          balance: pos.size,
          value: pos.currentPrice * pos.size,
          asset: pos.asset,
          isBuy: pos.isBuy,
          pnl: pos.pnl
        }
      }

      // Add Base positions
      if (baseState.balance.eth > 0) {
        assets['ETH-BASE'] = {
          chain: 'base',
          balance: baseState.balance.eth,
          value: baseState.balance.eth, // Would need price oracle
          asset: 'ETH'
        }
      }
      if (baseState.balance.usdc > 0) {
        assets['USDC-BASE'] = {
          chain: 'base',
          balance: baseState.balance.usdc,
          value: baseState.balance.usdc,
          asset: 'USDC'
        }
      }

      const portfolio: UnifiedPortfolio = {
        totalBalance,
        hyperliquid: {
          balance: hlBalance,
          positions: hlState.positions,
          percentage: hlPercentage
        },
        base: {
          eth: baseState.balance.eth,
          usdc: baseState.balance.usdc,
          positions: baseState.positions,
          percentage: basePercentage
        },
        assets,
        timestamp: Date.now()
      }

      logger.info(`[Portfolio] Total: $${totalBalance.toFixed(2)} (HL: ${hlPercentage.toFixed(1)}%, Base: ${basePercentage.toFixed(1)}%)`)

      return portfolio
    } catch (error) {
      logger.error('[Portfolio] Failed to fetch portfolio:', error)
      return {
        totalBalance: 0,
        hyperliquid: { balance: 0, positions: [], percentage: 0 },
        base: { eth: 0, usdc: 0, positions: [], percentage: 0 },
        assets: {},
        timestamp: Date.now()
      }
    }
  }

  /**
   * Get total USDC balance across all chains
   */
  async getTotalUSDCBalance(): Promise<number> {
    try {
      const [hlState, baseUsdc] = await Promise.all([
        this.hlAPI.getAccountState(),
        this.baseAPI.getUSDCBalance()
      ])

      return hlState.balance + baseUsdc
    } catch (error) {
      logger.error('[Portfolio] Failed to fetch total USDC:', error)
      return 0
    }
  }

  /**
   * Get assets agent actually holds
   */
  async getHeldAssets(): Promise<string[]> {
    try {
      const portfolio = await this.getPortfolio()
      const assets = new Set<string>()

      // Add Hyperliquid positions
      for (const pos of portfolio.hyperliquid.positions) {
        assets.add(pos.asset)
      }

      // Add Base tokens if balance > 0
      if (portfolio.base.eth > 0) assets.add('ETH')
      if (portfolio.base.usdc > 0) assets.add('USDC')

      return Array.from(assets)
    } catch (error) {
      logger.error('[Portfolio] Failed to get held assets:', error)
      return []
    }
  }

  /**
   * Get balance for a specific asset across all chains
   */
  async getAssetBalance(asset: string): Promise<number> {
    try {
      const portfolio = await this.getPortfolio()
      let balance = 0

      // Check Hyperliquid
      for (const pos of portfolio.hyperliquid.positions) {
        if (pos.asset === asset) {
          balance += pos.size
        }
      }

      // Check Base
      if (asset === 'ETH') {
        balance += portfolio.base.eth
      } else if (asset === 'USDC') {
        balance += portfolio.base.usdc
      }

      return balance
    } catch (error) {
      logger.error(`[Portfolio] Failed to get ${asset} balance:`, error)
      return 0
    }
  }
}
