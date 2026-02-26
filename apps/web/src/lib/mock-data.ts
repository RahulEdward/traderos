// Mock data for demo mode (no database required)

export const DEMO_USER = {
  id: "demo-user-001",
  email: "demo@tradeosindia.com",
  name: "Rahul Sharma",
  image: null,
  tier: "PRO" as const,
  onboardingCompleted: true,
  timezone: "Asia/Kolkata",
  currency: "INR",
  riskProfile: "Moderate",
  tradingPlatform: "TradingView",
  marketFocus: ["NSE Equity", "NSE Futures"],
  createdAt: new Date("2024-06-01"),
  updatedAt: new Date(),
};

export const DEMO_STRATEGIES = [
  {
    id: "strat-001",
    userId: DEMO_USER.id,
    name: "Nifty 50 Breakout",
    description:
      "Breakout strategy on Nifty 50 index using 15-minute candles. Enters on breakout above previous day high with volume confirmation.",
    market: "NSE Equity",
    instrument: "NIFTY 50",
    timeframe: "15m",
    entryLogic:
      "Enter long when price breaks above PDH with volume > 1.5x average. RSI must be above 50.",
    exitLogic:
      "Exit at 1.5:1 RR or trailing stop of 0.5%. Time-based exit at 3:00 PM IST.",
    status: "LIVE" as const,
    tags: ["breakout", "nifty", "intraday"],
    version: 3,
    archivedAt: null,
    createdAt: new Date("2024-08-15"),
    updatedAt: new Date("2025-02-20"),
    backtestResults: [
      {
        id: "bt-001",
        strategyId: "strat-001",
        versionNumber: 3,
        importedAt: new Date("2025-01-15"),
        sourcePlatform: "TRADINGVIEW" as const,
        totalTrades: 248,
        winRate: 58.47,
        profitFactor: 1.82,
        netProfit: 342500,
        maxDrawdown: 45200,
        maxDrawdownPct: 8.2,
        sharpeRatio: 1.65,
        sortinoRatio: 2.1,
        calmarRatio: 1.4,
        expectancy: 1380.24,
        avgWin: 4250,
        avgLoss: 2100,
        bestTrade: 18500,
        worstTrade: -8200,
        recoveryFactor: 7.58,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        notes: "Full year 2024 backtest with live market data",
      },
    ],
    aiAnalyses: [
      {
        id: "ai-001",
        strategyId: "strat-001",
        backtestResultId: "bt-001",
        createdAt: new Date("2025-01-16"),
        overallScore: 78,
        readinessScore: 82,
        readinessVerdict: "READY" as const,
        summary:
          "Strong breakout strategy with consistent performance across market conditions. The 58.47% win rate combined with 1.82 profit factor indicates a robust edge.",
        strengths: [
          "Excellent profit factor of 1.82 indicates strong risk-reward",
          "Max drawdown under 10% shows good risk management",
          "248 trades provides statistically significant sample size",
          "Works well in trending market conditions typical of Nifty",
        ],
        weaknesses: [
          "Win rate could be improved with additional confirmation filters",
          "Performance may decline in range-bound markets",
          "Average loss-to-win ratio could be tighter",
        ],
        suggestions: [
          "Add ADX filter to avoid ranging markets (ADX > 25)",
          "Consider scaling position size based on volatility (ATR)",
          "Implement time-based filter to avoid first 15 minutes",
          "Add sector rotation overlay for better entry timing",
        ],
        riskNotes:
          "Strategy performs best in trending markets. Monitor for extended sideways periods. Max drawdown of 8.2% is well within acceptable limits for intraday trading.",
        marketRegimeNotes:
          "Best performance in bullish trending markets. Consider reducing size during Budget/RBI policy weeks and expiry days.",
      },
    ],
  },
  {
    id: "strat-002",
    userId: DEMO_USER.id,
    name: "Bank Nifty Options Scalper",
    description:
      "Quick scalping strategy on Bank Nifty weekly options. Targets 20-30 point moves on 5-minute chart.",
    market: "NSE Options",
    instrument: "BANKNIFTY",
    timeframe: "5m",
    entryLogic:
      "Enter on VWAP bounce with OI buildup confirmation. Buy ATM CE/PE based on direction.",
    exitLogic: "Target 25-30 points. Stop loss 15 points. Max 3 trades/day.",
    status: "BACKTESTING" as const,
    tags: ["options", "scalping", "banknifty"],
    version: 1,
    archivedAt: null,
    createdAt: new Date("2025-01-10"),
    updatedAt: new Date("2025-02-18"),
    backtestResults: [
      {
        id: "bt-002",
        strategyId: "strat-002",
        versionNumber: 1,
        importedAt: new Date("2025-02-10"),
        sourcePlatform: "AMIBROKER" as const,
        totalTrades: 156,
        winRate: 52.56,
        profitFactor: 1.38,
        netProfit: 125800,
        maxDrawdown: 32400,
        maxDrawdownPct: 12.5,
        sharpeRatio: 1.12,
        sortinoRatio: 1.45,
        calmarRatio: 0.9,
        expectancy: 806.41,
        avgWin: 3200,
        avgLoss: 2100,
        bestTrade: 8500,
        worstTrade: -6200,
        recoveryFactor: 3.88,
        startDate: new Date("2024-07-01"),
        endDate: new Date("2025-01-31"),
        notes: "6-month options backtest",
      },
    ],
    aiAnalyses: [],
  },
  {
    id: "strat-003",
    userId: DEMO_USER.id,
    name: "Reliance Swing Trader",
    description:
      "Swing trading strategy on Reliance Industries using daily chart. Holds positions 3-10 days.",
    market: "NSE Equity",
    instrument: "RELIANCE",
    timeframe: "D",
    entryLogic:
      "Enter on daily close above 20 EMA with MACD crossover. Volume must be above 20-day average.",
    exitLogic:
      "Trail stop at 20 EMA. Target 3:1 RR. Time exit at 10 trading days.",
    status: "REVIEW" as const,
    tags: ["swing", "reliance", "equity"],
    version: 2,
    archivedAt: null,
    createdAt: new Date("2024-11-01"),
    updatedAt: new Date("2025-02-15"),
    backtestResults: [
      {
        id: "bt-003",
        strategyId: "strat-003",
        versionNumber: 2,
        importedAt: new Date("2025-02-01"),
        sourcePlatform: "TRADINGVIEW" as const,
        totalTrades: 42,
        winRate: 61.9,
        profitFactor: 2.15,
        netProfit: 185400,
        maxDrawdown: 28600,
        maxDrawdownPct: 6.8,
        sharpeRatio: 1.92,
        sortinoRatio: 2.55,
        calmarRatio: 2.1,
        expectancy: 4414.29,
        avgWin: 9800,
        avgLoss: 4200,
        bestTrade: 32000,
        worstTrade: -12500,
        recoveryFactor: 6.48,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2024-12-31"),
        notes: "2-year swing trading backtest",
      },
    ],
    aiAnalyses: [
      {
        id: "ai-002",
        strategyId: "strat-003",
        backtestResultId: "bt-003",
        createdAt: new Date("2025-02-02"),
        overallScore: 72,
        readinessScore: 68,
        readinessVerdict: "NEEDS_WORK" as const,
        summary:
          "Promising swing strategy with excellent profit factor. However, limited sample size of 42 trades needs more validation before going live.",
        strengths: [
          "Outstanding profit factor of 2.15",
          "Win rate of 61.9% is excellent for swing trading",
          "Low max drawdown of 6.8% shows disciplined risk management",
        ],
        weaknesses: [
          "Only 42 trades — sample size too small for statistical significance",
          "Heavily correlated with single stock performance",
          "No hedging mechanism during broad market downturns",
        ],
        suggestions: [
          "Extend backtest period to 5+ years for more trades",
          "Add index-level filter (only trade when Nifty > 200 EMA)",
          "Consider adding sector ETF as backup instrument",
        ],
        riskNotes:
          "Single-stock concentration risk. Reliance-specific events (AGM, results) can cause outlier moves.",
        marketRegimeNotes:
          "Works best in trending bull markets. Avoid during quarterly results season.",
      },
    ],
  },
  {
    id: "strat-004",
    userId: DEMO_USER.id,
    name: "MCX Gold Momentum",
    description:
      "Momentum-based strategy on MCX Gold futures using 1-hour chart.",
    market: "MCX Commodities",
    instrument: "GOLD",
    timeframe: "1h",
    entryLogic: "Enter on RSI divergence + price above VWAP. Use 1h chart.",
    exitLogic: "Target at R2/S2 pivot levels. Stop at VWAP.",
    status: "IDEA" as const,
    tags: ["commodities", "gold", "momentum"],
    version: 1,
    archivedAt: null,
    createdAt: new Date("2025-02-20"),
    updatedAt: new Date("2025-02-20"),
    backtestResults: [],
    aiAnalyses: [],
  },
  {
    id: "strat-005",
    userId: DEMO_USER.id,
    name: "HDFC Bank Range Breakout",
    description:
      "Opening range breakout on HDFC Bank using first 30-minute range.",
    market: "NSE Equity",
    instrument: "HDFCBANK",
    timeframe: "30m",
    entryLogic:
      "Enter on break of first 30-min high/low with volume surge. Gap days filtered out.",
    exitLogic: "Target 1:2 RR. Time exit at 2:30 PM IST.",
    status: "PAPER_TRADING" as const,
    tags: ["orb", "hdfcbank", "intraday"],
    version: 2,
    archivedAt: null,
    createdAt: new Date("2024-12-01"),
    updatedAt: new Date("2025-02-22"),
    backtestResults: [
      {
        id: "bt-005",
        strategyId: "strat-005",
        versionNumber: 2,
        importedAt: new Date("2025-02-05"),
        sourcePlatform: "TRADINGVIEW" as const,
        totalTrades: 180,
        winRate: 55.0,
        profitFactor: 1.55,
        netProfit: 210000,
        maxDrawdown: 38000,
        maxDrawdownPct: 9.5,
        sharpeRatio: 1.35,
        sortinoRatio: 1.72,
        calmarRatio: 1.15,
        expectancy: 1166.67,
        avgWin: 3800,
        avgLoss: 2400,
        bestTrade: 14200,
        worstTrade: -9800,
        recoveryFactor: 5.53,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        notes: "Full year ORB backtest",
      },
    ],
    aiAnalyses: [],
  },
];

