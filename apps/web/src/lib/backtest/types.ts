// ─── Core Backtest Types (AFML-aligned) ─────────────────────────────

/** Single OHLCV candle */
export interface Candle {
  timestamp: number; // Unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number; // Open interest (derivatives)
}

/** A single trade from backtest */
export interface BacktestTrade {
  tradeNumber: number;
  entryDate: Date;
  exitDate: Date;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  profitLoss: number;
  profitLossPct: number;
  holdingPeriod: number; // days
  symbol: string;
  betSize?: number; // position size [0,1]
}

/** Bet = continuous position on same side (Ch.14) */
export interface Bet {
  startDate: Date;
  endDate: Date;
  direction: "LONG" | "SHORT";
  pnl: number;
  pnlPct: number;
  holdingDays: number;
  tradeCount: number;
}

/** Full AFML statistics (Ch.14) */
export interface AFMLStatistics {
  // General characteristics
  timeRange: { start: Date; end: Date };
  totalDays: number;
  totalBets: number;
  totalTrades: number;
  frequencyOfBets: number; // bets/year
  avgHoldingPeriod: number; // days
  ratioOfLongs: number;

  // Performance
  pnl: number;
  pnlFromLongs: number;
  annualizedReturn: number;
  hitRatio: number;
  avgReturnHits: number;
  avgReturnMisses: number;

  // Runs & Drawdowns
  hhiPositive: number; // HHI on positive returns
  hhiNegative: number; // HHI on negative returns
  hhiTime: number; // HHI on bet timing
  maxDrawdown: number;
  maxDrawdownPct: number;
  drawdown95: number; // 95th percentile DD
  timeUnderWater95: number; // 95th percentile TuW (days)
  longestDrawdown: number; // days

  // Implementation shortfall
  avgSlippagePct: number;

  // Efficiency
  sharpeRatio: number;
  annualizedSharpe: number;
  sortinoRatio: number;
  calmarRatio: number;
  informationRatio: number;
  psr: number; // Probabilistic Sharpe Ratio (Ch.14)
  dsr: number; // Deflated Sharpe Ratio (Ch.14)

  // Classification (for meta-labeling)
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;

  // Strategy Risk (Ch.15)
  strategyRisk: number; // P[strategy failure]
  impliedPrecision: number; // p* for target SR
  profitFactor: number;
  expectancy: number;
  recoveryFactor: number;
}

/** Backtest method types */
export type BacktestMethod = "WALK_FORWARD" | "CROSS_VALIDATION" | "CPCV" | "SYNTHETIC";

/** Configuration for running a backtest */
export interface BacktestConfig {
  method: BacktestMethod;
  // Walk-Forward params
  trainWindow?: number; // bars for training
  testWindow?: number; // bars for testing
  // CV params
  kFolds?: number;
  purgeWindow?: number; // bars to purge between train/test
  embargoWindow?: number; // bars to embargo after test
  // CPCV params
  nGroups?: number; // N partitions
  kTestGroups?: number; // k groups in test set
  // Synthetic params
  nPaths?: number; // number of synthetic paths (default 10000)
  maxHoldingPeriod?: number; // max bars to hold
}

/** Result from a single backtest path */
export interface BacktestPathResult {
  pathId: number;
  trades: BacktestTrade[];
  sharpeRatio: number;
  pnl: number;
  method: BacktestMethod;
}

/** Full backtest run result (multiple paths for CPCV) */
export interface BacktestRunResult {
  method: BacktestMethod;
  config: BacktestConfig;
  paths: BacktestPathResult[];
  statistics: AFMLStatistics;
  sharpeDistribution?: number[]; // array of SR from each path (CPCV)
  runTimestamp: Date;
}
