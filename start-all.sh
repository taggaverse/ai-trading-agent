#!/bin/bash

# AI Trading Agent - Complete Startup Script
# Starts both the trading agent and dashboard

set -e

echo "🚀 Starting AI Trading Agent + Dashboard..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo -e "${BLUE}Node.js version:${NC} $(node --version)"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env with your private keys${NC}"
    echo ""
fi

# Build the agent if dist doesn't exist
if [ ! -d "dist" ]; then
    echo -e "${BLUE}📦 Building trading agent...${NC}"
    npm run build
    echo ""
fi

# Install dashboard dependencies if needed
if [ ! -d "dashboard/node_modules" ]; then
    echo -e "${BLUE}📦 Installing dashboard dependencies...${NC}"
    cd dashboard
    npm install
    cd ..
    echo ""
fi

# Start trading agent in background
echo -e "${GREEN}▶️  Starting Trading Agent on port 3000...${NC}"
npm start > agent.log 2>&1 &
AGENT_PID=$!
echo -e "${GREEN}✓ Trading Agent started (PID: $AGENT_PID)${NC}"
echo ""

# Wait for agent to be ready
echo -e "${BLUE}⏳ Waiting for agent to be ready...${NC}"
sleep 3

# Check if agent is running
if ! ps -p $AGENT_PID > /dev/null; then
    echo -e "${RED}❌ Trading Agent failed to start${NC}"
    echo "Check agent.log for details:"
    cat agent.log
    exit 1
fi

# Verify agent API is responding
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  Agent API not responding yet, waiting...${NC}"
    sleep 2
fi

echo -e "${GREEN}✓ Trading Agent is ready${NC}"
echo ""

# Start dashboard in background
echo -e "${GREEN}▶️  Starting Dashboard on port 5173...${NC}"
cd dashboard
npm run dev > ../dashboard.log 2>&1 &
DASHBOARD_PID=$!
cd ..
echo -e "${GREEN}✓ Dashboard started (PID: $DASHBOARD_PID)${NC}"
echo ""

# Wait for dashboard to be ready
sleep 3

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ AI Trading Agent is running!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📊 Dashboard:${NC}       http://localhost:5173"
echo -e "${BLUE}🔌 Agent API:${NC}       http://localhost:3000"
echo -e "${BLUE}📝 Agent Logs:${NC}      agent.log"
echo -e "${BLUE}📝 Dashboard Logs:${NC}  dashboard.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both services${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    kill $AGENT_PID 2>/dev/null || true
    kill $DASHBOARD_PID 2>/dev/null || true
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Keep script running
wait