export const DEMO_PORTFOLIOS = [
  {
    id: "port-001",
    userId: DEMO_USER.id,
    name: "Intraday Core Portfolio",
    description:
      "Core intraday strategies for consistent daily income generation.",
    status: "ACTIVE" as const,
    createdAt: new Date("2024-10-01"),
    updatedAt: new Date("2025-02-20"),
    portfolioStrategies: [
      {
        id: "ps-001",
        portfolioId: "port-001",
        strategyId: "strat-001",
        capitalAllocationPct: 50,
        addedAt: new Date("2024-10-01"),
        strategy: DEMO_STRATEGIES[0],
      },
      {
        id: "ps-002",
        portfolioId: "port-001",
        strategyId: "strat-005",
        capitalAllocationPct: 50,
        addedAt: new Date("2025-01-01"),
        strategy: DEMO_STRATEGIES[4],
      },
    ],
  },
  {
    id: "port-002",
    userId: DEMO_USER.id,
    name: "Swing & Positional",
    description: "Longer-term strategies for capital growth.",
    status: "ACTIVE" as const,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-02-15"),
    portfolioStrategies: [
      {
        id: "ps-003",
        portfolioId: "port-002",
        strategyId: "strat-003",
        capitalAllocationPct: 100,
        addedAt: new Date("2025-01-01"),
        strategy: DEMO_STRATEGIES[2],
      },
    ],
  },
];

