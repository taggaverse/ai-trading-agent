import { createDreamsRouterAuth } from "@daydreamsai/router"
import { getAccount } from "@daydreamsai/x402"
import config from "../config/index.js"
import logger from "../utils/logger.js"

export interface DreamsRouterInstance {
  dreamsRouter: any
  account: any
}

export async function initializeDreamsRouter(): Promise<DreamsRouterInstance> {
  try {
    logger.info("Initializing Dreams Router with x402...")

    // Get x402 account
    const account = await getAccount({
      privateKey: config.X402_PRIVATE_KEY,
      walletAddress: config.X402_WALLET_ADDRESS,
    })

    logger.info(`x402 account initialized: ${config.X402_WALLET_ADDRESS}`)

    // Create router with x402 payments
    const { dreamsRouter } = await createDreamsRouterAuth(account, {
      payments: {
        amount: "100000", // $0.10 USDC per request
        network: config.X402_NETWORK,
      },
    })

    logger.info("Dreams Router initialized successfully")

    return { dreamsRouter, account }
  } catch (error) {
    logger.error("Failed to initialize Dreams Router:", error)
    throw error
  }
}

export function selectModel(urgency: "low" | "medium" | "high" | "critical") {
  const models = {
    critical: "groq/llama-3.1-405b-reasoning", // $0.01, fastest
    high: "google-vertex/gemini-2.5-flash", // $0.02, fast
    medium: "openai/gpt-4o", // $0.10, best quality
    low: "anthropic/claude-3-5-sonnet-20241022", // $0.05, excellent reasoning
  }

  return models[urgency]
}
