import express from "express"
import config, { chains, tradingInterval, apiPort, apiHost } from "./config/index.js"
import logger from "./utils/logger.js"
import { initializeDreamsRouter, selectModel } from "./agent/router.js"
import { BalanceManager } from "./agent/balance-manager.js"
import { tradingContext, generateTradingOpportunities, evaluateTradingDecision, getTradingContextSummary, logTradingContext, logTradingOpportunity } from "./agent/contexts/trading.js"
import { marketContext, calculateIndicators, generateSignals, updateMarketState } from "./agent/contexts/market.js"
import { researchContext, X402ResearchClient, queryResearch, updateResearchState } from "./agent/contexts/research.js"
import { portfolioContext, addPosition, addTrade, updateBalance } from "./agent/contexts/portfolio.js"
import { riskContext, updateRiskState, checkRiskLimits } from "./agent/contexts/risk.js"
import { executeTrade } from "./agent/actions/execute-trade.js"
import { closePosition } from "./agent/actions/close-position.js"
import { manageRisk, shouldStopTrading } from "./agent/actions/risk-management.js"
import { WalletManager } from "./agent/wallet-info.js"
import { BridgeManager } from "./agent/bridge-manager.js"
import { hyperliquidExtension } from "./extensions/hyperliquid-extension.js"
import { HYPERLIQUID_TRADING_SYSTEM_PROMPT } from "./agent/hyperliquid-system-prompt.js"
import { HyperliquidAPI } from "./agent/hyperliquid-api.js"
import { IndicatorsClient } from "./agent/indicators-client.js"
import { HyperliquidTradingLoop } from "./agent/hyperliquid-trading-loop.js"
import { X402PaymentManager } from "./agent/x402-payment-manager.js"
import { AixbtcClient } from "./agent/aixbtc-client.js"

const app = express()

// Middleware
app.use(express.json())

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

// Store for trading data
const tradingData = {
  decisions: [] as any[],
  positions: {} as Record<string, any>,
  balances: {
    hyperliquid: { usdc: 0, symbol: "USDC", gasToken: "USDC" },
  } as Record<string, any>,
  stats: {
    totalTrades: 0,
    totalProfit: 0,
    winRate: 0,
    startTime: Date.now(),
  },
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    chains: chains,
    uptime: process.uptime(),
    stats: tradingData.stats,
  })
})

// Store reference to trading loop for diary endpoint
let tradingLoopRef: any = null

// Diary endpoint (recent trading decisions)
app.get("/diary", (req, res) => {
  const limit = parseInt(req.query.limit as string) || 200
  if (tradingLoopRef) {
    const state = tradingLoopRef.getState()
    res.json(state.decisions.slice(-limit))
  } else {
    res.json(tradingData.decisions.slice(-limit))
  }
})

