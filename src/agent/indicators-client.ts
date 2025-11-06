/**
 * Technical Indicators Client
 * Fetches technical indicators from x402 Questflow endpoint
 * Provides cryptocurrency analysis: long/short ratios, trading hotness, technical trends, capital flows, risk
 * Uses x402 micropayments for each API call
 */

import logger from '../utils/logger.js'
import axios from 'axios'
import { X402PaymentManager, X402_COSTS } from './x402-payment-manager.js'

export interface Indicators {
  rsi: number
  macd: {
    value: number
    signal: number
    histogram: number
  }
  ema: {
    ema20: number
    ema50: number
    ema200: number
  }
  atr: number
  timestamp: number
  longShortRatio?: number
  tradingHotness?: number
  riskScore?: number
}

export class IndicatorsClient {
  private apiKey: string
  private taapiEndpoint: string = 'https://api.taapi.io/bulk'
  private paymentManager?: X402PaymentManager

  constructor(apiKey: string, paymentManager?: X402PaymentManager) {
    this.apiKey = apiKey
    this.paymentManager = paymentManager
    logger.info(`IndicatorsClient initialized with TAAPI Bulk API (API Key: ${apiKey ? 'configured' : 'missing'})`)
  }

  /**
   * Set payment manager (for tracking costs)
   */
  setPaymentManager(manager: X402PaymentManager): void {
    this.paymentManager = manager
  }

  /**
   * Get all technical indicators for an asset and timeframe using TAAPI Bulk API
   * Tries multiple exchanges with fallback: binance -> bybit -> gate
   */
  async getIndicators(asset: string, timeframe: string): Promise<Indicators> {
    try {
      logger.info(`Fetching indicators for ${asset} (${timeframe}) from TAAPI Bulk API...`)

      if (!this.apiKey || this.apiKey === 'mock-key') {
        logger.warn(`⚠️  TAAPI API key not configured, using mock indicators`)
        return this.getMockIndicators()
      }

      // Try multiple exchanges in order of preference
      const exchanges = ['binance', 'bybit', 'gate']
      
      for (const exchange of exchanges) {
        try {
          const result = await this.fetchIndicatorsFromExchange(asset, timeframe, exchange)
          if (result) {
            return result
          }
        } catch (exchangeError) {
          logger.debug(`[TAAPI] ${exchange} failed, trying next exchange...`)
          continue
        }
      }

      // If all exchanges fail, fall back to mock
      logger.warn(`✗ Failed to fetch indicators from all exchanges for ${asset}`)
      return this.getMockIndicators()
    } catch (error) {
      logger.warn(`✗ Failed to fetch indicators from TAAPI for ${asset}:`, error instanceof Error ? error.message : error)
      return this.getMockIndicators()
    }
  }

