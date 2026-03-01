// ─── Fyers API Configuration ──────────────────────────────────────
// Reference: Fyers API v3 docs

export const FYERS_CONFIG = {
  BASE_URL: "https://api-t1.fyers.in",
  AUTH_URL: "https://api-t1.fyers.in/api/v3/validate-authcode",
  WS_URL: "wss://socket.fyers.in/hsm/v1-5/prod",
} as const;

// ─── Order Type Mapping ───────────────────────────────────────────
// TradeOS uses string types, Fyers uses numeric codes
export const ORDER_TYPE_MAP = {
  LIMIT: 1,
  MARKET: 2,
  SL_M: 3,
  SL: 4,
} as const;

export const ORDER_TYPE_REVERSE: Record<number, string> = {
  1: "LIMIT",
  2: "MARKET",
  3: "SL_M",
  4: "SL",
};

// ─── Side Mapping ─────────────────────────────────────────────────
export const SIDE_MAP = {
  BUY: 1,
  SELL: -1,
} as const;

export const SIDE_REVERSE: Record<number, string> = {
  1: "BUY",
  "-1": "SELL",
};

// ─── Product Type Mapping ─────────────────────────────────────────
// TradeOS standard → Fyers specific product codes
export const PRODUCT_MAP = {
  CNC: "CNC",
  INTRADAY: "INTRADAY",
  MARGIN: "MARGIN",
} as const;

// ─── Order Status Mapping ─────────────────────────────────────────
// Fyers uses numeric status codes
export const ORDER_STATUS_MAP: Record<number, string> = {
  1: "CANCELLED",
  2: "COMPLETE",
  4: "PENDING",     // trigger pending
  5: "REJECTED",
  6: "OPEN",
};

// ─── Exchange Mapping ─────────────────────────────────────────────
// Fyers symbol format: "EXCHANGE:SYMBOL-SUFFIX"
export const EXCHANGE_PREFIX: Record<string, string> = {
  NSE: "NSE",
  BSE: "BSE",
  NFO: "NSE",    // Fyers uses NSE prefix for F&O
  BFO: "BSE",
  MCX: "MCX",
  CDS: "NSE",
};

// Symbol suffix by segment
export const SEGMENT_SUFFIX: Record<string, string> = {
  NSE: "-EQ",
  BSE: "-A",
  NFO: "",      // futures/options don't have suffix
  BFO: "",
  MCX: "",
  CDS: "",
};

// ─── Resolution Mapping ──────────────────────────────────────────
// TradeOS resolution → Fyers resolution
export const RESOLUTION_MAP: Record<string, string> = {
  "1": "1",
  "2": "2",
  "3": "3",
  "5": "5",
  "10": "10",
  "15": "15",
  "30": "30",
  "60": "60",
  "120": "120",
  "240": "240",
  "1D": "1D",
  "1W": "1W",
  "1M": "1M",
};