// Portfolio endpoint
app.get("/portfolio", async (req, res) => {
  try {
    const balances = await WalletManager.getAllBalances()
    res.json({
      positions: tradingData.positions,
      balances: balances || tradingData.balances,
      stats: tradingData.stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.warn("Failed to fetch real balances, using cached:", error)
    res.json({
      positions: tradingData.positions,
      balances: tradingData.balances,
      stats: tradingData.stats,
      timestamp: new Date().toISOString(),
    })
  }
})

// Chains endpoint
app.get("/chains", (req, res) => {
  res.json({
    active: chains,
    primary: 'hyperliquid',
    timestamp: new Date().toISOString(),
  })
})

// Wallet addresses endpoint
app.get("/wallets", (req, res) => {
  const addresses = WalletManager.getAllAddresses()
  res.json({
    addresses,
    timestamp: new Date().toISOString(),
  })
})

// Wallet balances endpoint
app.get("/wallets/balances", async (req, res) => {
  try {
    const balances = await WalletManager.getAllBalances()
    res.json({
      balances,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch wallet balances",
      timestamp: new Date().toISOString(),
    })
  }
})

// Bridge quote endpoint
app.get("/bridge/quote", async (req, res) => {
  try {
    const { from, to, amount } = req.query
    
    if (!from || !to || !amount) {
      return res.status(400).json({
        error: "Missing required parameters: from, to, amount",
      })
    }

    const toChains = (to as string).split(",").map(c => c.trim())
    const amountWei = BridgeManager.toWei(parseFloat(amount as string))
    
    const quote = await BridgeManager.getQuote(from as string, toChains, amountWei)
    res.json({
      quote,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to get bridge quote",
      timestamp: new Date().toISOString(),
    })
  }
})

// Bridge rebalance check endpoint
app.post("/bridge/rebalance-check", async (req, res) => {
  try {
    const balances = await WalletManager.getAllBalances()
    
    // Convert to simple balance map
    const balanceMap: Record<string, number> = {}
    const minGasRequired: Record<string, number> = {
      base: 0.01,
      solana: 0.1,
      bsc: 0.01,
      hyperliquid: 0,
    }

    for (const [chain, info] of Object.entries(balances)) {
      balanceMap[chain] = info.balance || 0
    }

    const rebalanceInfo = BridgeManager.shouldRebalance(balanceMap, minGasRequired)
    
    res.json({
      needsRebalance: rebalanceInfo.needsRebalance,
      deficitChains: rebalanceInfo.deficitChains,
      surplusChains: rebalanceInfo.surplusChains,
      currentBalances: balanceMap,
      minRequired: minGasRequired,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to check rebalance",
      timestamp: new Date().toISOString(),
    })
  }
})

// Bridge recommended route endpoint
app.get("/bridge/route", async (req, res) => {
  try {
    const { from, to, amount } = req.query
    
    if (!from || !to || !amount) {
      return res.status(400).json({
        error: "Missing required parameters: from, to, amount",
      })
    }

    const route = await BridgeManager.getRecommendedRoute(
      from as string,
      to as string,
      parseFloat(amount as string)
    )
    
    if (!route) {
      return res.status(400).json({
        error: "Could not find bridge route",
      })
    }

    res.json({
      route,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to get bridge route",
      timestamp: new Date().toISOString(),
    })
  }
})

// Stats endpoint
app.get("/stats", (req, res) => {
  res.json({
    ...tradingData.stats,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

async function main() {
  try {
    logger.info("🚀 Starting AI Trading Agent...")
    logger.info(`Active chains: ${chains.join(", ")}`)
    logger.info(`Primary chain: hyperliquid`)

    // Initialize Dreams Router
    const { dreamsRouter, account } = await initializeDreamsRouter()
    const balanceManager = new BalanceManager(account)

    // Check initial balance
    const initialBalance = await balanceManager.getBalance()
    logger.info(`Initial balance: $${initialBalance}`)

    // Initialize x402 research client
    const x402Client = new X402ResearchClient(
      config.DREAMS_ROUTER_URL,
      config.X402_WALLET_ADDRESS
    )

    // Initialize Hyperliquid API clients
    logger.info("Initializing Hyperliquid API clients...")
    const hyperliquidAPI = new HyperliquidAPI()
    logger.info("✓ HyperliquidAPI initialized")

    const indicatorsClient = new IndicatorsClient(config.TAAPI_API_KEY || 'mock-key')
    logger.info("✓ IndicatorsClient initialized")

    // Initialize Hyperliquid extension
    const hlExtension = hyperliquidExtension(hyperliquidAPI, indicatorsClient, {
      privateKey: config.HYPERLIQUID_PRIVATE_KEY,
      tapiKey: config.TAAPI_API_KEY || 'mock-key',
      network: (config.HYPERLIQUID_NETWORK as 'mainnet' | 'testnet') || 'mainnet'
    })
    logger.info("✓ Hyperliquid extension initialized")

    // Initialize aixbtc client for market insights
    const aixbtcClient = new AixbtcClient()
    logger.info("✓ aixbtc client initialized")

    // Market insights endpoint (via x402)
    app.get("/insights/:asset", async (req, res) => {
      try {
        const asset = req.params.asset.toUpperCase()
        logger.info(`Fetching market insights for ${asset}...`)
        
        const insights = await aixbtcClient.getMarketInsights(asset)
        res.json(insights)
      } catch (error) {
        logger.error("Failed to fetch insights:", error)
        res.status(500).json({
          error: "Failed to fetch market insights",
          message: error instanceof Error ? error.message : "Unknown error"
        })
      }
    })

    // Start API server
    app.listen(apiPort, apiHost, () => {
      logger.info(`📊 Monitoring API running on http://${apiHost}:${apiPort}`)
      logger.info(`   - Health: http://${apiHost}:${apiPort}/health`)
      logger.info(`   - Diary: http://${apiHost}:${apiPort}/diary`)
      logger.info(`   - Portfolio: http://${apiHost}:${apiPort}/portfolio`)
      logger.info(`   - Chains: http://${apiHost}:${apiPort}/chains`)
      logger.info(`   - Stats: http://${apiHost}:${apiPort}/stats`)
    })

    // Initialize x402 Payment Manager
    logger.info("Initializing x402 Payment Manager...")
    const paymentManager = new X402PaymentManager(account, dreamsRouter)
    logger.info("✓ x402 Payment Manager initialized")

    // Initialize Hyperliquid trading loop
    // MAINNET: Start with conservative position sizing
    const isMainnet = config.HYPERLIQUID_NETWORK === 'mainnet'
    const maxPositionSize = isMainnet ? 0.005 : 0.05  // 0.5% on mainnet, 5% on testnet
    const maxLeverage = isMainnet ? 2 : 5              // 2x on mainnet, 5x on testnet
    
    logger.info(`🚀 Trading Loop Configuration:`)
    logger.info(`   Network: ${isMainnet ? 'MAINNET' : 'TESTNET'}`)
    logger.info(`   Max Position Size: ${(maxPositionSize * 100).toFixed(2)}%`)
    logger.info(`   Max Leverage: ${maxLeverage}x`)
    
    const tradingLoop = new HyperliquidTradingLoop(hyperliquidAPI, indicatorsClient, {
      tradingInterval: tradingInterval,
      assets: ['BTC', 'ETH'],
      maxPositionSize: maxPositionSize,
      maxLeverage: maxLeverage
    }, dreamsRouter, paymentManager)
    
    // Store reference for diary endpoint
    tradingLoopRef = tradingLoop

    // Add payment stats endpoint
    app.get("/payments", (req, res) => {
      try {
        const paymentStats = tradingLoop.getPaymentStats()
        const costBreakdown = tradingLoop.getCostBreakdown()
        const monthlyEstimate = tradingLoop.getMonthlyEstimate()
        
        res.json({
          stats: paymentStats,
          breakdown: costBreakdown,
          monthlyEstimate: monthlyEstimate,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        res.status(500).json({
          error: "Failed to fetch payment stats",
          timestamp: new Date().toISOString(),
        })
      }
    })

    // Start trading loop in background
    tradingLoop.start().catch(error => {
      logger.error("Fatal trading loop error:", error)
      process.exit(1)
    })

    // OLD LOOP DISABLED - Using HyperliquidTradingLoop instead
    // Main trading loop
    // logger.info(`Starting trading loop (interval: ${tradingInterval}ms)`)

    // OLD LOOP DISABLED - Using HyperliquidTradingLoop instead
    /*
    let iteration = 0
    let tradingContext_state = await tradingContext.create({ args: { accountId: "main" } })

    while (true) {
      // ... old loop code disabled ...
    }
    */

  } catch (error) {
    logger.error("Fatal error:", error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down gracefully...")
  process.exit(0)
})

process.on("SIGTERM", () => {
  logger.info("Shutting down gracefully...")
  process.exit(0)
})

// Start the agent
main()
