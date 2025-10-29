# AI Hedge Fund Trading Agent

An AI-powered trading agent that implements hedge fund-like trading strategies using the Daydream Agent Platform and x402 for compute payments.

## Features

- **Automated Trading**: Implements algorithmic trading strategies
- **Risk Management**: Configurable risk parameters and position sizing
- **Multi-asset Support**: Trade multiple cryptocurrency pairs
- **x402 Integration**: Pay for compute resources with x402
- **Technical Analysis**: Uses various indicators for trade signals

## Prerequisites

- Python 3.8+
- Exchange API credentials (e.g., Binance)
- Daydream Agent Platform API key
- x402 wallet for compute payments

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd trading-agent
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy the example environment file and update with your credentials:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your API keys and configuration.

## Configuration

Edit the `.env` file with your configuration:

```
# Daydream Agent Platform
DAYDREAM_API_KEY=your_daydream_api_key
DAYDREAM_AGENT_ID=your_agent_id

# Exchange API (e.g., Binance)
EXCHANGE_API_KEY=your_api_key
EXCHANGE_SECRET=your_api_secret

# x402 Payment
X402_WALLET_ADDRESS=your_wallet_address
X402_PRIVATE_KEY=your_private_key

# Trading Parameters
RISK_PERCENTAGE=1.0  # 1% risk per trade
LEVERAGE=10          # 10x leverage
TRADING_PAIRS=BTC/USDT,ETH/USDT  # Pairs to trade
```

## Usage

Run the trading agent:

```bash
python trading_agent.py
```

The agent will:
1. Connect to the exchange and Daydream platform
2. Start monitoring the configured trading pairs
3. Execute trades based on the strategy
4. Use x402 to pay for compute resources

## Trading Strategy

The current implementation uses a simple moving average crossover strategy:
- **Buy Signal**: When 20-period SMA crosses above 50-period SMA
- **Sell Signal**: When 20-period SMA crosses below 50-period SMA
- **Risk Management**: 2% stop loss and 3% take profit by default

## Customization

You can modify the trading strategy by editing the following methods in `trading_agent.py`:
- `calculate_indicators()`: Add or modify technical indicators
- `generate_signals()`: Define your own trading signals
- `execute_trade()`: Customize order execution logic

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This software is for educational purposes only. Use at your own risk. The authors are not responsible for any losses incurred while using this software. Always test with small amounts first and never risk more than you can afford to lose.
