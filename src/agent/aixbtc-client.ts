/**
 * aixbtc Market Insights Client
 * Fetches market analysis and sentiment via x402 payments
 */

import logger from '../utils/logger.js'
import axios from 'axios'
import { privateKeyToAccount } from 'viem/accounts'
import config from '../config/index.js'

export interface MarketInsight {
  asset: string
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  analysis: string
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  confidence: number
  timestamp: number
}

export class AixbtcClient {
  private account: any
  private network: string
  private apiUrl: string = 'https://api.aixbtc.dev/v1'

  constructor() {
    this.network = config.X402_NETWORK || 'base-sepolia'
    
    // Initialize account from private key
    const privateKey = config.X402_PRIVATE_KEY as `0x${string}`
    this.account = privateKeyToAccount(privateKey)

    logger.info(`[aixbtc] Initialized with account: ${this.account.address}`)
  }

  /**
   * Get market insights for an asset via x402
   */
  async getMarketInsights(asset: string): Promise<MarketInsight> {
    try {
      logger.info(`[aixbtc] Fetching market insights for ${asset}...`)

      // TODO: Generate x402 payment header for aixbtc
      // For now, make unauthenticated request to demonstrate integration
      
      const response = await axios.get(
        `${this.apiUrl}/insights/${asset}`,
        {
          headers: {
            'Content-Type': 'application/json',
            // 'X-Payment': paymentHeader, // TODO: Add x402 payment
          },
          timeout: 30000
        }
      )

      const data = response.data

      const insight: MarketInsight = {
        asset,
        sentiment: data.sentiment || 'NEUTRAL',
        analysis: data.analysis || 'No analysis available',
        riskLevel: data.riskLevel || 'MEDIUM',
        confidence: data.confidence || 0.5,
        timestamp: Date.now()
      }

      logger.info(`[aixbtc] Insights received: ${insight.sentiment}`)
      return insight
    } catch (error) {
      logger.error(`[aixbtc] Failed to fetch insights for ${asset}:`, error)
      
      // Return default insight on error
      return {
        asset,
        sentiment: 'NEUTRAL',
        analysis: 'Unable to fetch market analysis at this time',
        riskLevel: 'MEDIUM',
        confidence: 0,
        timestamp: Date.now()
      }
    }
  }

  /**
   * Get sentiment for multiple assets
   */
  async getMultipleSentiments(assets: string[]): Promise<Record<string, MarketInsight>> {
    const insights: Record<string, MarketInsight> = {}

    for (const asset of assets) {
      insights[asset] = await this.getMarketInsights(asset)
    }

    return insights
  }

  /**
   * Get account address
   */
  getAddress(): string {
    return this.account.address
  }
}
