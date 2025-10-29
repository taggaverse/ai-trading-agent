import { context } from "../../types/daydreams.js"
import { z } from "zod"
import { Connection, PublicKey, Keypair } from "@solana/web3.js"
import axios from "axios"
import logger from "../../utils/logger.js"

// Types
export interface SolanaBalance {
  token: string
  amount: number
  decimals: number
  uiAmount: number
}

export interface JupiterQuote {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  swapMode: "ExactIn" | "ExactOut"
  priceImpactPct: string
  routePlan: any[]
}

export interface SolanaPosition {
  mint: string
  symbol: string
  balance: number
  value: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
}

// Solana context schema
const solanaContextSchema = z.object({
  symbol: z.string(),
  chain: z.string().default("solana"),
})

export type SolanaContextArgs = z.infer<typeof solanaContextSchema>

// Solana context state
export interface SolanaContextState {
  symbol: string
  chain: string
  rpc: string
  wallet: string
  balances: SolanaBalance[]
  positions: SolanaPosition[]
  lastUpdate: number
}

// Create Solana context
export const solanaContext = context({
  type: "solana-trading",
  schema: solanaContextSchema,
  create: async (state: any): Promise<SolanaContextState> => {
    logger.info(`Initializing Solana context for ${state.args.symbol}`)

    return {
      symbol: state.args.symbol,
      chain: "solana",
      rpc: "https://api.mainnet-beta.solana.com",
      wallet: "",
      balances: [],
      positions: [],
      lastUpdate: 0,
    }
  },
})

// Jupiter API client
export class JupiterClient {
  private baseUrl = "https://quote-api.jup.ag/v6"
  private connection: Connection | null = null
  private keypair: Keypair | null = null
  private rpcUrl: string
  private privateKey: string

  constructor(rpcUrl: string, privateKey: string) {
    this.rpcUrl = rpcUrl
    this.privateKey = privateKey
  }

  // Lazy-load connection only when needed
  private getConnection(): Connection {
    if (!this.connection) {
      this.connection = new Connection(this.rpcUrl, "confirmed")
    }
    return this.connection
  }

  // Lazy-load keypair only when needed
  private getKeypair(): Keypair {
    if (!this.keypair) {
      this.keypair = Keypair.fromSecretKey(Buffer.from(this.privateKey, "base64"))
    }
    return this.keypair
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippage: number = 0.5
  ): Promise<JupiterQuote | null> {
    try {
      logger.info(`Getting Jupiter quote: ${inputMint} → ${outputMint}`)

      const response = await axios.get(`${this.baseUrl}/quote`, {
        params: {
          inputMint,
          outputMint,
          amount,
          slippageBps: Math.round(slippage * 100), // Convert to basis points
          onlyDirectRoutes: false,
          asLegacyTransaction: false,
        },
      })

      if (response.data && response.data.data && response.data.data.length > 0) {
        const quote = response.data.data[0]
        logger.info(
          `Quote received: ${quote.outAmount} (impact: ${quote.priceImpactPct}%)`
        )
        return quote
      }

      logger.warn("No quote data received")
      return null
    } catch (error) {
      logger.error("Failed to get Jupiter quote:", error)
      return null
    }
  }

  async getSwapTransaction(
    quote: JupiterQuote,
    userPublicKey: string,
    slippage: number = 0.5
  ): Promise<any | null> {
    try {
      logger.info("Getting Jupiter swap transaction...")

      const response = await axios.post(`${this.baseUrl}/swap`, {
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: "auto",
      })

      if (response.data && response.data.swapTransaction) {
        logger.info("Swap transaction received")
        return response.data.swapTransaction
      }

      logger.warn("No swap transaction received")
      return null
    } catch (error) {
      logger.error("Failed to get swap transaction:", error)
      return null
    }
  }

  async getTokenPrice(mint: string): Promise<number> {
    try {
      const response = await axios.get(
        `https://api.jup.ag/price/v2?ids=${mint}`
      )

      if (response.data && response.data.data && response.data.data[mint]) {
        return response.data.data[mint].price
      }

      return 0
    } catch (error) {
      logger.error(`Failed to get token price for ${mint}:`, error)
      return 0
    }
  }

  async getBalance(token: string): Promise<SolanaBalance | null> {
    try {
      const connection = this.getConnection()
      const keypair = this.getKeypair()
      const tokenPublicKey = new PublicKey(token)
      const accounts = await connection.getTokenAccountsByOwner(
        keypair.publicKey,
        { mint: tokenPublicKey }
      )

      if (accounts.value.length === 0) {
        return null
      }

      const account = accounts.value[0]
      const balance = await connection.getTokenAccountBalance(account.pubkey)

      return {
        token,
        amount: balance.value.amount ? parseInt(balance.value.amount) : 0,
        decimals: balance.value.decimals,
        uiAmount: balance.value.uiAmount || 0,
      }
    } catch (error) {
      logger.error(`Failed to get balance for ${token}:`, error)
      return null
    }
  }

