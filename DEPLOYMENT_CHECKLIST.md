# 🚀 MAINNET DEPLOYMENT CHECKLIST

## **PRE-DEPLOYMENT VERIFICATION**

### **Environment Setup**
- [ ] `.env` file exists in project root
- [ ] `HYPERLIQUID_NETWORK=mainnet` is set
- [ ] `HYPERLIQUID_PRIVATE_KEY` is set (mainnet key)
- [ ] `X402_WALLET_ADDRESS` is set
- [ ] `X402_PRIVATE_KEY` is set
- [ ] `X402_NETWORK=base-mainnet` is set

### **Funding Verification**
- [ ] Hyperliquid account has $1,000+ USDC
- [ ] x402 account has $100+ USDC
- [ ] Wallet addresses are correct
- [ ] Private keys are secure

### **Code Verification**
- [ ] Latest code pulled from git
- [ ] Build successful: `npm run build`
- [ ] No TypeScript errors
- [ ] All dependencies installed

### **Configuration Verification**
- [ ] Position size: 0.5% (conservative)
- [ ] Leverage: 2x (conservative)
- [ ] Trading interval: 60 seconds
- [ ] Assets: BTC, ETH
- [ ] System prompt loaded

### **Safety Verification**
- [ ] Emergency stop procedure documented
- [ ] Monitoring dashboard ready
- [ ] Logs location known
- [ ] Backup plan in place

---

## **DEPLOYMENT STEPS**

### **Step 1: Final Build**
```bash
npm run build
```
✓ Verify: No errors in output

### **Step 2: Stop Current Agent (if running)**
```bash
pkill -9 node
```
✓ Verify: `ps aux | grep npm` shows no npm processes

### **Step 3: Deploy Using Script**
```bash
./DEPLOY_MAINNET.sh
```
✓ Verify: Script completes successfully

### **Step 4: Verify Agent Started**
```bash
ps aux | grep "npm start" | grep -v grep
```
✓ Verify: Agent process is running

### **Step 5: Check Health**
```bash
curl http://localhost:3000/health
```
✓ Verify: Returns success status

### **Step 6: Monitor Logs**
```bash
tail -f agent.log
```
✓ Verify: See trading iterations starting

---

## **FIRST 24 HOURS MONITORING**

### **Hour 1: Startup Verification**
- [ ] Agent running without errors
- [ ] Trading loop starting (every 60s)
- [ ] Portfolio fetching successfully
- [ ] Indicators fetching successfully
- [ ] LLM responding to requests
- [ ] No critical errors in logs

### **Hour 2-4: Operational Verification**
- [ ] Multiple iterations completed
- [ ] Decisions being made
- [ ] No API errors
- [ ] No margin issues
- [ ] Balance stable

### **Hour 4-24: Performance Monitoring**
- [ ] Trading decisions executing (or correctly skipped)
- [ ] No unexpected errors
- [ ] PnL tracking working
- [ ] Logging comprehensive
- [ ] API endpoints responding

---

## **MONITORING COMMANDS**

### **Check Agent Status**
```bash
curl http://localhost:3000/health
```

### **Check Portfolio**
```bash
curl http://localhost:3000/portfolio
```

### **Check Trading Stats**
```bash
curl http://localhost:3000/stats
```

### **Check Trading Diary**
```bash
curl http://localhost:3000/diary
```

### **Watch Logs in Real-Time**
```bash
tail -f agent.log
```

### **Search Logs for Errors**
```bash
grep -i error agent.log | tail -20
```

### **Search Logs for Trades**
```bash
grep -i "BUY\|SELL\|trade" agent.log | tail -20
```

---

## **EMERGENCY PROCEDURES**

### **Stop Agent Immediately**
```bash
pkill -9 node
```

### **Close All Positions**
1. Go to Hyperliquid UI
2. Close all open positions manually
3. Verify positions closed

### **Check Agent Logs for Issues**
```bash
tail -100 agent.log | grep -i error
```

### **Restart Agent**
```bash
./DEPLOY_MAINNET.sh
```

---

## **PERFORMANCE EXPECTATIONS**

### **First Week**
- ✅ Agent running continuously
- ✅ No critical errors
- ✅ Trading decisions being made
- ✅ Break-even or small profit expected

### **First Month**
- ✅ Consistent trading
- ✅ 1-2% monthly return target
- ✅ Win rate > 50%
- ✅ Max drawdown < 5%

### **After 1 Month**
- ✅ Ready to increase position size to 1%
- ✅ Ready to add more assets
- ✅ Ready to optimize parameters

---

## **SUCCESS CRITERIA**

### **Deployment Success**
- ✅ Agent starts without errors
- ✅ Trading loop runs every 60 seconds
- ✅ Portfolio data fetching
- ✅ Indicators fetching
- ✅ LLM responding
- ✅ Decisions being made

### **First 24 Hours Success**
- ✅ No critical errors
- ✅ Consistent iterations
- ✅ Stable balance
- ✅ API endpoints responding
- ✅ Logs comprehensive

### **First Week Success**
- ✅ Profitable or break-even
- ✅ No margin calls
- ✅ Consistent performance
- ✅ Ready to scale

---

## **TROUBLESHOOTING**

### **Agent Won't Start**
1. Check `.env` file exists
2. Verify `HYPERLIQUID_NETWORK=mainnet`
3. Check logs: `tail -100 agent.log`
4. Verify Node.js version: `node --version`

### **No Trades Executing**
1. Check portfolio balance: `curl http://localhost:3000/portfolio`
2. Check logs for LLM errors: `grep -i "LLM\|error" agent.log`
3. Verify position size > 0
4. Check margin available

### **High Slippage**
1. Reduce position size
2. Reduce leverage
3. Check market conditions

### **API Errors**
1. Check Hyperliquid API status
2. Verify private key is correct
3. Check network connectivity
4. Review logs for details

---

## **FINAL CHECKLIST**

Before clicking deploy:

- [ ] All environment variables set correctly
- [ ] Funding verified
- [ ] Build successful
- [ ] Monitoring ready
- [ ] Emergency stop procedure known
- [ ] Team notified
- [ ] Backup plan in place

---

## **DEPLOYMENT COMMAND**

When ready to deploy:

```bash
./DEPLOY_MAINNET.sh
```

**Your Hyperliquid trading agent will be LIVE on mainnet!** 🚀

---

## **POST-DEPLOYMENT**

### **Immediate (First Hour)**
- Monitor logs closely
- Verify trading loop running
- Check for errors
- Verify LLM responding

### **First Day**
- Review trading performance
- Check PnL
- Verify no margin issues
- Ensure stable operation

### **First Week**
- Analyze trading results
- Review system prompt effectiveness
- Plan optimizations
- Consider scaling

### **First Month**
- Full performance analysis
- Optimization recommendations
- Scaling plan
- Long-term strategy

---

**Status: ✅ READY FOR DEPLOYMENT**

**Deploy when ready!** 🎉
