/**
 * Technical Indicators Client
 * Fetches technical indicators from TAAPI Bulk API
 * Uses single bulk POST request to fetch 15+ indicators at once
 * Supports multiple exchanges with fallback: binance -> bybit -> gate
 */

import logger from '../utils/logger.js'
import axios from 'axios'
import { X402PaymentManager, X402_COSTS } from './x402-payment-manager.js'

export interface Indicators {
  // Momentum Indicators (CRITICAL)
  rsi: number
  macd: {
    value: number
    signal: number
    histogram: number
  }
  
  // Trend Indicators (CRITICAL)
  ema: {
    ema20: number
    ema50: number
    ema200: number
  }
  
  // Bollinger Bands (IMPORTANT)
  bb: {
    upper: number
    middle: number
    lower: number
  }
  
  // Volatility (CRITICAL)
  atr: number
  
  timestamp: number
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
   * Single bulk POST request fetches 15+ indicators at once
   * Tries multiple exchanges with fallback: binance -> bybit -> gate
   * Throws error if all fail (no mock fallback - let caller decide)
   */
  async getIndicators(asset: string, timeframe: string): Promise<Indicators> {
    logger.info(`Fetching indicators for ${asset} (${timeframe}) from TAAPI Bulk API...`)

    if (!this.apiKey || this.apiKey === 'mock-key') {
      throw new Error(`TAAPI API key not configured`)
    }

    // Try multiple exchanges in order of preference
    const exchanges = ['binance', 'bybit', 'gate']
    const errors: string[] = []
    
    for (const exchange of exchanges) {
      try {
        logger.debug(`[TAAPI] Trying ${exchange} for ${asset}/${timeframe}...`)
        const result = await this.fetchIndicatorsFromExchange(asset, timeframe, exchange)
        if (result) {
          logger.info(`✓ Received ${Object.keys(result).length - 1} indicators for ${asset}/${timeframe} from ${exchange}`)
          return result
        }
      } catch (exchangeError) {
        const msg = exchangeError instanceof Error ? exchangeError.message : String(exchangeError)
        logger.debug(`[TAAPI] ${exchange} failed: ${msg}`)
        errors.push(`${exchange}: ${msg}`)
        continue
      }
    }

    // If all exchanges fail, throw error
    const errorMsg = `Failed to fetch indicators from all exchanges for ${asset}/${timeframe}: ${errors.join('; ')}`
    logger.warn(`✗ ${errorMsg}`)
    throw new Error(errorMsg)
  }

