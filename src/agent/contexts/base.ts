import { context } from "../../types/daydreams.js"
import { z } from "zod"
import { ethers } from "ethers"
import axios from "axios"
import logger from "../../utils/logger.js"

// Types
export interface BaseBalance {
  token: string
  symbol: string
  balance: string
  decimals: number
  value: number
}

export interface UniswapV4Quote {
  amountIn: string
  amountOut: string
  priceImpact: number
  route: string[]
  fee: number
}

export interface BasePosition {
  token: string
  symbol: string
  balance: number
  value: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
}

// Base context schema
const baseContextSchema = z.object({
  symbol: z.string(),
  chain: z.string().default("base"),
})

export type BaseContextArgs = z.infer<typeof baseContextSchema>

// Base context state
export interface BaseContextState {
  symbol: string
  chain: string
  rpc: string
  wallet: string
  balances: BaseBalance[]
  positions: BasePosition[]
  lastUpdate: number
}

// Create Base context
export const baseContext = context({
  type: "base-trading",
  schema: baseContextSchema,
  create: async (state: any): Promise<BaseContextState> => {
    logger.info(`Initializing Base context for ${state.args.symbol}`)

    return {
      symbol: state.args.symbol,
      chain: "base",
      rpc: "https://mainnet.base.org",
      wallet: "",
      balances: [],
      positions: [],
      lastUpdate: 0,
    }
  },
})

// Uniswap V4 client
export class UniswapV4Client {
  private provider: ethers.Provider
  private signer: ethers.Signer
  private routerAddress: string
  private chainId: number = 8453 // Base mainnet

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
    this.signer = new ethers.Wallet(privateKey, this.provider)
    this.routerAddress = "0x2626664c2603336E57B271c5C0b26F421741e481" // Uniswap V4 Router on Base
  }

  async getQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    fee: number = 3000 // 0.3% default fee
  ): Promise<UniswapV4Quote | null> {
    try {
      logger.info(`Getting Uniswap V4 quote: ${tokenIn} → ${tokenOut}`)

      // Use 1inch API for Base quotes (more reliable than direct Uniswap calls)
      const response = await axios.get("https://api.1inch.io/v5.0/8453/quote", {
        params: {
          fromTokenAddress: tokenIn,
          toTokenAddress: tokenOut,
          amount: amountIn,
          slippage: 0.5,
        },
      })

      if (response.data) {
        const quote: UniswapV4Quote = {
          amountIn,
          amountOut: response.data.toAmount,
          priceImpact: response.data.estimatedGas ? 0.5 : 0.1, // Estimate
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
      logger.error("Failed to get Uniswap V4 quote:", error)
      return null
    }
  }

  async getTokenPrice(tokenAddress: string): Promise<number> {
    try {
      // Use CoinGecko for Base token prices
      const response = await axios.get(
        "https://api.coingecko.com/api/v3/simple/token_price/base",
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

  async getBalance(tokenAddress: string): Promise<BaseBalance | null> {
    try {
      const walletAddress = await this.signer.getAddress()

      // For ETH
      if (tokenAddress.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        const balance = await this.provider.getBalance(walletAddress)
        const ethBalance = ethers.formatEther(balance)

        return {
          token: tokenAddress,
          symbol: "ETH",
          balance: ethBalance,
          decimals: 18,
          value: parseFloat(ethBalance) * (await this.getTokenPrice(tokenAddress)),
        }
      }

      // For ERC20 tokens
      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
      ]

      const contract = new ethers.Contract(tokenAddress, erc20Abi, this.provider)
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

  async getEthBalance(): Promise<number> {
    try {
      const walletAddress = await this.signer.getAddress()
      const balance = await this.provider.getBalance(walletAddress)
      return parseFloat(ethers.formatEther(balance))
    } catch (error) {
      logger.error("Failed to get ETH balance:", error)
      return 0
    }
  }

  getWalletAddress(): string {
    return this.signer.getAddress() as any
  }
}

// Helper functions
export async function updateBaseBalances(
  state: BaseContextState,
  uniswap: UniswapV4Client,
  tokenAddresses: string[]
): Promise<BaseContextState> {
  const balances: BaseBalance[] = []

  // Get ETH balance
  const ethBalance = await uniswap.getEthBalance()
  const ethPrice = await uniswap.getTokenPrice(
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  )
  balances.push({
    token: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    symbol: "ETH",
    balance: ethBalance.toString(),
    decimals: 18,
    value: ethBalance * ethPrice,
  })

  // Get token balances
  for (const address of tokenAddresses) {
    const balance = await uniswap.getBalance(address)
    if (balance) {
      balances.push(balance)
    }
  }

  return {
    ...state,
    balances,
    wallet: await uniswap.getWalletAddress(),
    lastUpdate: Date.now(),
  }
}

export async function updateBasePositions(
  state: BaseContextState,
  uniswap: UniswapV4Client,
  positions: Array<{ address: string; symbol: string; entryPrice: number }>
): Promise<BaseContextState> {
  const updatedPositions: BasePosition[] = []

  for (const pos of positions) {
    const balance = await uniswap.getBalance(pos.address)
    const currentPrice = await uniswap.getTokenPrice(pos.address)

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

export async function getUniswapV4SwapRoute(
  uniswap: UniswapV4Client,
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  fee: number = 3000
): Promise<{
  quote: UniswapV4Quote | null
  priceImpact: number
  outputAmount: string
}> {
  const quote = await uniswap.getQuote(tokenIn, tokenOut, amountIn, fee)

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

export async function estimateBaseSwapCost(
  uniswap: UniswapV4Client,
  tokenIn: string,
  tokenOut: string,
  amountIn: string
): Promise<{
  estimatedOutput: string
  priceImpact: number
  fee: number
}> {
  const quote = await uniswap.getQuote(tokenIn, tokenOut, amountIn)

  if (!quote) {
    return {
      estimatedOutput: "0",
      priceImpact: 0,
      fee: 0,
    }
  }

  const fee = 0.001 // Base fee (0.1%)

  return {
    estimatedOutput: quote.amountOut,
    priceImpact: quote.priceImpact,
    fee,
  }
}

// Common Base token addresses
export const BASE_TOKENS = {
  ETH: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  USDbC: "0xd9aAEc86B65D86f6A7B630E7ee733E0B47CfB24f",
  DAI: "0x50c5725949A6F0c72E6C4a641F14122319047A17",
  WETH: "0x4200000000000000000000000000000000000006",
}

export const UNISWAP_V4_COMMON_ROUTES = {
  ETH_USDC: {
    from: BASE_TOKENS.ETH,
    to: BASE_TOKENS.USDC,
    fee: 3000,
  },
  USDC_ETH: {
    from: BASE_TOKENS.USDC,
    to: BASE_TOKENS.ETH,
    fee: 3000,
  },
  ETH_USDbC: {
    from: BASE_TOKENS.ETH,
    to: BASE_TOKENS.USDbC,
    fee: 3000,
  },
  USDbC_ETH: {
    from: BASE_TOKENS.USDbC,
    to: BASE_TOKENS.ETH,
    fee: 3000,
  },
}