export const DEMO_TASKS = [
  {
    id: "task-001",
    strategyId: "strat-001",
    userId: DEMO_USER.id,
    title: "Add ADX filter to avoid ranging markets",
    description:
      "Implement ADX > 25 filter as suggested by AI analysis to improve win rate.",
    taskType: "OPTIMIZATION" as const,
    priority: "HIGH" as const,
    status: "IN_PROGRESS" as const,
    dueDate: new Date("2025-03-01"),
    createdAt: new Date("2025-01-17"),
    completedAt: null,
    strategy: { id: "strat-001", name: "Nifty 50 Breakout" },
  },
  {
    id: "task-002",
    strategyId: "strat-002",
    userId: DEMO_USER.id,
    title: "Run AI analysis on Bank Nifty options backtest",
    description: "New backtest imported, needs AI review.",
    taskType: "RESEARCH" as const,
    priority: "MEDIUM" as const,
    status: "TODO" as const,
    dueDate: new Date("2025-02-28"),
    createdAt: new Date("2025-02-10"),
    completedAt: null,
    strategy: { id: "strat-002", name: "Bank Nifty Options Scalper" },
  },
  {
    id: "task-003",
    strategyId: "strat-003",
    userId: DEMO_USER.id,
    title: "Extend Reliance backtest to 5 years",
    description: "AI suggested more data for statistical significance.",
    taskType: "TESTING" as const,
    priority: "HIGH" as const,
    status: "TODO" as const,
    dueDate: new Date("2025-03-05"),
    createdAt: new Date("2025-02-03"),
    completedAt: null,
    strategy: { id: "strat-003", name: "Reliance Swing Trader" },
  },
  {
    id: "task-004",
    strategyId: "strat-001",
    userId: DEMO_USER.id,
    title: "Document entry/exit rules in strategy notes",
    description: "Create comprehensive documentation for the strategy rules.",
    taskType: "DOCUMENTATION" as const,
    priority: "LOW" as const,
    status: "DONE" as const,
    dueDate: new Date("2025-02-15"),
    createdAt: new Date("2025-01-20"),
    completedAt: new Date("2025-02-14"),
    strategy: { id: "strat-001", name: "Nifty 50 Breakout" },
  },
  {
    id: "task-005",
    strategyId: "strat-005",
    userId: DEMO_USER.id,
    title: "Fix gap-day filter logic in ORB strategy",
    description: "Gap days above 1% should be filtered out but current logic misses some.",
    taskType: "BUG_FIX" as const,
    priority: "CRITICAL" as const,
    status: "TODO" as const,
    dueDate: new Date("2025-02-26"),
    createdAt: new Date("2025-02-22"),
    completedAt: null,
    strategy: { id: "strat-005", name: "HDFC Bank Range Breakout" },
  },
];

