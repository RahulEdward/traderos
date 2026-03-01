// ─── Angel One SmartAPI Configuration ──────────────────────────────
// Reference: Angel One SmartAPI v2 docs + OpenAlgo broker/angel patterns

export const ANGELONE_CONFIG = {
  BASE_URL: "https://apiconnect.angelbroking.com",
  WS_URL: "wss://smartapisocket.angelone.in/smart-stream",
  MASTER_CONTRACT_URL:
    "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json",
} as const;

// ─── API Endpoints ──────────────────────────────────────────────────
export const ENDPOINTS = {
  LOGIN: "/rest/auth/angelbroking/user/v1/loginByPassword",
  LOGOUT: "/rest/secure/angelbroking/user/v1/logout",
  PLACE_ORDER: "/rest/secure/angelbroking/order/v1/placeOrder",
  MODIFY_ORDER: "/rest/secure/angelbroking/order/v1/modifyOrder",
  CANCEL_ORDER: "/rest/secure/angelbroking/order/v1/cancelOrder",
  ORDER_BOOK: "/rest/secure/angelbroking/order/v1/getOrderBook",
  TRADE_BOOK: "/rest/secure/angelbroking/order/v1/getTradeBook",
  POSITIONS: "/rest/secure/angelbroking/order/v1/getPosition",
  HOLDINGS: "/rest/secure/angelbroking/portfolio/v1/getAllHolding",
  FUNDS: "/rest/secure/angelbroking/user/v1/getRMS",
  QUOTE: "/rest/secure/angelbroking/market/v1/quote/",
  CANDLE_DATA: "/rest/secure/angelbroking/historical/v1/getCandleData",
  OI_DATA: "/rest/secure/angelbroking/historical/v1/getOIData",
} as const;

// ─── Required Headers for all Angel One API calls ────────────────────
export function getAngelHeaders(apiKey: string, authToken?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-UserType": "USER",
    "X-SourceID": "WEB",
    "X-ClientLocalIP": "127.0.0.1",
    "X-ClientPublicIP": "127.0.0.1",
    "X-MACAddress": "00:00:00:00:00:00",
    "X-PrivateKey": apiKey,
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

// ─── Order Type Mapping ─────────────────────────────────────────────
// TradeOS standard → Angel One SmartAPI
export const ORDER_TYPE_MAP: Record<string, string> = {
  MARKET: "MARKET",
  LIMIT: "LIMIT",
  SL: "STOPLOSS_LIMIT",
  SL_M: "STOPLOSS_MARKET",
};

export const ORDER_TYPE_REVERSE: Record<string, string> = {
  MARKET: "MARKET",
  LIMIT: "LIMIT",
  STOPLOSS_LIMIT: "SL",
  STOPLOSS_MARKET: "SL_M",
};

// ─── Variety Mapping (based on order type) ──────────────────────────
export const VARIETY_MAP: Record<string, string> = {
  MARKET: "NORMAL",
  LIMIT: "NORMAL",
  SL: "STOPLOSS",
  SL_M: "STOPLOSS",
};

// ─── Product Type Mapping ──────────────────────────────────────────
// TradeOS standard → Angel One specific codes
export const PRODUCT_MAP: Record<string, string> = {
  CNC: "DELIVERY",
  INTRADAY: "INTRADAY",
  MARGIN: "CARRYFORWARD",
};

export const PRODUCT_REVERSE: Record<string, string> = {
  DELIVERY: "CNC",
  INTRADAY: "INTRADAY",
  CARRYFORWARD: "MARGIN",
};

// ─── Order Status Mapping ──────────────────────────────────────────
export const ORDER_STATUS_MAP: Record<string, string> = {
  complete: "COMPLETE",
  rejected: "REJECTED",
  cancelled: "CANCELLED",
  open: "OPEN",
  "trigger pending": "PENDING",
  "open pending": "OPEN",
  "modify pending": "OPEN",
  "cancel pending": "OPEN",
  "after market order req received": "PENDING",
};

// ─── Exchange Mapping ──────────────────────────────────────────────
// Angel One uses plain exchange names
export const EXCHANGE_MAP: Record<string, string> = {
  NSE: "NSE",
  BSE: "BSE",
  NFO: "NFO",
  BFO: "BFO",
  MCX: "MCX",
  CDS: "CDS",
};

// ─── Resolution/Interval Mapping ────────────────────────────────────
// TradeOS resolution → Angel One interval
export const RESOLUTION_MAP: Record<string, string> = {
  "1": "ONE_MINUTE",
  "3": "THREE_MINUTE",
  "5": "FIVE_MINUTE",
  "10": "TEN_MINUTE",
  "15": "FIFTEEN_MINUTE",
  "30": "THIRTY_MINUTE",
  "60": "ONE_HOUR",
  "120": "ONE_HOUR", // 2h not available, we'll combine
  "240": "ONE_HOUR", // 4h not available, we'll combine
  "1D": "ONE_DAY",
  "1W": "ONE_DAY", // weekly from daily
  "1M": "ONE_DAY", // monthly from daily
};

// ─── Maximum days per request (chunk limits) ────────────────────────
export const INTERVAL_CHUNK_DAYS: Record<string, number> = {
  ONE_MINUTE: 30,
  THREE_MINUTE: 60,
  FIVE_MINUTE: 100,
  TEN_MINUTE: 100,
  FIFTEEN_MINUTE: 200,
  THIRTY_MINUTE: 200,
  ONE_HOUR: 400,
  ONE_DAY: 2000,
};

// ─── WebSocket Exchange Type Codes ─────────────────────────────────
export const WS_EXCHANGE_TYPE: Record<string, number> = {
  NSE: 1,   // NSE Cash Market
  NFO: 2,   // NSE Futures & Options
  BSE: 3,   // BSE Cash Market
  BFO: 4,   // BSE F&O
  MCX: 5,   // MCX Commodity
  CDS: 13,  // Currency Derivatives
};

// ─── WebSocket Subscription Modes ──────────────────────────────────
export const WS_MODE = {
  LTP: 1,         // Last Traded Price only
  QUOTE: 2,       // LTP + OHLC + volume + bid/ask quantities
  SNAP_QUOTE: 3,  // Quote + 5-level market depth
  DEPTH: 4,       // 20-level order book (NSE only, max 50 tokens)
} as const;
