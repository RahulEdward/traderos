// ─── Angel One WebSocket Streaming Types ──────────────────────────

export interface TickData {
  token: string;
  exchangeType: number;
  mode: number;
  ltp: number;
  ltq?: number;
  avgPrice?: number;
  volume?: number;
  totalBuyQty?: number;
  totalSellQty?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  lastTradeTime?: number;
  exchangeTimestamp?: number;
  oi?: number;
  oiChangePercent?: number;
  // 5-level depth (SNAP_QUOTE mode)
  depth?: {
    buy: { price: number; quantity: number; orders: number }[];
    sell: { price: number; quantity: number; orders: number }[];
  };
}

export type SubscriptionMode = 1 | 2 | 3 | 4;

export interface SubscriptionRequest {
  correlationID: string;
  action: 1 | 2; // 1 = subscribe, 2 = unsubscribe
  params: {
    mode: SubscriptionMode;
    tokenList: {
      exchangeType: number;
      tokens: string[];
    }[];
  };
}

export interface StreamCallbacks {
  onTick: (tick: TickData) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}
