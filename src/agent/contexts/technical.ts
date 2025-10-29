/**
 * Technical Analysis Context
 * Provides technical indicators and market data for trading decisions
 */

import { context } from '../../types/daydreams.js'
import { z } from 'zod'
import logger from '../../utils/logger.js'

export interface TechnicalIndicators {
  rsi: number
  macd: { value: number; signal: number; histogram: number }
  ema20: number
  ema50: number
  atr: number
}

export interface TechnicalContextState {
  assets: string[]
  indicators: Record<string, TechnicalIndicators>
  fundingRates: Record<string, number>
  lastUpdate: number
}

const technicalContextSchema = z.object({
  assets: z.array(z.string())
})

export type TechnicalContextArgs = z.infer<typeof technicalContextSchema>

export const technicalContext = context({
  type: 'technical-analysis',
  schema: technicalContextSchema,
  create: async (state: any): Promise<TechnicalContextState> => {
    logger.info(`Initializing technical context for assets: ${state.args.assets.join(', ')}`)

    return {
      assets: state.args.assets,
      indicators: {},
      fundingRates: {},
      lastUpdate: 0
    }
  }
})