export const DEMO_NOTIFICATIONS = [
  {
    id: "notif-001",
    userId: DEMO_USER.id,
    type: "ai_analysis_complete",
    title: "AI Analysis Complete",
    body: "AI analysis for Nifty 50 Breakout is ready. Score: 78/100 — Ready to Go Live",
    read: false,
    createdAt: new Date("2025-02-24T10:30:00"),
    strategyId: "strat-001",
    portfolioId: null,
    strategy: { id: "strat-001", name: "Nifty 50 Breakout" },
  },
  {
    id: "notif-002",
    userId: DEMO_USER.id,
    type: "backtest_imported",
    title: "Backtest Imported",
    body: "New backtest results imported for Bank Nifty Options Scalper — 156 trades analyzed.",
    read: false,
    createdAt: new Date("2025-02-23T14:15:00"),
    strategyId: "strat-002",
    portfolioId: null,
    strategy: { id: "strat-002", name: "Bank Nifty Options Scalper" },
  },
  {
    id: "notif-003",
    userId: DEMO_USER.id,
    type: "task_due_soon",
    title: "Task Due Soon",
    body: "Fix gap-day filter logic in ORB strategy is due tomorrow.",
    read: true,
    createdAt: new Date("2025-02-22T09:00:00"),
    strategyId: "strat-005",
    portfolioId: null,
    strategy: { id: "strat-005", name: "HDFC Bank Range Breakout" },
  },
  {
    id: "notif-004",
    userId: DEMO_USER.id,
    type: "strategy_status_changed",
    title: "Strategy Status Updated",
    body: "Nifty 50 Breakout moved to Live status.",
    read: true,
    createdAt: new Date("2025-02-20T16:45:00"),
    strategyId: "strat-001",
    portfolioId: null,
    strategy: { id: "strat-001", name: "Nifty 50 Breakout" },
  },
  {
    id: "notif-005",
    userId: DEMO_USER.id,
    type: "ai_analysis_complete",
    title: "AI Analysis Complete",
    body: "AI analysis for Reliance Swing Trader is ready. Score: 72/100 — Needs More Work",
    read: true,
    createdAt: new Date("2025-02-18T11:20:00"),
    strategyId: "strat-003",
    portfolioId: null,
    strategy: { id: "strat-003", name: "Reliance Swing Trader" },
  },
];

