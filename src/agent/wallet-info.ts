import { ethers } from "ethers"
import { Keypair, PublicKey, Connection } from "@solana/web3.js"
import bs58 from "bs58"
import config from "../config/index.js"
import logger from "../utils/logger.js"

// @ts-ignore - bs58 doesn't have types
const bs58Lib = bs58

export interface WalletInfo {
  chain: string
  address: string
  balance: number
  gasToken: string
}

export class WalletManager {
  // Get Ethereum-based addresses (Base, BSC)
  static getEthereumAddress(privateKey: string): string {
    try {
      const wallet = new ethers.Wallet(privateKey)
      return wallet.address
    } catch (error) {
      logger.error(`Failed to derive Ethereum address: ${error}`)
      return ""
    }
  }

  // Get Solana address
  static getSolanaAddress(privateKey: string): string {
    try {
      let secretKey: Uint8Array
      
      logger.info(`Solana key type: ${typeof privateKey}, length: ${privateKey?.length || 0}`)
      logger.info(`First 50 chars: ${privateKey?.substring(0, 50)}`)
      
      // Try parsing as JSON array first
      try {
        const arr = JSON.parse(privateKey)
        logger.info(`Parsed as JSON array, length: ${arr.length}`)
        if (Array.isArray(arr) && arr.length === 64) {
          secretKey = new Uint8Array(arr)
          logger.info("✓ Successfully parsed as JSON array")
        } else {
          throw new Error(`Not a valid 64-element array, got ${arr.length}`)
        }
      } catch (e: any) {
        logger.info(`JSON parse failed: ${e.message}`)
        // Try as Base58
        try {
          secretKey = bs58Lib.decode(privateKey)
          logger.info("✓ Successfully parsed as Base58")
        } catch (e2: any) {
          logger.info(`Base58 parse failed: ${e2.message}`)
          // Try as hex
          if (privateKey.startsWith('0x')) {
            secretKey = new Uint8Array(Buffer.from(privateKey.slice(2), 'hex'))
            logger.info("✓ Successfully parsed as hex")
          } else {
            throw new Error("Could not parse Solana private key - not JSON, Base58, or hex")
          }
        }
      }
      
      const keypair = Keypair.fromSecretKey(secretKey)
      logger.info(`✓ Derived Solana address: ${keypair.publicKey.toString()}`)
      return keypair.publicKey.toString()
    } catch (error) {
      logger.error(`Failed to derive Solana address: ${error}`)
      return ""
    }
  }

  // Get all wallet addresses
  static getAllAddresses(): Record<string, string> {
    const addresses: Record<string, string> = {}
    
    try {
      if (config.BASE_PRIVATE_KEY && config.BASE_PRIVATE_KEY !== "" && !config.BASE_PRIVATE_KEY.includes("...")) {
        addresses.base = this.getEthereumAddress(config.BASE_PRIVATE_KEY)
      } else {
        logger.warn("BASE_PRIVATE_KEY is empty or placeholder")
      }
    } catch (e) {
      logger.warn("Failed to derive Base address")
    }
    
    try {
      if (config.HYPERLIQUID_PRIVATE_KEY && config.HYPERLIQUID_PRIVATE_KEY !== "") {
        addresses.hyperliquid = this.getEthereumAddress(config.HYPERLIQUID_PRIVATE_KEY)
      }
    } catch (e) {
      logger.warn("Failed to derive Hyperliquid address")
    }
    
    return addresses
  }

  // Get Solana balance
  static async getSolanaBalance(address: string): Promise<number> {
    try {
      const connection = new Connection("https://api.mainnet-beta.solana.com")
      const publicKey = new PublicKey(address)
      const balance = await connection.getBalance(publicKey)
      return balance / 1e9 // Convert lamports to SOL
    } catch (error) {
      logger.error(`Failed to get Solana balance: ${error}`)
      return 0
    }
  }

  // Get Ethereum-based balance (ETH/BNB)
  static async getEthereumBalance(
    address: string,
    rpcUrl: string
  ): Promise<number> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const balance = await provider.getBalance(address)
      return parseFloat(ethers.formatEther(balance))
    } catch (error) {
      logger.error(`Failed to get Ethereum balance: ${error}`)
      return 0
    }
  }

  // Get all balances
  static async getAllBalances(): Promise<Record<string, WalletInfo>> {
    const addresses = this.getAllAddresses()

    const balances: Record<string, WalletInfo> = {}

    // Base (ETH)
    if (addresses.base) {
      const ethBalance = await this.getEthereumBalance(
        addresses.base,
        "https://mainnet.base.org"
      )
      balances.base = {
        chain: "base",
        address: addresses.base,
        balance: ethBalance,
        gasToken: "ETH",
      }
    }

    // Solana (SOL)
    if (addresses.solana) {
      const solBalance = await this.getSolanaBalance(addresses.solana)
      balances.solana = {
        chain: "solana",
        address: addresses.solana,
        balance: solBalance,
        gasToken: "SOL",
      }
    }

    // BSC (BNB)
    if (addresses.bsc) {
      const bnbBalance = await this.getEthereumBalance(
        addresses.bsc,
        "https://bsc-dataseed1.binance.org:8545"
      )
      balances.bsc = {
        chain: "bsc",
        address: addresses.bsc,
        balance: bnbBalance,
        gasToken: "BNB",
      }
    }

    // Hyperliquid (ETH address, but USDC balance)
    if (addresses.hyperliquid) {
      balances.hyperliquid = {
        chain: "hyperliquid",
        address: addresses.hyperliquid,
        balance: 0, // Would need Hyperliquid API
        gasToken: "USDC",
      }
    }

    return balances
  }
}
