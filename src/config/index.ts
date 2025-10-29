import dotenv from "dotenv"
import { z } from "zod"

dotenv.config()

// Configuration schema
const configSchema = z.object({
  // Base
  BASE_RPC_URL: z.string().default("https://mainnet.base.org"),
  BASE_PRIVATE_KEY: z.string(),
  
  // Solana
  SOLANA_RPC_URL: z.string().default("https://api.mainnet-beta.solana.com"),
  SOLANA_PRIVATE_KEY: z.string(),
  
  // Hyperliquid
  HYPERLIQUID_PRIVATE_KEY: z.string(),
  HYPERLIQUID_TESTNET: z.string().default("false"),
  HYPERLIQUID_MAX_LEVERAGE: z.string().default("20"),
  
  // BSC
  BSC_RPC_URL: z.string().default("https://bsc-dataseed.binance.org"),
  BSC_PRIVATE_KEY: z.string(),
  
  // Dreams Router & x402
  DREAMS_ROUTER_URL: z.string().default("https://router.daydreams.systems"),
  X402_WALLET_ADDRESS: z.string(),
  X402_PRIVATE_KEY: z.string(),
  X402_NETWORK: z.string().default("base-sepolia"),
  
  // Balance Management
  MIN_BALANCE_USDC: z.string().default("1.0"),
  REFILL_THRESHOLD_USDC: z.string().default("2.0"),
  REFILL_AMOUNT_USDC: z.string().default("10.0"),
  
  // Trading
  ACTIVE_CHAINS: z.string().default("base,solana,hyperliquid,bsc"),
  PRIMARY_CHAIN: z.string().default("hyperliquid"),
  TRADING_INTERVAL_MS: z.string().default("60000"),
  
  // Logging
  LOG_LEVEL: z.string().default("info"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.string().default("3000"),
})

type Config = z.infer<typeof configSchema>

let config: Config

try {
  config = configSchema.parse(process.env)
} catch (error) {
  console.error("Invalid configuration:", error)
  process.exit(1)
}

export default config

export const chains = config.ACTIVE_CHAINS.split(",").map(c => c.trim())
export const primaryChain = config.PRIMARY_CHAIN
export const tradingInterval = parseInt(config.TRADING_INTERVAL_MS)
export const logLevel = config.LOG_LEVEL as "debug" | "info" | "warn" | "error"
export const apiPort = parseInt(config.API_PORT)
export const apiHost = config.API_HOST
