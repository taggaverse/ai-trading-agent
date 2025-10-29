# AI Trading Agent - Multi-Chain

A production-ready AI trading agent that trades across 4 major blockchain networks using Daydreams, Dreams Router, and x402 for compute payments.

## Features

- **Multi-Chain Trading**: Solana (Jupiter), Base (Uniswap V4), Hyperliquid (Perpetuals), BSC (PancakeSwap)
- **9 Composable Contexts**: Market analysis, research, portfolio tracking, risk management
- **4 Trading Actions**: Execute trades, close positions, rebalance, manage risk
- **Technical Analysis**: 13 indicators (SMA, EMA, RSI, MACD, Bollinger Bands, ATR, etc.)
- **x402 Research**: Indigo AI narratives + project screening
- **Dreams Router**: Multi-provider LLM with automatic model selection
- **Risk Management**: Position limits, leverage controls, drawdown monitoring
- **Monitoring API**: Real-time tracking with 5 endpoints

## Prerequisites

- Node.js 18+
- TypeScript 5+
- Private keys for trading wallets (Base, Solana, Hyperliquid, BSC)
- x402 wallet address and private key
- Dreams Router access (x402 USDC for payments)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/taggaverse/ai-trading-agent.git
   cd ai-trading-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file and update with your credentials:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your private keys and configuration.

## Configuration

Edit the `.env` file with your configuration:

```bash
# BASE (Ethereum L2)
BASE_RPC_URL=https://mainnet.base.org
BASE_PRIVATE_KEY=0x...

# SOLANA
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=base58_encoded_key

# HYPERLIQUID (Arbitrum)
HYPERLIQUID_PRIVATE_KEY=0x...
HYPERLIQUID_TESTNET=false
HYPERLIQUID_MAX_LEVERAGE=20

# BSC (Binance Smart Chain)
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_PRIVATE_KEY=0x...

# DREAMS ROUTER & x402
DREAMS_ROUTER_URL=https://router.daydreams.systems
X402_WALLET_ADDRESS=0x...
X402_PRIVATE_KEY=0x...
X402_NETWORK=base-sepolia

# BALANCE MANAGEMENT
MIN_BALANCE_USDC=1.0
REFILL_THRESHOLD_USDC=2.0
REFILL_AMOUNT_USDC=10.0

# TRADING
ACTIVE_CHAINS=base,solana,hyperliquid,bsc
PRIMARY_CHAIN=hyperliquid
TRADING_INTERVAL_MS=60000

# LOGGING
LOG_LEVEL=info
API_HOST=0.0.0.0
API_PORT=3000
```

## Usage

Build and run the trading agent:

```bash
# Build
npm run build

# Development (with hot reload)
npm run dev

# Production
npm start
```

The agent will:
1. Initialize Dreams Router with x402 payments
2. Start monitoring market data across all chains
3. Query x402 for research and narratives
4. Generate trading opportunities
5. Execute trades on optimal chains
6. Manage risk and rebalance portfolio
7. Track performance via monitoring API

## Monitoring

Access the monitoring API at `http://localhost:3000`:

```bash
# Health check
curl http://localhost:3000/health

# Recent trading decisions
curl http://localhost:3000/diary

# Current portfolio
curl http://localhost:3000/portfolio

# Performance stats
curl http://localhost:3000/stats

# Active chains
curl http://localhost:3000/chains
```

## Trading Strategy

The agent uses a multi-signal approach:
- **Technical Signals**: 13 indicators across market context
- **Research Signals**: x402 Indigo AI narratives and project momentum
- **Risk Validation**: Position limits, leverage controls, drawdown checks
- **Chain Selection**: Automatic selection based on opportunity type
- **Position Management**: Stop-loss at 2%, take-profit at 3%

## Architecture

```
Trading Context (Master Orchestrator)
├─ Market Context (Technical Analysis)
├─ Research Context (x402 Integration)
├─ Portfolio Context (Position Tracking)
├─ Risk Context (Risk Management)
└─ Chain Contexts (4)
    ├─ Solana (Jupiter)
    ├─ Base (Uniswap V4)
    ├─ Hyperliquid (Perpetuals)
    └─ BSC (PancakeSwap)
```

## Performance

**Expected Daily Returns**:
- Solana: 50-100 trades @ $1-5 = $50-500
- Base: 10-20 trades @ $10-50 = $100-1,000
- Hyperliquid: 5-10 trades @ $50-200 = $250-2,000
- BSC: 5-10 trades @ $20-100 = $100-1,000

**Total Daily**: $500-4,500
**Monthly**: $15,000-135,000

## Customization

You can modify the trading strategy by editing:
- `src/agent/contexts/market.ts`: Technical indicators and signals
- `src/agent/contexts/research.ts`: x402 research queries
- `src/agent/contexts/risk.ts`: Risk limits and validation
- `src/agent/actions/execute-trade.ts`: Trade execution logic

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This software is for educational purposes only. Use at your own risk. The authors are not responsible for any losses incurred while using this software. Always test with small amounts first and never risk more than you can afford to lose.