  /**
   * Fetch comprehensive indicators from a specific exchange using bulk API
   * Single POST request fetches 15+ indicators at once
   */
  private async fetchIndicatorsFromExchange(
    asset: string,
    timeframe: string,
    exchange: string
  ): Promise<Indicators | null> {
    try {
      // Optimized indicator list for trading analysis
      // Max 20 calculations per request - using most critical indicators
      // For 3 assets (BTC, ETH, XRP): ~6-7 indicators per asset = 18-21 calcs
      const payload = {
        secret: this.apiKey,
        construct: {
          exchange: exchange,
          symbol: this.getSymbolForAsset(asset),
          interval: this.mapTimeframe(timeframe),
          indicators: [
            // Momentum Indicators (CRITICAL)
            { indicator: 'rsi', period: 14 },
            { indicator: 'macd' },
            
            // Trend Indicators (CRITICAL)
            { indicator: 'ema', period: 20 },
            { indicator: 'ema', period: 50 },
            { indicator: 'ema', period: 200 },
            
            // Volatility (CRITICAL)
            { indicator: 'atr', period: 14 },
            
            // Bollinger Bands (IMPORTANT)
            { indicator: 'bbands', period: 20 }
          ]
        }
      }

      logger.debug(`[TAAPI] Sending request to ${exchange} for ${asset}/${timeframe}`)
      logger.debug(`[TAAPI] Payload: ${JSON.stringify(payload).substring(0, 200)}...`)
      
      const response = await axios.post(
        this.taapiEndpoint,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      )
      
      logger.debug(`[TAAPI] Response status: ${response.status}`)
      logger.debug(`[TAAPI] Response data keys: ${Object.keys(response.data).join(', ')}`)

      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        const data = response.data.data
        
        // Helper function to safely extract values
        const getValue = (indicator: string, period?: number, field: string = 'value'): number => {
          const item = data.find((d: any) => {
            if (period) {
              return d.indicator === indicator && d.period === period
            }
            return d.indicator === indicator
          })
          return item && item[field] ? parseFloat(item[field]) : 0
        }

        // Build indicators object with critical indicators only
        // Optimized for 20 calculation limit per request
        const indicators: Indicators = {
          // Momentum (CRITICAL)
          rsi: getValue('rsi', 14),
          macd: {
            value: getValue('macd', undefined, 'value'),
            signal: getValue('macd', undefined, 'signal'),
            histogram: getValue('macd', undefined, 'histogram')
          },
          
          // Trend (CRITICAL)
          ema: {
            ema20: getValue('ema', 20),
            ema50: getValue('ema', 50),
            ema200: getValue('ema', 200)
          },
          
          // Bollinger Bands (IMPORTANT)
          bb: {
            upper: getValue('bbands', 20, 'upper'),
            middle: getValue('bbands', 20, 'middle'),
            lower: getValue('bbands', 20, 'lower')
          },
          
          // Volatility (CRITICAL)
          atr: getValue('atr', 14),
          
          timestamp: Date.now()
        }

        return indicators
      } else {
        logger.warn(`[TAAPI] Invalid response from ${exchange} for ${asset}/${timeframe}: ${JSON.stringify(response.data).substring(0, 200)}`)
        return null
      }
    } catch (error: any) {
      let errorMsg = error instanceof Error ? error.message : String(error)
      
      // Extract more details from axios error
      if (error.response) {
        errorMsg = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data).substring(0, 200)}`
      } else if (error.request) {
        errorMsg = `No response from server: ${error.message}`
      }
      
      logger.warn(`[TAAPI] ${exchange} failed for ${asset}/${timeframe}: ${errorMsg}`)
      return null
    }
  }

  /**
   * Get symbol for asset (XRP uses USD, others use USDT on free tier)
   */
  private getSymbolForAsset(asset: string): string {
    const symbolMap: Record<string, string> = {
      'BTC': 'BTC/USDT',
      'ETH': 'ETH/USDT',
      'XRP': 'XRP/USD'
    }
    return symbolMap[asset] || `${asset}/USDT`
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
   * Get mock indicators (fallback) - returns neutral/random values
   * Optimized for 20 calculation limit per request
   */
  private getMockIndicators(): Indicators {
    const basePrice = 42000 + Math.random() * 2000
    
    return {
      // Momentum (CRITICAL)
      rsi: 45 + Math.random() * 10,
      macd: {
        value: Math.random() * 50 - 25,
        signal: Math.random() * 50 - 25,
        histogram: Math.random() * 50 - 25
      },
      
      // Trend (CRITICAL)
      ema: {
        ema20: basePrice * (1 + (Math.random() - 0.5) * 0.02),
        ema50: basePrice * (1 + (Math.random() - 0.5) * 0.01),
        ema200: basePrice
      },
      
      // Bollinger Bands (IMPORTANT)
      bb: {
        upper: basePrice * 1.02,
        middle: basePrice,
        lower: basePrice * 0.98
      },
      
      // Volatility (CRITICAL)
      atr: 300 + Math.random() * 400,
      
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
   * Get comprehensive analysis data for an asset
   */
  async getAnalysis(asset: string): Promise<any> {
    const indicators = await this.getIndicators(asset, '5m')
    return {
      asset,
      momentum: {
        rsi: indicators.rsi,
        macd: indicators.macd
      },
      trend: {
        ema: indicators.ema
      },
      volatility: {
        atr: indicators.atr,
        bb: indicators.bb
      },
      timestamp: indicators.timestamp
    }
  }
}