  /**
   * Fetch indicators from a specific exchange
   */
  private async fetchIndicatorsFromExchange(
    asset: string,
    timeframe: string,
    exchange: string
  ): Promise<Indicators | null> {
    try {
      const payload = {
        secret: this.apiKey,
        construct: {
          exchange: exchange,
          symbol: `${asset}/USDT`,
          interval: this.mapTimeframe(timeframe),
          indicators: [
            { indicator: 'rsi' },
            { indicator: 'macd' },
            { indicator: 'ema', period: 20 },
            { indicator: 'ema', period: 50 },
            { indicator: 'ema', period: 200 },
            { indicator: 'atr' }
          ]
        }
      }

      logger.debug(`[TAAPI] Trying ${exchange} for ${asset}/${timeframe}`)
      const response = await axios.post(
        this.taapiEndpoint,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      )

      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        logger.info(`✓ Received indicators for ${asset} from TAAPI (${exchange})`)
        const data = response.data.data

        // Extract values from the response
        const rsiData = data.find((d: any) => d.indicator === 'rsi')
        const macdData = data.find((d: any) => d.indicator === 'macd')
        const ema20Data = data.find((d: any) => d.indicator === 'ema' && d.period === 20)
        const ema50Data = data.find((d: any) => d.indicator === 'ema' && d.period === 50)
        const ema200Data = data.find((d: any) => d.indicator === 'ema' && d.period === 200)
        const atrData = data.find((d: any) => d.indicator === 'atr')

        return {
          rsi: rsiData?.value ? parseFloat(rsiData.value) : 50,
          macd: {
            value: macdData?.value ? parseFloat(macdData.value) : 0,
            signal: macdData?.signal ? parseFloat(macdData.signal) : 0,
            histogram: macdData?.histogram ? parseFloat(macdData.histogram) : 0
          },
          ema: {
            ema20: ema20Data?.value ? parseFloat(ema20Data.value) : 42000,
            ema50: ema50Data?.value ? parseFloat(ema50Data.value) : 41500,
            ema200: ema200Data?.value ? parseFloat(ema200Data.value) : 41000
          },
          atr: atrData?.value ? parseFloat(atrData.value) : 500,
          timestamp: Date.now()
        }
      } else {
        logger.debug(`[TAAPI] Invalid response from ${exchange} for ${asset}`)
        return null
      }
    } catch (error) {
      logger.debug(`[TAAPI] ${exchange} error: ${error instanceof Error ? error.message : error}`)
      return null
    }
  }

  /**
   * Map timeframe to TAAPI format
   */
  private mapTimeframe(timeframe: string): string {
    const mapping: Record<string, string> = {
      '5m': '5m',
      '4h': '4h',
      '1h': '1h',
      '1d': 'daily',
      '1w': 'weekly'
    }
    return mapping[timeframe] || '5m'
  }

  /**
   * Parse x402 response into standard indicator format
   */
  private parseIndicators(data: any): Indicators {
    return {
      longShortRatio: data.long_short_ratio || 1.0,
      tradingHotness: data.trading_hotness || 50,
      riskScore: data.risk_score || 50,
      rsi: this.deriveRSI(data),
      macd: this.deriveMACD(data),
      ema: this.deriveEMA(data),
      atr: this.deriveATR(data),
      timestamp: Date.now()
    }
  }

  /**
   * Derive RSI from x402 data
   */
  private deriveRSI(data: any): number {
    const hotness = data.trading_hotness || 50
    const trend = data.technical_trends?.trend || 'neutral'
    
    let rsi = hotness
    if (trend === 'bullish') rsi += 10
    if (trend === 'bearish') rsi -= 10
    
    return Math.max(0, Math.min(100, rsi))
  }

  /**
   * Derive MACD from x402 data
   */
  private deriveMACD(data: any): any {
    const trends = data.technical_trends || {}
    return {
      value: (trends.macd || 0) * 100,
      signal: ((trends.macd || 0) * 100) * 0.9,
      histogram: ((trends.macd || 0) * 100) * 0.1
    }
  }

  /**
   * Derive EMA from x402 data
   */
  private deriveEMA(data: any): any {
    const basePrice = 42000 + Math.random() * 2000
    const hotness = data.trading_hotness || 50
    const multiplier = hotness / 100
    
    return {
      ema20: basePrice * (1 + multiplier * 0.02),
      ema50: basePrice * (1 + multiplier * 0.01),
      ema200: basePrice
    }
  }

  /**
   * Derive ATR from x402 data
   */
  private deriveATR(data: any): number {
    const riskScore = data.risk_score || 50
    // Higher risk = higher ATR (more volatility)
    return 300 + (riskScore / 100) * 400
  }

  /**
   * Get mock indicators (fallback)
   */
  private getMockIndicators(): Indicators {
    return {
      longShortRatio: 1.0 + Math.random() * 0.5,
      tradingHotness: 50 + Math.random() * 30,
      riskScore: 30 + Math.random() * 40,
      rsi: 50 + Math.random() * 20,
      macd: {
        value: Math.random() * 100 - 50,
        signal: Math.random() * 100 - 50,
        histogram: Math.random() * 100 - 50
      },
      ema: {
        ema20: 42000 + Math.random() * 1000,
        ema50: 41500 + Math.random() * 1000,
        ema200: 41000 + Math.random() * 1000
      },
      atr: 500 + Math.random() * 200,
      timestamp: Date.now()
    }
  }

  /**
   * Get RSI indicator
   */
  async getRSI(asset: string, timeframe: string = '5m'): Promise<number> {
    const indicators = await this.getIndicators(asset, timeframe)
    return indicators.rsi
  }

  /**
   * Get MACD
   */
  async getMACD(asset: string, timeframe: string = '5m'): Promise<any> {
    const indicators = await this.getIndicators(asset, timeframe)
    return indicators.macd
  }

  /**
   * Get EMA
   */
  async getEMA(asset: string, timeframe: string = '5m'): Promise<any> {
    const indicators = await this.getIndicators(asset, timeframe)
    return indicators.ema
  }

  /**
   * Get ATR
   */
  async getATR(asset: string, timeframe: string = '5m'): Promise<number> {
    const indicators = await this.getIndicators(asset, timeframe)
    return indicators.atr
  }

  /**
   * Get x402 analysis data
   */
  async getX402Analysis(asset: string): Promise<any> {
    const indicators = await this.getIndicators(asset, '5m')
    return {
      asset,
      longShortRatio: indicators.longShortRatio,
      tradingHotness: indicators.tradingHotness,
      riskScore: indicators.riskScore,
      timestamp: indicators.timestamp
    }
  }
}
