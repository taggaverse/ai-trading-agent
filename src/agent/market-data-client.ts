/**
 * Market Data Client
 * Fetches technical indicators and market analysis
 */

import logger from '../utils/logger.js'
import axios from 'axios'
import config from '../config/index.js'

export interface Indicators {
  rsi: number
  macd: number
  signal: number
  ema: number
  atr: number
}

export interface MarketData {
  asset: string
  timeframe: string
  indicators: Indicators
  timestamp: number
}

export class MarketDataClient {
  private taapiKey: string
  private taapiUrl: string = 'https://api.taapi.io'

  constructor() {
    this.taapiKey = config.TAAPI_API_KEY || 'demo'
    logger.info(`[Market Data] Initialized with TAAPI API key`)
  }

  /**
   * Fetch technical indicators for an asset
   */
  async getIndicators(asset: string, timeframe: string = '5m'): Promise<Indicators> {
    try {
      logger.info(`[Market Data] Fetching indicators for ${asset} (${timeframe})...`)

      // Map asset names to exchange pairs
      const pair = this.mapAssetToPair(asset)

      // Fetch RSI
      const rsiResponse = await this.fetchIndicator('rsi', pair, timeframe)
      const rsi = rsiResponse?.value || 50

      // Fetch MACD
      const macdResponse = await this.fetchIndicator('macd', pair, timeframe)
      const macd = macdResponse?.valueMACD || 0
      const signal = macdResponse?.valueMACDSignal || 0

      // Fetch EMA
      const emaResponse = await this.fetchIndicator('ema', pair, timeframe, { period: 20 })
      const ema = emaResponse?.value || 0

      // Fetch ATR
      const atrResponse = await this.fetchIndicator('atr', pair, timeframe)
      const atr = atrResponse?.value || 0

      const indicators: Indicators = {
        rsi,
        macd,
        signal,
        ema,
        atr
      }

      logger.info(`[Market Data] ${asset} RSI=${rsi.toFixed(2)}, MACD=${macd.toFixed(4)}, EMA=${ema.toFixed(2)}, ATR=${atr.toFixed(4)}`)

      return indicators
    } catch (error) {
      logger.error(`[Market Data] Failed to fetch indicators for ${asset}:`, error)
      // Return neutral indicators on error
      return {
        rsi: 50,
        macd: 0,
        signal: 0,
        ema: 0,
        atr: 0
      }
    }
  }

  /**
   * Fetch a single indicator from TAAPI
   */
  private async fetchIndicator(
    indicator: string,
    pair: string,
    timeframe: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    try {
      const url = `${this.taapiUrl}/${indicator}`
      const queryParams = {
        secret: this.taapiKey,
        exchange: 'binance',
        symbol: pair,
        interval: timeframe,
        ...params
      }

      const response = await axios.get(url, { params: queryParams, timeout: 10000 })
      return response.data
    } catch (error) {
      logger.warn(`[Market Data] Failed to fetch ${indicator} for ${pair}:`, error instanceof Error ? error.message : 'Unknown error')
      return null
    }
  }

  /**
   * Map asset name to exchange pair
   */
  private mapAssetToPair(asset: string): string {
    const pairMap: Record<string, string> = {
      'BTC': 'BTCUSDT',
      'ETH': 'ETHUSDT',
      'SOL': 'SOLUSDT',
      'BNBUSDT': 'BNBUSDT',
      'XRP': 'XRPUSDT',
      'ADA': 'ADAUSDT',
      'DOGE': 'DOGEUSDT',
      'AVAX': 'AVAXUSDT'
    }

    return pairMap[asset] || `${asset}USDT`
  }

  /**
   * Get multiple indicators for multiple assets
   */
  async getMultipleIndicators(
    assets: string[],
    timeframe: string = '5m'
  ): Promise<Record<string, Indicators>> {
    const results: Record<string, Indicators> = {}

    for (const asset of assets) {
      results[asset] = await this.getIndicators(asset, timeframe)
    }

    return results
  }

  /**
   * Check if indicator suggests bullish signal
   */
  isBullish(indicators: Indicators): boolean {
    return (
      indicators.rsi < 70 && // Not overbought
      indicators.rsi > 30 && // Not oversold
      indicators.macd > indicators.signal // MACD above signal
    )
  }

  /**
   * Check if indicator suggests bearish signal
   */
  isBearish(indicators: Indicators): boolean {
    return (
      indicators.rsi > 30 && // Not oversold
      indicators.rsi < 70 && // Not overbought
      indicators.macd < indicators.signal // MACD below signal
    )
  }

  /**
   * Get signal strength (0-1)
   */
  getSignalStrength(indicators: Indicators): number {
    // Normalize RSI to 0-1
    const rsiStrength = Math.abs(indicators.rsi - 50) / 50

    // Normalize MACD to 0-1
    const macdStrength = Math.min(Math.abs(indicators.macd) / 0.01, 1)

    // Average the strengths
    return (rsiStrength + macdStrength) / 2
  }
}