export const DEMO_TRADES = [
  // Trades for Nifty 50 Breakout backtest
  ...Array.from({ length: 20 }, (_, i) => {
    const isWin = Math.random() > 0.42;
    const entryPrice = 21000 + Math.random() * 2000;
    const pnl = isWin
      ? Math.round(1500 + Math.random() * 5000)
      : -Math.round(800 + Math.random() * 3000);
    return {
      id: `trade-${String(i + 1).padStart(3, "0")}`,
      backtestResultId: "bt-001",
      tradeNumber: i + 1,
      entryDate: new Date(2024, Math.floor(i / 2), 10 + (i % 20)),
      exitDate: new Date(2024, Math.floor(i / 2), 10 + (i % 20)),
      direction: (Math.random() > 0.3 ? "LONG" : "SHORT") as "LONG" | "SHORT",
      entryPrice: Math.round(entryPrice * 100) / 100,
      exitPrice:
        Math.round((entryPrice + pnl / 50) * 100) / 100,
      profitLoss: pnl,
      profitLossPct: Math.round((pnl / entryPrice) * 10000) / 100,
      holdingPeriod: 1,
      symbol: "NIFTY 50",
    };
  }),
];

// Dashboard stats derived from mock data
export function getDashboardStats() {
  const strategies = DEMO_STRATEGIES;
  const activePortfolios = DEMO_PORTFOLIOS.filter(
    (p) => p.status === "ACTIVE"
  ).length;
  const readyStrategies = DEMO_STRATEGIES.filter((s) =>
    s.aiAnalyses.some((a) => a.readinessVerdict === "READY")
  ).length;

  let totalWinRate = 0;
  let strategiesWithBacktest = 0;
  let totalNetProfit = 0;

  for (const s of strategies) {
    const bt = s.backtestResults[0];
    if (bt) {
      totalWinRate += bt.winRate;
      strategiesWithBacktest++;
      totalNetProfit += bt.netProfit;
    }
  }

  const overallWinRate =
    strategiesWithBacktest > 0 ? totalWinRate / strategiesWithBacktest : 0;

  return {
    stats: {
      totalStrategies: strategies.length,
      activePortfolios,
      overallWinRate: Math.round(overallWinRate * 100) / 100,
      strategiesReadyToLive: readyStrategies,
      totalNetProfit,
    },
    recentTasks: DEMO_TASKS.filter(
      (t) => t.status === "TODO" || t.status === "IN_PROGRESS"
    ).slice(0, 5),
    recentActivity: DEMO_NOTIFICATIONS.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      description: n.body || "",
      timestamp: n.createdAt,
      strategyId: n.strategyId,
      strategyName: n.strategy?.name,
    })),
    equityData: strategies
      .filter((s) => s.backtestResults[0])
      .map((s) => ({
        name: s.name,
        netProfit: s.backtestResults[0].netProfit,
      })),
  };
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}
