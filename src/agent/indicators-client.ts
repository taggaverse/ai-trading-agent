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
  // Momentum Indicators
  rsi: number
  macd: {
    value: number
    signal: number
    histogram: number
  }
  stoch: {
    k: number
    d: number
  }
  cci: number
  adx: number
  
  // Trend Indicators
  ema: {
    ema20: number
    ema50: number
    ema200: number
  }
  sma: {
    sma20: number
    sma50: number
    sma200: number
  }
  dema: number
  
  // Bollinger Bands
  bb: {
    upper: number
    middle: number
    lower: number
  }
  
  // Volume Indicators
  obv: number
  cmf: number
  vosc: number
  
  // Volatility
  atr: number
  bbw: number
  
  // Additional
  ao: number // Awesome Oscillator
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
      // Comprehensive indicator list for trading analysis
      const payload = {
        secret: this.apiKey,
        construct: {
          exchange: exchange,
          symbol: `${asset}/USDT`,
          interval: this.mapTimeframe(timeframe),
          indicators: [
            // Momentum Indicators
            { indicator: 'rsi', period: 14 },
            { indicator: 'macd' },
            { indicator: 'stoch' },
            { indicator: 'cci', period: 20 },
            { indicator: 'adx', period: 14 },
            
            // Trend Indicators
            { indicator: 'ema', period: 20 },
            { indicator: 'ema', period: 50 },
            { indicator: 'ema', period: 200 },
            { indicator: 'sma', period: 20 },
            { indicator: 'sma', period: 50 },
            { indicator: 'sma', period: 200 },
            { indicator: 'dema', period: 20 },
            
            // Bollinger Bands
            { indicator: 'bbands', period: 20 },
            
            // Volume Indicators
            { indicator: 'obv' },
            { indicator: 'cmf', period: 20 },
            { indicator: 'vosc', short_period: 10, long_period: 50 },
            
            // Volatility
            { indicator: 'atr', period: 14 },
            { indicator: 'bbw', period: 20 },
            
            // Additional
            { indicator: 'ao' }
          ]
        }
      }

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

        // Build comprehensive indicators object
        const indicators: Indicators = {
          // Momentum
          rsi: getValue('rsi', 14),
          macd: {
            value: getValue('macd', undefined, 'value'),
            signal: getValue('macd', undefined, 'signal'),
            histogram: getValue('macd', undefined, 'histogram')
          },
          stoch: {
            k: getValue('stoch', undefined, 'k'),
            d: getValue('stoch', undefined, 'd')
          },
          cci: getValue('cci', 20),
          adx: getValue('adx', 14),
          
          // Trend
          ema: {
            ema20: getValue('ema', 20),
            ema50: getValue('ema', 50),
            ema200: getValue('ema', 200)
          },
          sma: {
            sma20: getValue('sma', 20),
            sma50: getValue('sma', 50),
            sma200: getValue('sma', 200)
          },
          dema: getValue('dema', 20),
          
          // Bollinger Bands
          bb: {
            upper: getValue('bbands', 20, 'upper'),
            middle: getValue('bbands', 20, 'middle'),
            lower: getValue('bbands', 20, 'lower')
          },
          
          // Volume
          obv: getValue('obv'),
          cmf: getValue('cmf', 20),
          vosc: getValue('vosc'),
          
          // Volatility
          atr: getValue('atr', 14),
          bbw: getValue('bbw', 20),
          
          // Additional
          ao: getValue('ao'),
          
          timestamp: Date.now()
        }

        return indicators
      } else {
        logger.debug(`[TAAPI] Invalid response from ${exchange} for ${asset}/${timeframe}`)
        return null
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.warn(`[TAAPI] ${exchange} failed for ${asset}/${timeframe}: ${errorMsg}`)
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
   * Get mock indicators (fallback) - returns neutral/random values
   */
  private getMockIndicators(): Indicators {
    const basePrice = 42000 + Math.random() * 2000
    
    return {
      // Momentum (neutral values)
      rsi: 45 + Math.random() * 10,
      macd: {
        value: Math.random() * 50 - 25,
        signal: Math.random() * 50 - 25,
        histogram: Math.random() * 50 - 25
      },
      stoch: {
        k: 40 + Math.random() * 20,
        d: 40 + Math.random() * 20
      },
      cci: Math.random() * 100 - 50,
      adx: 20 + Math.random() * 20,
      
      // Trend
      ema: {
        ema20: basePrice * (1 + (Math.random() - 0.5) * 0.02),
        ema50: basePrice * (1 + (Math.random() - 0.5) * 0.01),
        ema200: basePrice
      },
      sma: {
        sma20: basePrice * (1 + (Math.random() - 0.5) * 0.02),
        sma50: basePrice * (1 + (Math.random() - 0.5) * 0.01),
        sma200: basePrice
      },
      dema: basePrice * (1 + (Math.random() - 0.5) * 0.015),
      
      // Bollinger Bands
      bb: {
        upper: basePrice * 1.02,
        middle: basePrice,
        lower: basePrice * 0.98
      },
      
      // Volume
      obv: Math.random() * 1000000,
      cmf: Math.random() * 0.5 - 0.25,
      vosc: Math.random() * 100 - 50,
      
      // Volatility
      atr: 300 + Math.random() * 400,
      bbw: Math.random() * 200,
      
      // Additional
      ao: Math.random() * 100 - 50,
      
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
        macd: indicators.macd,
        stoch: indicators.stoch,
        cci: indicators.cci,
        adx: indicators.adx
      },
      trend: {
        ema: indicators.ema,
        sma: indicators.sma,
        dema: indicators.dema
      },
      volatility: {
        atr: indicators.atr,
        bbw: indicators.bbw,
        bb: indicators.bb
      },
      volume: {
        obv: indicators.obv,
        cmf: indicators.cmf,
        vosc: indicators.vosc
      },
      timestamp: indicators.timestamp
    }
  }
}
