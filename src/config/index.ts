import dotenv from "dotenv"
import { z } from "zod"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Manually parse .env file to work around dotenv issues
function parseEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {}
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    
    console.log(`Reading file: ${filePath}`)
    console.log(`File size: ${content.length} bytes`)
    console.log(`First 200 chars: ${content.substring(0, 200)}`)
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        // Remove quotes if present
        env[key.trim()] = value.replace(/^["']|["']$/g, '')
      }
    }
  } catch (error) {
    console.error(`Failed to parse ${filePath}:`, error)
  }
  return env
}

// Load ONLY from .env, not .env.example
const envPath = "/Users/alectaggart/CascadeProjects/windsurf-project/.env"
console.log(`Attempting to load from: ${envPath}`)
console.log(`File exists: ${fs.existsSync(envPath)}`)

if (fs.existsSync(envPath)) {
  const envVars = parseEnvFile(envPath)
  
  console.log("Parsed keys:", Object.keys(envVars).slice(0, 10))
  console.log("BASE_PRIVATE_KEY from file:", envVars.BASE_PRIVATE_KEY?.substring(0, 20))
  console.log("SOLANA_PRIVATE_KEY from file:", envVars.SOLANA_PRIVATE_KEY?.substring(0, 20))
  
  // Merge into process.env - OVERWRITE existing values
  for (const [key, value] of Object.entries(envVars)) {
    process.env[key] = value
  }
  console.log("Merged env vars into process.env")
} else {
  console.error(`ERROR: .env file not found at ${envPath}`)
}

// DO NOT call dotenv.config() - it will load .env.example instead!

// Debug: Log what we loaded
console.log("=== Environment Variables Loaded ===")
console.log(`BASE_PRIVATE_KEY: ${process.env.BASE_PRIVATE_KEY?.length || 0} chars, starts with: ${process.env.BASE_PRIVATE_KEY?.substring(0, 10)}`)
console.log(`SOLANA_PRIVATE_KEY: ${process.env.SOLANA_PRIVATE_KEY?.length || 0} chars, starts with: ${process.env.SOLANA_PRIVATE_KEY?.substring(0, 10)}`)
console.log(`BSC_PRIVATE_KEY: ${process.env.BSC_PRIVATE_KEY?.length || 0} chars, starts with: ${process.env.BSC_PRIVATE_KEY?.substring(0, 10)}`)
console.log(`HYPERLIQUID_PRIVATE_KEY: ${process.env.HYPERLIQUID_PRIVATE_KEY?.length || 0} chars, starts with: ${process.env.HYPERLIQUID_PRIVATE_KEY?.substring(0, 10)}`)
console.log(`X402_WALLET_ADDRESS: ${process.env.X402_WALLET_ADDRESS?.length || 0} chars`)

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
