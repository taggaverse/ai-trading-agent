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

const app = express()

// Middleware
app.use(express.json())

// Store for trading data
const tradingData = {
  decisions: [] as any[],
  positions: {} as Record<string, any>,
  balances: {} as Record<string, number>,
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

// Diary endpoint (recent trading decisions)
app.get("/diary", (req, res) => {
  const limit = parseInt(req.query.limit as string) || 200
  res.json(tradingData.decisions.slice(-limit))
})

// Portfolio endpoint
app.get("/portfolio", (req, res) => {
  res.json({
    positions: tradingData.positions,
    balances: tradingData.balances,
    stats: tradingData.stats,
    timestamp: new Date().toISOString(),
  })
})

// Chains endpoint
app.get("/chains", (req, res) => {
  res.json({
    active: chains,
    primary: config.PRIMARY_CHAIN,
    timestamp: new Date().toISOString(),
  })
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
    logger.info(`Primary chain: ${config.PRIMARY_CHAIN}`)

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

    // Start API server
    app.listen(apiPort, apiHost, () => {
      logger.info(`📊 Monitoring API running on http://${apiHost}:${apiPort}`)
      logger.info(`   - Health: http://${apiHost}:${apiPort}/health`)
      logger.info(`   - Diary: http://${apiHost}:${apiPort}/diary`)
      logger.info(`   - Portfolio: http://${apiHost}:${apiPort}/portfolio`)
      logger.info(`   - Chains: http://${apiHost}:${apiPort}/chains`)
      logger.info(`   - Stats: http://${apiHost}:${apiPort}/stats`)
    })

    // Main trading loop
    logger.info(`Starting trading loop (interval: ${tradingInterval}ms)`)

    let iteration = 0
    let tradingContext_state = await tradingContext.create({ args: { accountId: "main" } })

    while (true) {
      iteration++
      logger.info(`\n=== Trading Iteration ${iteration} ===`)

      try {
        // Check balance before making decision
        if (!await balanceManager.canMakeDecision()) {
          logger.warn("Insufficient balance for trading decision. Pausing...")
          
          if (!await balanceManager.checkAndRefill()) {
            logger.error("Failed to refill balance. Stopping agent.")
            break
          }
        }

        const currentBalance = await balanceManager.getBalance()
        logger.info(`Current balance: $${currentBalance}`)

        // 1. Update Market Context (simplified - would fetch real OHLCV data)
        const market_state = await marketContext.create({
          args: { symbol: "BTC/USDC", chain: "base" }
        })
        
        // 2. Query Research via x402
        const { narratives, projects } = await queryResearch("BTC", x402Client)
        const research_state = await researchContext.create({ args: { symbol: "BTC" } })
        
        // 3. Initialize Portfolio Context
        const portfolio_state = await portfolioContext.create({ args: { accountId: "main" } })
        
        // 4. Initialize Risk Context
        const risk_state = await riskContext.create({ args: { accountId: "main" } })

        // 5. Generate trading opportunities
        const opportunities = generateTradingOpportunities(tradingContext_state)

        if (opportunities.length > 0) {
          logger.info(`Found ${opportunities.length} trading opportunities`)

          for (const opportunity of opportunities) {
            logTradingOpportunity(opportunity)

            // Evaluate decision
            const decision = evaluateTradingDecision(opportunity, tradingContext_state)

            if (decision.action === "execute") {
              logger.info(`Executing trade: ${opportunity.symbol} on ${opportunity.chain}`)

              try {
                // Execute trade
                const tradeResult = await executeTrade({
                  opportunity,
                  // Pass clients as needed
                })

                if (tradeResult.success) {
                  logger.info(`Trade executed: ${tradeResult.orderId}`)
                  tradingData.stats.totalTrades++
                  tradingData.stats.totalProfit += tradeResult.position.pnl
                }
              } catch (error) {
                logger.error("Trade execution failed:", error)
              }
            } else if (decision.action === "monitor") {
              logger.info(`Monitoring opportunity: ${opportunity.symbol}`)
            } else {
              logger.info(`Skipping opportunity: ${opportunity.symbol} (${decision.reason})`)
            }

            // Record decision
            tradingData.decisions.push({
              iteration,
              timestamp: new Date().toISOString(),
              opportunity: opportunity.symbol,
              decision: decision.action,
              confidence: opportunity.confidence,
              balance: currentBalance,
            })
          }
        } else {
          logger.info("No trading opportunities found")
        }

        // Check risk and manage if needed
        if (risk_state.alerts.length > 0) {
          logger.warn(`${risk_state.alerts.length} risk alerts detected`)
          
          const riskResult = await manageRisk({
            portfolio: portfolio_state,
            risk: risk_state,
          })

          if (riskResult.alertsHandled > 0) {
            logger.warn(`${riskResult.alertsHandled} risk alerts handled`)
          }
        }

        // Check if should stop trading
        if (shouldStopTrading(risk_state)) {
          logger.error("Risk limits exceeded - stopping trading")
          break
        }

        // Log summary
        const summary = getTradingContextSummary(tradingContext_state)
        logger.info(`Portfolio: Balance=$${summary.totalBalance}, P&L=$${summary.totalPnl}, Risk=${summary.riskLevel}`)

        // Keep only last 1000 decisions
        if (tradingData.decisions.length > 1000) {
          tradingData.decisions = tradingData.decisions.slice(-1000)
        }

        // Wait for next interval
        await new Promise(resolve => setTimeout(resolve, tradingInterval))

      } catch (error) {
        logger.error(`Error in trading iteration ${iteration}:`, error)
        await new Promise(resolve => setTimeout(resolve, tradingInterval))
      }
    }

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
