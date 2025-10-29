import os
import ccxt
import pandas as pd
import numpy as np
from datetime import datetime
from dotenv import load_dotenv
from typing import Dict, List, Optional
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class X402PaymentHandler:
    """Handles x402 payments for compute resources."""
    
    def __init__(self, wallet_address: str, private_key: str):
        self.wallet_address = wallet_address
        self.private_key = private_key
        # Initialize x402 client here (placeholder)
        # self.client = X402Client(wallet_address, private_key)
    
    def make_payment(self, amount: float) -> bool:
        """Make a payment using x402."""
        try:
            # Placeholder for x402 payment logic
            # tx_hash = self.client.pay(amount)
            logger.info(f"Paid {amount} x402 for compute")
            return True
        except Exception as e:
            logger.error(f"Payment failed: {str(e)}")
            return False

class HedgeFundTradingAgent:
    """AI trading agent that implements hedge fund-like strategies."""
    
    def __init__(self, config: Dict):
        self.config = config
        self.exchange = self._initialize_exchange()
        self.payment_handler = X402PaymentHandler(
            wallet_address=os.getenv('X402_WALLET_ADDRESS'),
            private_key=os.getenv('X402_PRIVATE_KEY')
        )
        self.positions = {}
        self.trading_pairs = config.get('trading_pairs', ['BTC/USDT'])
        
    def _initialize_exchange(self):
        """Initialize the cryptocurrency exchange connection."""
        exchange = ccxt.binance({
            'apiKey': os.getenv('EXCHANGE_API_KEY'),
            'secret': os.getenv('EXCHANGE_SECRET'),
            'enableRateLimit': True,
            'options': {
                'defaultType': 'future',  # for futures trading
            },
        })
        return exchange
    
    def fetch_market_data(self, symbol: str, timeframe: str = '1h', limit: int = 100) -> pd.DataFrame:
        """Fetch historical market data for analysis."""
        try:
            ohlcv = self.exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            return df
        except Exception as e:
            logger.error(f"Error fetching market data for {symbol}: {str(e)}")
            return pd.DataFrame()
    
    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate technical indicators for the given market data."""
        # Simple moving averages
        df['sma_20'] = df['close'].rolling(window=20).mean()
        df['sma_50'] = df['close'].rolling(window=50).mean()
        
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        return df
    
    def generate_signals(self, df: pd.DataFrame) -> Dict:
        """Generate trading signals based on indicators."""
        signals = {
            'buy': False,
            'sell': False,
            'stop_loss': None,
            'take_profit': None
        }
        
        if len(df) < 50:  # Not enough data
            return signals
            
        # Simple crossover strategy
        last_row = df.iloc[-1]
        prev_row = df.iloc[-2]
        
        # Bullish signal: 20 SMA crosses above 50 SMA
        if (prev_row['sma_20'] <= prev_row['sma_50']) and (last_row['sma_20'] > last_row['sma_50']):
            signals['buy'] = True
            signals['stop_loss'] = last_row['close'] * 0.98  # 2% stop loss
            signals['take_profit'] = last_row['close'] * 1.03  # 3% take profit
        
        # Bearish signal: 20 SMA crosses below 50 SMA
        elif (prev_row['sma_20'] >= prev_row['sma_50']) and (last_row['sma_20'] < last_row['sma_50']):
            signals['sell'] = True
        
        return signals
    
    def execute_trade(self, symbol: str, signal: Dict):
        """Execute a trade based on the signal."""
        try:
            if signal['buy']:
                # Calculate position size based on risk management
                balance = self.exchange.fetch_balance()['USDT']['free']
                risk_amount = balance * (self.config.get('risk_percentage', 0.01))  # Default 1% risk
                
                # Get current price and calculate position size
                ticker = self.exchange.fetch_ticker(symbol)
                entry_price = ticker['last']
                
                # Calculate position size (simplified)
                position_size = (risk_amount * self.config.get('leverage', 10)) / entry_price
                
                # Place order (example for long position)
                order = self.exchange.create_market_buy_order(
                    symbol=symbol,
                    amount=position_size,
                    params={'leverage': self.config.get('leverage', 10)}
                )
                
                # Store position information
                self.positions[symbol] = {
                    'entry_price': entry_price,
                    'stop_loss': signal['stop_loss'],
                    'take_profit': signal['take_profit'],
                    'size': position_size,
                    'side': 'long',
                    'timestamp': datetime.utcnow()
                }
                
                logger.info(f"Opened long position on {symbol} at {entry_price}")
                
            elif signal['sell'] and symbol in self.positions:
                # Close existing position
                position = self.positions[symbol]
                order = self.exchange.create_market_sell_order(
                    symbol=symbol,
                    amount=position['size']
                )
                
                # Calculate P&L
                exit_price = order['price']
                pnl_pct = ((exit_price - position['entry_price']) / position['entry_price']) * 100
                
                logger.info(f"Closed position on {symbol} at {exit_price}. P&L: {pnl_pct:.2f}%")
                
                # Remove from active positions
                del self.positions[symbol]
                
        except Exception as e:
            logger.error(f"Trade execution failed: {str(e)}")
    
    def monitor_positions(self):
        """Monitor open positions and manage risk."""
        for symbol, position in list(self.positions.items()):
            try:
                ticker = self.exchange.fetch_ticker(symbol)
                current_price = ticker['last']
                
                # Check stop loss
                if (position['side'] == 'long' and current_price <= position['stop_loss']) or \
                   (position['side'] == 'short' and current_price >= position['stop_loss']):
                    logger.info(f"Stop loss triggered for {symbol} at {current_price}")
                    self.execute_trade(symbol, {'sell': True})
                
                # Check take profit
                elif (position['side'] == 'long' and current_price >= position['take_profit']) or \
                     (position['side'] == 'short' and current_price <= position['take_profit']):
                    logger.info(f"Take profit triggered for {symbol} at {current_price}")
                    self.execute_trade(symbol, {'sell': True})
                    
            except Exception as e:
                logger.error(f"Error monitoring position {symbol}: {str(e)}")
    
    def run(self):
        """Main trading loop."""
        logger.info("Starting hedge fund trading agent...")
        
        while True:
            try:
                # Pay for compute with x402
                if not self.payment_handler.make_payment(amount=0.1):  # Example: 0.1 x402 per cycle
                    logger.error("Insufficient x402 balance. Stopping...")
                    break
                
                # Process each trading pair
                for symbol in self.trading_pairs:
                    # Fetch and analyze market data
                    df = self.fetch_market_data(symbol)
                    if df.empty:
                        continue
                        
                    # Calculate indicators and generate signals
                    df = self.calculate_indicators(df)
                    signals = self.generate_signals(df)
                    
                    # Execute trades based on signals
                    if signals['buy'] or signals['sell']:
                        self.execute_trade(symbol, signals)
                
                # Monitor and manage open positions
                self.monitor_positions()
                
                # Sleep for a while before next iteration
                # (in a real implementation, use proper scheduling)
                import time
                time.sleep(60)  # 1 minute
                
            except KeyboardInterrupt:
                logger.info("Shutting down trading agent...")
                break
            except Exception as e:
                logger.error(f"Error in main loop: {str(e)}")
                import time
                time.sleep(60)  # Wait before retrying

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    
    # Configuration
    config = {
        'trading_pairs': os.getenv('TRADING_PAIRS', 'BTC/USDT').split(','),
        'risk_percentage': float(os.getenv('RISK_PERCENTAGE', 1.0)) / 100,  # Convert to decimal
        'leverage': int(os.getenv('LEVERAGE', 10)),
    }
    
    # Initialize and run the trading agent
    agent = HedgeFundTradingAgent(config)
    agent.run()
