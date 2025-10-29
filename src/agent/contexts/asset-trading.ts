/**
 * Asset Trading Context
 * Manages individual asset positions, trades, and exit plans
 */

import { context } from '../../types/daydreams.js'
import { z } from 'zod'
import logger from '../../utils/logger.js'

export interface Position {
  asset: string
  isBuy: boolean
  size: number
  entryPrice: number
  currentPrice?: number
  pnl?: number
  pnlPercent?: number
}

export interface Trade {
  id: string
  timestamp: number
  type: 'open' | 'close' | 'adjust'
  asset: string
  side: 'buy' | 'sell'
  size: number
  price: number
  pnl?: number
  exitPlan?: string
}

export interface AssetTradingContextState {
  asset: string
  position: Position | null
  trades: Trade[]
  exitPlan: string | null
  cooldownUntil: number | null
  pnl: number
  tradeCount: number
}

const assetTradingContextSchema = z.object({
  asset: z.string(),
  timeframe: z.enum(['5m', '1h', '4h']).default('5m')
})

export type AssetTradingContextArgs = z.infer<typeof assetTradingContextSchema>

export const assetTradingContext = context({
  type: 'asset-trading',
  schema: assetTradingContextSchema,
  create: async (state: any): Promise<AssetTradingContextState> => {
    logger.info(`Initializing asset trading context for ${state.args.asset}`)

    return {
      asset: state.args.asset,
      position: null,
      trades: [],
      exitPlan: null,
      cooldownUntil: null,
      pnl: 0,
      tradeCount: 0
    }
  }
})
