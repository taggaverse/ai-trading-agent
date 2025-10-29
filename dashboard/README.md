# AI Trading Agent Dashboard

A real-time monitoring dashboard for the AI trading agent. Displays live metrics, P&L charts, decision logs, and unit economics.

## Features

- **Real-time Metrics**: Live balance, P&L, trades, and win rate
- **P&L Charts**: Cumulative P&L and confidence tracking over time
- **Decision Log**: Recent trading decisions with confidence scores
- **Trade History**: Active positions and wallet balances across chains
- **Unit Economics**: Service costs (Dreams Router, x402) and profit analysis
- **Multi-chain Support**: View positions and balances across all 4 chains

## Quick Start

### Prerequisites
- Node.js 18+
- Trading agent running on `http://localhost:3000`

### Installation

```bash
cd dashboard
npm install
```

### Development

```bash
npm run dev
```

Dashboard will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Dashboard Sections

### Header
- Agent status (Live/Offline)
- Uptime tracking
- Active chains indicator

### Stats Grid (6 cards)
- Total Balance
- Total P&L
- Total Trades
- Win Rate
- Used Margin
- Available Margin

### Charts
- **Cumulative P&L**: Area chart showing profit/loss over time
- **Confidence & Volume**: Line chart showing trade confidence and total trades

### Decision Log
- Recent 10 trading decisions
- Timestamp, symbol, confidence, and action (Execute/Monitor/Skip)
- Color-coded by decision type

### Unit Economics
- Dreams Router costs ($0.01 per decision)
- x402 Research costs ($0.05 per query)
- Total service costs per trade
- Gross vs Net profit
- Profit margin and ROI

### Trade History
- Active positions table (symbol, size, entry/current price, P&L, chain)
- Wallet balances table (chain, amount, USD value)

## API Integration

Dashboard connects to the trading agent API:

```
GET /health       - Agent status and uptime
GET /stats        - Trading statistics
GET /portfolio    - Positions and balances
GET /diary        - Decision history
```

Auto-refreshes every 5 seconds.

## Styling

- Dark theme optimized for trading
- Responsive design (desktop, tablet, mobile)
- Real-time color coding (green for positive, red for negative)
- Glassmorphism effects with backdrop blur

## Customization

### Change Refresh Rate
Edit `src/App.jsx`:
```javascript
const interval = setInterval(fetchData, 5000) // Change 5000 to desired ms
```

### Adjust Service Costs
Edit `src/components/UnitEconomics.jsx`:
```javascript
const routerCostPerDecision = 0.01 // Change Dreams Router cost
const researchCostPerQuery = 0.05 // Change x402 research cost
```

### Modify Charts
Edit `src/components/ChartsSection.jsx` to add/remove data series or change chart types.

## Troubleshooting

**Dashboard shows "Connection Error"**
- Ensure trading agent is running: `npm start` in the main project
- Check agent is on port 3000
- Check browser console for CORS issues

**Data not updating**
- Check network tab in browser DevTools
- Verify API endpoints are responding
- Check agent logs for errors

## Performance

- Lightweight React app (~50KB gzipped)
- Efficient re-renders with React hooks
- Recharts for optimized chart rendering
- Auto-cleanup of intervals on unmount

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT
