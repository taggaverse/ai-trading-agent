# Research & Decision-Making Logs

This guide shows you where to view all research, decision-making, and trading logs.

## 📊 API Endpoints for Logs

### 1. **Trading Diary** - Decision Log
**Endpoint:** `GET /diary`

View all trading decisions, research queries, and AI reasoning.

```bash
curl http://localhost:3000/diary | python3 -m json.tool
```

**Response includes:**
- Trading decisions made
- Market analysis
- Risk assessments
- Entry/exit reasoning
- AI research queries

**Example:**
```json
[
  {
    "timestamp": "2025-10-28T22:45:56.123Z",
    "type": "decision",
    "decision": "BUY",
    "symbol": "BTC",
    "reasoning": "Strong uptrend with bullish divergence",
    "confidence": 0.85,
    "riskReward": 2.5
  },
  {
    "timestamp": "2025-10-28T22:46:00.456Z",
    "type": "research",
    "query": "BTC market narrative and trends",
    "response": "Bitcoin showing strength due to..."
  }
]
```

---

### 2. **Portfolio State** - Current Positions
**Endpoint:** `GET /portfolio`

View current positions, balances, and P&L.

```bash
curl http://localhost:3000/portfolio | python3 -m json.tool
```

**Response includes:**
- Open positions
- Entry prices and sizes
- Current P&L
- Balance per chain
- Margin usage

---

### 3. **Market Context** - Technical Analysis
**Endpoint:** `GET /market-context`

View current market indicators and signals.

```bash
curl http://localhost:3000/market-context | python3 -m json.tool
```

**Response includes:**
- RSI, MACD, Bollinger Bands
- Support/resistance levels
- Trend direction
- Signal strength

---

### 4. **Trading Stats** - Performance Metrics
**Endpoint:** `GET /stats`

View trading performance and statistics.

```bash
curl http://localhost:3000/stats | python3 -m json.tool
```

**Response includes:**
- Total trades
- Win rate
- Total P&L
- Average trade size
- Sharpe ratio

**Example:**
```json
{
  "totalTrades": 42,
  "totalProfit": 1250.50,
  "winRate": 0.62,
  "averageWin": 45.30,
  "averageLoss": -28.50,
  "largestWin": 250.00,
  "largestLoss": -150.00,
  "uptime": 3600,
  "timestamp": "2025-10-29T05:02:29.462Z"
}
```

---

### 5. **Health Status** - System Status
**Endpoint:** `GET /health`

View agent health, active chains, and uptime.

```bash
curl http://localhost:3000/health | python3 -m json.tool
```

**Response includes:**
- Agent status (ok/error)
- Active chains
- Uptime
- Last trade time

---

## 📁 Log Files

### Agent Log File
**Location:** `/Users/alectaggart/CascadeProjects/windsurf-project/agent.log`

View real-time agent activity:

```bash
# View last 100 lines
tail -100 agent.log

# Follow live logs
tail -f agent.log

# Search for specific events
grep "decision\|research\|trade" agent.log

# View errors only
grep "\[error\]" agent.log

# View warnings
grep "\[warn\]" agent.log
```

**Log Levels:**
- `[info]` - General information
- `[debug]` - Detailed debugging
- `[warn]` - Warnings
- `[error]` - Errors

---

### Dashboard Log File
**Location:** `/Users/alectaggart/CascadeProjects/windsurf-project/dashboard.log`

View dashboard activity:

```bash
tail -100 dashboard.log
```

---

## 🔍 Viewing Research & Decisions

### Option 1: Dashboard UI
Open http://localhost:5173 to see:
- **Decision Log** - Recent trading decisions
- **Charts** - Market analysis and P&L
- **Trade History** - All trades with entry/exit
- **Stats Grid** - Performance metrics

### Option 2: API Endpoints
Use curl to query specific data:

```bash
# Get all decisions
curl http://localhost:3000/diary | jq '.[] | select(.type=="decision")'

# Get all research queries
curl http://localhost:3000/diary | jq '.[] | select(.type=="research")'

# Get portfolio state
curl http://localhost:3000/portfolio

# Get trading stats
curl http://localhost:3000/stats
```

### Option 3: Log Files
Search log files for specific patterns:

```bash
# View all trading decisions
grep "decision" agent.log

# View all AI research queries
grep "Querying" agent.log

# View all trades executed
grep "Executing trade\|Trade executed" agent.log

# View all errors
grep "\[error\]" agent.log
```

---

## 📈 Understanding the Decision Flow

### 1. **Research Phase**
```
Query Indigo AI → Get market narrative → Analyze trends
```
Logs show: `Querying Indigo AI: ...`

### 2. **Analysis Phase**
```
Calculate indicators → Generate signals → Evaluate opportunities
```
Logs show: `Calculating indicators...`, `Generating signals...`

### 3. **Decision Phase**
```
Evaluate risk/reward → Check risk limits → Make decision
```
Logs show: `Decision: BUY/SELL/HOLD`, `Confidence: X%`

### 4. **Execution Phase**
```
Execute trade → Update portfolio → Log result
```
Logs show: `Executing trade...`, `Trade executed`

---

## 🎯 Common Queries

### View Recent Trades
```bash
curl http://localhost:3000/diary | jq '.[] | select(.type=="trade")' | tail -20
```

### View Recent Decisions
```bash
curl http://localhost:3000/diary | jq '.[] | select(.type=="decision")' | tail -10
```

### View Win Rate
```bash
curl http://localhost:3000/stats | jq '.winRate'
```

### View Current P&L
```bash
curl http://localhost:3000/stats | jq '.totalProfit'
```

### View Open Positions
```bash
curl http://localhost:3000/portfolio | jq '.positions'
```

### View Current Balances
```bash
curl http://localhost:3000/portfolio | jq '.balances'
```

---

## 🔧 Troubleshooting Logs

### No Diary Entries
If `/diary` returns empty `[]`:
- Agent just started (diary fills up over time)
- No trades have been executed yet
- Check agent.log for errors

### Missing Research Logs
If you don't see research queries:
- Check if X402 API is accessible
- Look for `Request failed with status code 404` in logs
- Verify `DREAMS_ROUTER_URL` in `.env`

### RPC Connection Errors
If you see `JsonRpcProvider failed to detect network`:
- Check RPC URLs in `.env`
- Verify network connectivity
- Try restarting the agent

---

## 📊 Example: Analyzing a Trade

### 1. Find the trade in diary
```bash
curl http://localhost:3000/diary | jq '.[] | select(.symbol=="BTC")'
```

### 2. Check the decision reasoning
```json
{
  "type": "decision",
  "decision": "BUY",
  "symbol": "BTC",
  "reasoning": "Strong uptrend with bullish divergence",
  "confidence": 0.85,
  "riskReward": 2.5
}
```

### 3. View the position in portfolio
```bash
curl http://localhost:3000/portfolio | jq '.positions.BTC'
```

### 4. Check the result in stats
```bash
curl http://localhost:3000/stats | jq '.totalProfit'
```

---

## 🚀 Real-Time Monitoring

### Watch Agent Logs Live
```bash
tail -f agent.log | grep -E "decision|research|trade|error"
```

### Monitor Dashboard
Open http://localhost:5173 and watch:
- Decision Log updates
- Chart updates
- P&L changes

### Poll API Every 10 Seconds
```bash
watch -n 10 'curl -s http://localhost:3000/stats | jq'
```

---

## 📋 Log Format Reference

### Decision Log Entry
```json
{
  "timestamp": "ISO-8601 timestamp",
  "type": "decision",
  "decision": "BUY|SELL|HOLD",
  "symbol": "BTC|ETH|etc",
  "reasoning": "AI reasoning for decision",
  "confidence": 0.0-1.0,
  "riskReward": number,
  "entryPrice": number,
  "stopLoss": number,
  "takeProfit": number
}
```

### Research Log Entry
```json
{
  "timestamp": "ISO-8601 timestamp",
  "type": "research",
  "query": "Research question",
  "response": "AI response",
  "sources": ["source1", "source2"]
}
```

### Trade Log Entry
```json
{
  "timestamp": "ISO-8601 timestamp",
  "type": "trade",
  "action": "OPEN|CLOSE",
  "symbol": "BTC",
  "size": number,
  "price": number,
  "pnl": number,
  "fee": number
}
```

---

## 🔗 Related Documentation

- **ARCHITECTURE.md** - System architecture and data flow
- **BRIDGE_API.md** - Bridge operations and logs
- **QUICK_START.md** - Quick start guide

---

**All research and decisions are logged and accessible! 📊**