  async getSolBalance(): Promise<number> {
    try {
      const connection = this.getConnection()
      const keypair = this.getKeypair()
      const balance = await connection.getBalance(keypair.publicKey)
      return balance / 1e9 // Convert lamports to SOL
    } catch (error) {
      logger.error("Failed to get SOL balance:", error)
      return 0
    }
  }

  getWalletAddress(): string {
    const keypair = this.getKeypair()
    return keypair.publicKey.toString()
  }
}

// Helper functions
export async function updateSolanaBalances(
  state: SolanaContextState,
  jupiter: JupiterClient,
  tokenMints: string[]
): Promise<SolanaContextState> {
  const balances: SolanaBalance[] = []

  // Get SOL balance
  const solBalance = await jupiter.getSolBalance()
  balances.push({
    token: "SOL",
    amount: solBalance * 1e9,
    decimals: 9,
    uiAmount: solBalance,
  })

  // Get token balances
  for (const mint of tokenMints) {
    const balance = await jupiter.getBalance(mint)
    if (balance) {
      balances.push(balance)
    }
  }

  return {
    ...state,
    balances,
    wallet: jupiter.getWalletAddress(),
    lastUpdate: Date.now(),
  }
}

export async function updateSolanaPositions(
  state: SolanaContextState,
  jupiter: JupiterClient,
  positions: Array<{ mint: string; symbol: string; entryPrice: number }>
): Promise<SolanaContextState> {
  const updatedPositions: SolanaPosition[] = []

  for (const pos of positions) {
    const balance = await jupiter.getBalance(pos.mint)
    const currentPrice = await jupiter.getTokenPrice(pos.mint)

    if (balance) {
      const value = balance.uiAmount * currentPrice
      const pnl = value - balance.uiAmount * pos.entryPrice
      const pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100

      updatedPositions.push({
        mint: pos.mint,
        symbol: pos.symbol,
        balance: balance.uiAmount,
        value,
        entryPrice: pos.entryPrice,
        currentPrice,
        pnl,
        pnlPercent,
      })
    }
  }

  return {
    ...state,
    positions: updatedPositions,
    lastUpdate: Date.now(),
  }
}

export async function getJupiterSwapRoute(
  jupiter: JupiterClient,
  fromMint: string,
  toMint: string,
  amount: number,
  slippage: number = 0.5
): Promise<{
  quote: JupiterQuote | null
  priceImpact: number
  outputAmount: number
}> {
  const quote = await jupiter.getQuote(fromMint, toMint, amount, slippage)

  if (!quote) {
    return {
      quote: null,
      priceImpact: 0,
      outputAmount: 0,
    }
  }

  return {
    quote,
    priceImpact: parseFloat(quote.priceImpactPct),
    outputAmount: parseInt(quote.outAmount),
  }
}

export async function estimateSolanaSwapCost(
  jupiter: JupiterClient,
  fromMint: string,
  toMint: string,
  amount: number
): Promise<{
  estimatedOutput: number
  priceImpact: number
  fee: number
}> {
  const quote = await jupiter.getQuote(fromMint, toMint, amount)

  if (!quote) {
    return {
      estimatedOutput: 0,
      priceImpact: 0,
      fee: 0,
    }
  }

  const estimatedOutput = parseInt(quote.outAmount)
  const priceImpact = parseFloat(quote.priceImpactPct)
  const fee = 0.0005 // Jupiter base fee (0.05%)

  return {
    estimatedOutput,
    priceImpact,
    fee,
  }
}

// Common Solana token mints
export const SOLANA_TOKENS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWaLb3odcccccccccccccccccccccccccccccccccc",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenErt",
  ORCA: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1jolooT",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX4R",
  COPE: "8HGyAAB1yoM1ttS7pnqwXaHEF5MToRXQdchalRAwdm1",
}

export const JUPITER_COMMON_ROUTES = {
  SOL_USDC: {
    from: SOLANA_TOKENS.SOL,
    to: SOLANA_TOKENS.USDC,
  },
  USDC_SOL: {
    from: SOLANA_TOKENS.USDC,
    to: SOLANA_TOKENS.SOL,
  },
  SOL_USDT: {
    from: SOLANA_TOKENS.SOL,
    to: SOLANA_TOKENS.USDT,
  },
  USDT_SOL: {
    from: SOLANA_TOKENS.USDT,
    to: SOLANA_TOKENS.SOL,
  },
}
