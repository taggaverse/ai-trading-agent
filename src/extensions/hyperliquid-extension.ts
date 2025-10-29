/**
 * Hyperliquid Extension for Daydreams
 * Provides access to Hyperliquid API and technical indicators
 */

import logger from '../utils/logger.js'

// These will be injected at runtime
export interface HyperliquidAPI {
  placeOrder: (asset: string, isBuy: boolean, size: number, price?: number) => Promise<any>
  closePosition: (asset: string) => Promise<any>
  getUserState: () => Promise<any>
  getCurrentPrice: (asset: string) => Promise<number>
  getFundingRate: (asset: string) => Promise<number>
}

export interface IndicatorsClient {
  getIndicators: (asset: string, timeframe: string) => Promise<any>
}

export interface HyperliquidExtensionConfig {
  privateKey: string
  tapiKey: string
  network?: 'mainnet' | 'testnet'
}

export function hyperliquidExtension(
  hyperliquidAPI: HyperliquidAPI,
  indicatorsClient: IndicatorsClient,
  config: HyperliquidExtensionConfig
) {
  try {
    logger.info('✓ Hyperliquid extension initialized')

    return {
      name: 'hyperliquid',
      hyperliquid: hyperliquidAPI,
      indicators: indicatorsClient,
      config
    }
  } catch (error) {
    logger.error('Failed to initialize Hyperliquid extension:', error)
    throw error
  }
}

export type HyperliquidExtension = ReturnType<typeof hyperliquidExtension>
