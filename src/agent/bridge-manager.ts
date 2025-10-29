import axios from "axios"
import logger from "../utils/logger.js"

export interface BridgeQuote {
  chain: number
  expected: number
  gas: number
  speed: number
  usd: number
}

export interface BridgeQuoteResponse {
  quotes: (BridgeQuote | { chain: number; error: string })[]
  error?: string
  calldata?: string
  expires?: number
}

export class BridgeManager {
  private static readonly GAS_ZIP_API = "https://backend.gas.zip/v2"
  
  // Chain ID mappings
  private static readonly CHAIN_IDS = {
    ethereum: 1,
    base: 8453,
    solana: 900, // Solana is not directly supported by Gas.zip, use bridge via Ethereum
    bsc: 56,
    arbitrum: 42161,
    optimism: 10,
    polygon: 137,
  }

  /**
   * Get a quote for bridging gas tokens across chains
   * @param fromChain - Source chain (ethereum, base, bsc, etc.)
   * @param toChains - Destination chains
   * @param amountWei - Amount in wei to bridge
   * @param fromAddress - Sender address (optional, for calldata)
   * @param toAddress - Recipient address (optional, for calldata)
   */
  static async getQuote(
    fromChain: string,
    toChains: string[],
    amountWei: string,
    fromAddress?: string,
    toAddress?: string
  ): Promise<BridgeQuoteResponse> {
    try {
      const fromChainId = this.CHAIN_IDS[fromChain as keyof typeof this.CHAIN_IDS]
      if (!fromChainId) {
        throw new Error(`Unsupported source chain: ${fromChain}`)
      }

      const toChainIds = toChains
        .map(chain => this.CHAIN_IDS[chain as keyof typeof this.CHAIN_IDS])
        .filter(id => id !== undefined)
        .join(",")

      if (!toChainIds) {
        throw new Error(`No supported destination chains: ${toChains.join(", ")}`)
      }

      let url = `${this.GAS_ZIP_API}/quotes/${fromChainId}/${amountWei}/${toChainIds}`
      
      // Add calldata parameters if addresses provided
      if (fromAddress && toAddress) {
        url += `?from=${fromAddress}&to=${toAddress}`
      }

      logger.info(`Fetching bridge quote: ${url}`)
      const response = await axios.get<BridgeQuoteResponse>(url)
      
      logger.info(`Bridge quote received:`, response.data)
      return response.data
    } catch (error: any) {
      logger.error(`Failed to get bridge quote: ${error.message}`)
      throw error
    }
  }

  /**
   * Check if rebalancing is needed across chains
   * @param balances - Current balances on each chain
   * @param minGasPerChain - Minimum gas required per chain
   */
  static shouldRebalance(
    balances: Record<string, number>,
    minGasPerChain: Record<string, number>
  ): { needsRebalance: boolean; deficitChains: string[]; surplusChains: string[] } {
    const deficitChains: string[] = []
    const surplusChains: string[] = []

    for (const [chain, balance] of Object.entries(balances)) {
      const minRequired = minGasPerChain[chain] || 0
      if (balance < minRequired) {
        deficitChains.push(chain)
      } else if (balance > minRequired * 2) {
        surplusChains.push(chain)
      }
    }

    return {
      needsRebalance: deficitChains.length > 0 && surplusChains.length > 0,
      deficitChains,
      surplusChains,
    }
  }

  /**
   * Calculate optimal bridge amount
   * @param surplusBalance - Balance on surplus chain
   * @param deficitRequired - Amount needed on deficit chain
   * @param minKeep - Minimum to keep on surplus chain
   */
  static calculateBridgeAmount(
    surplusBalance: number,
    deficitRequired: number,
    minKeep: number = 0.1
  ): number {
    const available = surplusBalance - minKeep
    const needed = deficitRequired
    return Math.min(available, needed)
  }

  /**
   * Format amount to wei (assuming 18 decimals)
   */
  static toWei(amount: number): string {
    return Math.floor(amount * 1e18).toString()
  }

  /**
   * Format wei to amount (assuming 18 decimals)
   */
  static fromWei(wei: string): number {
    return parseInt(wei) / 1e18
  }

  /**
   * Get recommended bridge route
   */
  static async getRecommendedRoute(
    fromChain: string,
    toChain: string,
    amountEth: number
  ): Promise<{ quote: BridgeQuote; estimatedTime: string; estimatedCost: string } | null> {
    try {
      const amountWei = this.toWei(amountEth)
      const response = await this.getQuote(fromChain, [toChain], amountWei)

      if (response.error) {
        logger.error(`Bridge quote error: ${response.error}`)
        return null
      }

      const quote = response.quotes[0]
      if ("error" in quote) {
        logger.error(`Bridge quote error for chain: ${quote.error}`)
        return null
      }

      return {
        quote,
        estimatedTime: `${quote.speed}s`,
        estimatedCost: `$${quote.usd.toFixed(2)}`,
      }
    } catch (error: any) {
      logger.error(`Failed to get recommended route: ${error.message}`)
      return null
    }
  }
}
