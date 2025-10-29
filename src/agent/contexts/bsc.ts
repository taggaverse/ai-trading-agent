import { context } from "../../types/daydreams.js"
import { z } from "zod"
import { ethers } from "ethers"
import axios from "axios"
import logger from "../../utils/logger.js"

// Types
export interface BSCBalance {
  token: string
  symbol: string
  balance: string
  decimals: number
  value: number
}

export interface PancakeSwapQuote {
  amountIn: string
  amountOut: string
  priceImpact: number
  route: string[]
  fee: number
}

export interface BSCPosition {
  token: string
  symbol: string
  balance: number
  value: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
}

// BSC context schema
const bscContextSchema = z.object({
  symbol: z.string(),
  chain: z.string().default("bsc"),
})

export type BSCContextArgs = z.infer<typeof bscContextSchema>

// BSC context state
export interface BSCContextState {
  symbol: string
  chain: string
  rpc: string
  wallet: string
  balances: BSCBalance[]
  positions: BSCPosition[]
  lastUpdate: number
}

// Create BSC context
export const bscContext = context({
  type: "bsc-trading",
  schema: bscContextSchema,
  create: async (state: any): Promise<BSCContextState> => {
    logger.info(`Initializing BSC context for ${state.args.symbol}`)

    return {
      symbol: state.args.symbol,
      chain: "bsc",
      rpc: "https://bsc-dataseed.binance.org",
      wallet: "",
      balances: [],
      positions: [],
      lastUpdate: 0,
    }
  },
})

// PancakeSwap client
export class PancakeSwapClient {
  private provider: ethers.Provider | null = null
  private signer: ethers.Signer | null = null
  private rpcUrl: string
  private privateKey: string
  private routerAddress: string
  private chainId: number = 56 // BSC mainnet

  constructor(rpcUrl: string, privateKey: string) {
    this.rpcUrl = rpcUrl
    this.privateKey = privateKey
    this.routerAddress = "0x10ED43C718714eb63d5aA57B78f985283Ed541b8" // PancakeSwap Router V2
  }

  // Lazy-load provider only when needed
  private getProvider(): ethers.Provider {
    if (!this.provider) {
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl)
    }
    return this.provider
  }

  // Lazy-load signer only when needed
  private getSigner(): ethers.Signer {
    if (!this.signer) {
      this.signer = new ethers.Wallet(this.privateKey, this.getProvider())
    }
    return this.signer
  }

  async getQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    fee: number = 2500 // 0.25% default fee
  ): Promise<PancakeSwapQuote | null> {
    try {
      logger.info(`Getting PancakeSwap quote: ${tokenIn} → ${tokenOut}`)

      // Use 1inch API for BSC quotes
      const response = await axios.get("https://api.1inch.io/v5.0/56/quote", {
        params: {
          fromTokenAddress: tokenIn,
          toTokenAddress: tokenOut,
          amount: amountIn,
          slippage: 0.5,
        },
      })

      if (response.data) {
        const quote: PancakeSwapQuote = {
          amountIn,
          amountOut: response.data.toAmount,
          priceImpact: response.data.estimatedGas ? 0.5 : 0.1,
          route: [tokenIn, tokenOut],
          fee,
        }

        logger.info(
          `Quote received: ${quote.amountOut} (impact: ${quote.priceImpact}%)`
        )
        return quote
      }

      return null
    } catch (error) {
      logger.error("Failed to get PancakeSwap quote:", error)
      return null
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<number> {
    try {
      // Use CoinGecko for BSC token prices
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/simple/token_price/binance-smart-chain",
        {
          params: {
            contract_addresses: tokenAddress,
            vs_currencies: "usd",
          },
        }
      )

      if (response.data && response.data[tokenAddress.toLowerCase()]) {
        return response.data[tokenAddress.toLowerCase()].usd
      }

      return 0
    } catch (error) {
      logger.error(`Failed to get token price for ${tokenAddress}:`, error)
      return 0
    }
  }

  async getBalance(tokenAddress: string): Promise<BSCBalance | null> {
    try {
      const signer = this.getSigner()
      const provider = this.getProvider()
      const walletAddress = await signer.getAddress()

      // For BNB
      if (tokenAddress.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        const balance = await provider.getBalance(walletAddress)
        const bnbBalance = ethers.formatEther(balance)

        return {
          token: tokenAddress,
          symbol: "BNB",
          balance: bnbBalance,
          decimals: 18,
          value: parseFloat(bnbBalance) * (await this.getTokenPrice(tokenAddress)),
        }
      }

      // For BEP20 tokens
      const bep20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
      ]

      const contract = new ethers.Contract(tokenAddress, bep20Abi, provider)
      const balance = await contract.balanceOf(walletAddress)
      const decimals = await contract.decimals()
      const symbol = await contract.symbol()

      const formattedBalance = ethers.formatUnits(balance, decimals)
      const price = await this.getTokenPrice(tokenAddress)

      return {
        token: tokenAddress,
        symbol,
        balance: formattedBalance,
        decimals,
        value: parseFloat(formattedBalance) * price,
      }
    } catch (error) {
      logger.error(`Failed to get balance for ${tokenAddress}:`, error)
      return null
    }
  }

  async getBnbBalance(): Promise<number> {
    try {
      const signer = this.getSigner()
      const provider = this.getProvider()
      const walletAddress = await signer.getAddress()
      const balance = await provider.getBalance(walletAddress)
      return parseFloat(ethers.formatEther(balance))
    } catch (error) {
      logger.error("Failed to get BNB balance:", error)
      return 0
    }
  }

  async getWalletAddress(): Promise<string> {
    const signer = this.getSigner()
    return await signer.getAddress()
  }
}

