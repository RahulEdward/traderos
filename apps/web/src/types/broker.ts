// ─── Client-side Broker Types ─────────────────────────────────────
// Lightweight types for UI components (mirrors server-side lib/brokers/types.ts)

export interface BrokerInfo {
  platform: string;
  status: "SAVED" | "CONNECTED" | "DISCONNECTED";
  clientCode: string;
  lastSyncAt: string | null;
  connected: boolean;
  hasSavedCredentials: boolean;
}

export interface FundsInfo {
  availableBalance: number;
  usedMargin: number;
  totalBalance: number;
  collateral: number;
  realizedPnl: number;
  unrealizedPnl: number;
}

export interface Position {
  symbol: string;
  exchange: string;
  productType: string;
  side: "BUY" | "SELL";
  quantity: number;
  avgPrice: number;
  ltp: number;
  pnl: number;
  pnlPercent: number;
}

export interface Holding {
  symbol: string;
  exchange: string;
  quantity: number;
  avgPrice: number;
  ltp: number;
  pnl: number;
  investedValue: number;
  currentValue: number;
}

export interface OrderBookEntry {
  orderId: string;
  symbol: string;
  exchange: string;
  side: "BUY" | "SELL";
  orderType: string;
  productType: string;
  quantity: number;
  filledQuantity: number;
  price: number;
  triggerPrice: number;
  avgPrice: number;
  status: string;
  timestamp: string;
  tag?: string;
}

export interface TradeBookEntry {
  tradeId: string;
  orderId: string;
  symbol: string;
  exchange: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  timestamp: string;
}
