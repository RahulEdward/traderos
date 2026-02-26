// ─── Strategy Types ────────────────────────────────────────────────

export type StrategyStatusType =
  | "IDEA"
  | "IN_DEVELOPMENT"
  | "BACKTESTING"
  | "REVIEW"
  | "PAPER_TRADING"
  | "LIVE"
  | "PAUSED"
  | "RETIRED";

export type MarketType =
  | "NSE Equity"
  | "BSE Equity"
  | "NSE Futures"
  | "NSE Options"
  | "MCX Commodities"
  | "Currency Derivatives";

export type TimeframeType =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "D"
  | "W";

// ─── Backtest Types ────────────────────────────────────────────────

export interface BacktestMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  netProfit: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  recoveryFactor: number;
}

export interface ParsedTrade {
  tradeNumber: number;
  entryDate: Date;
  exitDate: Date | null;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number | null;
  profitLoss: number;
  profitLossPct: number;
  holdingPeriod: number;
  symbol: string;
}

export interface MonthlyPnL {
  month: string;
  year: number;
  pnl: number;
  tradeCount: number;
}

// ─── AI Analysis Types ─────────────────────────────────────────────

export interface AiAnalysisResult {
  overallScore: number;
  readinessVerdict: "READY" | "NEEDS_WORK" | "NOT_READY";
  readinessScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  riskNotes: string;
  marketRegimeNotes: string;
}

// ─── Dashboard Types ───────────────────────────────────────────────

export interface DashboardStats {
  totalStrategies: number;
  activePortfolios: number;
  overallWinRate: number;
  strategiesReadyToLive: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  strategyId?: string;
  strategyName?: string;
}

// ─── Notification Types ────────────────────────────────────────────

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  strategyId?: string;
  portfolioId?: string;
}

// ─── Webhook Types ─────────────────────────────────────────────────

export interface TradingViewWebhookPayload {
  ticker: string;
  action: string;
  close: number;
  time: string;
  strategy_name?: string;
}