// Helper functions
export async function updateBSCBalances(
  state: BSCContextState,
  pancakeswap: PancakeSwapClient,
  tokenAddresses: string[]
): Promise<BSCContextState> {
  const balances: BSCBalance[] = []

  // Get BNB balance
  const bnbBalance = await pancakeswap.getBnbBalance()
  const bnbPrice = await pancakeswap.getTokenPrice(
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  )
  balances.push({
    token: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    symbol: "BNB",
    balance: bnbBalance.toString(),
    decimals: 18,
    value: bnbBalance * bnbPrice,
  })

  // Get token balances
  for (const address of tokenAddresses) {
    const balance = await pancakeswap.getBalance(address)
    if (balance) {
      balances.push(balance)
    }
  }

  return {
    ...state,
    balances,
    wallet: await pancakeswap.getWalletAddress(),
    lastUpdate: Date.now(),
  }
}

export async function updateBSCPositions(
  state: BSCContextState,
  pancakeswap: PancakeSwapClient,
  positions: Array<{ address: string; symbol: string; entryPrice: number }>
): Promise<BSCContextState> {
  const updatedPositions: BSCPosition[] = []

  for (const pos of positions) {
    const balance = await pancakeswap.getBalance(pos.address)
    const currentPrice = await pancakeswap.getTokenPrice(pos.address)

    if (balance) {
      const value = parseFloat(balance.balance) * currentPrice
      const pnl = value - parseFloat(balance.balance) * pos.entryPrice
      const pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100

      updatedPositions.push({
        token: pos.address,
        symbol: pos.symbol,
        balance: parseFloat(balance.balance),
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

export async function getPancakeSwapRoute(
  pancakeswap: PancakeSwapClient,
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  fee: number = 2500
): Promise<{
  quote: PancakeSwapQuote | null
  priceImpact: number
  outputAmount: string
}> {
  const quote = await pancakeswap.getQuote(tokenIn, tokenOut, amountIn, fee)

  if (!quote) {
    return {
      quote: null,
      priceImpact: 0,
      outputAmount: "0",
    }
  }

  return {
    quote,
    priceImpact: quote.priceImpact,
    outputAmount: quote.amountOut,
  }
}

export async function estimateBSCSwapCost(
  pancakeswap: PancakeSwapClient,
  tokenIn: string,
  tokenOut: string,
  amountIn: string
): Promise<{
  estimatedOutput: string
  priceImpact: number
  fee: number
}> {
  const quote = await pancakeswap.getQuote(tokenIn, tokenOut, amountIn)

  if (!quote) {
    return {
      estimatedOutput: "0",
      priceImpact: 0,
      fee: 0,
    }
  }

  const fee = 0.0025 // BSC fee (0.25%)

  return {
    estimatedOutput: quote.amountOut,
    priceImpact: quote.priceImpact,
    fee,
  }
}

// Common BSC token addresses
export const BSC_TOKENS = {
  BNB: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  ETH: "0x2170Ed0880ac9A755fd29B2688956BD959e2Fe07",
  BTCB: "0x7130d2A12B9BCbFdd356A9Ec6db15dAcDA8c7d46",
}

export const PANCAKESWAP_COMMON_ROUTES = {
  BNB_BUSD: {
    from: BSC_TOKENS.BNB,
    to: BSC_TOKENS.BUSD,
    fee: 2500,
  },
  BUSD_BNB: {
    from: BSC_TOKENS.BUSD,
    to: BSC_TOKENS.BNB,
    fee: 2500,
  },
  BNB_USDT: {
    from: BSC_TOKENS.BNB,
    to: BSC_TOKENS.USDT,
    fee: 2500,
  },
  USDT_BNB: {
    from: BSC_TOKENS.USDT,
    to: BSC_TOKENS.BNB,
    fee: 2500,
  },
}
