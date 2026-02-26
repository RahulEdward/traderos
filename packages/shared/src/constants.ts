// ─── Strategy Status Config ────────────────────────────────────────

export const STRATEGY_STATUS_CONFIG = {
  IDEA: { label: "Idea", color: "#A855F7", bgColor: "#A855F710" },
  IN_DEVELOPMENT: { label: "In Development", color: "#3B82F6", bgColor: "#3B82F610" },
  BACKTESTING: { label: "Backtesting", color: "#F59E0B", bgColor: "#F59E0B10" },
  REVIEW: { label: "Review", color: "#06B6D4", bgColor: "#06B6D410" },
  PAPER_TRADING: { label: "Paper Trading", color: "#6366F1", bgColor: "#6366F110" },
  LIVE: { label: "Live", color: "#10B981", bgColor: "#10B98110" },
  PAUSED: { label: "Paused", color: "#F59E0B", bgColor: "#F59E0B10" },
  RETIRED: { label: "Retired", color: "#6B7280", bgColor: "#6B728010" },
} as const;

// ─── Task Priority Config ──────────────────────────────────────────

export const TASK_PRIORITY_CONFIG = {
  CRITICAL: { label: "Critical", color: "#EF4444" },
  HIGH: { label: "High", color: "#F97316" },
  MEDIUM: { label: "Medium", color: "#3B82F6" },
  LOW: { label: "Low", color: "#6B7280" },
} as const;

// ─── Task Type Config ──────────────────────────────────────────────

export const TASK_TYPE_CONFIG = {
  BUG_FIX: { label: "Bug Fix", color: "#EF4444" },
  OPTIMIZATION: { label: "Optimization", color: "#F59E0B" },
  RESEARCH: { label: "Research", color: "#3B82F6" },
  TESTING: { label: "Testing", color: "#10B981" },
  DOCUMENTATION: { label: "Documentation", color: "#6366F1" },
} as const;

// ─── Market Options ────────────────────────────────────────────────

export const MARKET_OPTIONS = [
  "NSE Equity",
  "BSE Equity",
  "NSE Futures",
  "NSE Options",
  "MCX Commodities",
  "Currency Derivatives",
] as const;

// ─── Timeframe Options ────────────────────────────────────────────

export const TIMEFRAME_OPTIONS = [
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "30m", label: "30 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "D", label: "Daily" },
  { value: "W", label: "Weekly" },
] as const;

// ─── Tier Limits ───────────────────────────────────────────────────

export const TIER_LIMITS = {
  FREE: {
    maxStrategies: 2,
    maxImportsPerMonth: 5,
    aiAnalysesPerMonth: 0,
    maxPortfolios: 0,
    webhookAccess: false,
    dataRetentionDays: 30,
  },
  PRO: {
    maxStrategies: Infinity,
    maxImportsPerMonth: Infinity,
    aiAnalysesPerMonth: 50,
    maxPortfolios: Infinity,
    webhookAccess: true,
    dataRetentionDays: 730,
  },
  AGENCY: {
    maxStrategies: Infinity,
    maxImportsPerMonth: Infinity,
    aiAnalysesPerMonth: Infinity,
    maxPortfolios: Infinity,
    webhookAccess: true,
    dataRetentionDays: Infinity,
    maxSubAccounts: 10,
  },
} as const;

// ─── India-Specific ────────────────────────────────────────────────

export const INDIA_RISK_FREE_RATE = 0.06; // 6% for Sharpe calculations
export const NSE_MARKET_OPEN = "09:15";
export const NSE_MARKET_CLOSE = "15:30";
export const IST_TIMEZONE = "Asia/Kolkata";

// ─── Pricing ───────────────────────────────────────────────────────

export const PRICING = {
  PRO_MONTHLY: 2999,
  PRO_ANNUAL: 24999,
  AGENCY_MONTHLY: 9999,
  GST_RATE: 0.18,
} as const;
