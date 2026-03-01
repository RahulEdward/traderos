// ─── Shared Broker Types ──────────────────────────────────────────
// Common interface all broker integrations must follow

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "SL" | "SL_M";
export type ProductType = "CNC" | "INTRADAY" | "MARGIN";
export type OrderStatus = "OPEN" | "COMPLETE" | "CANCELLED" | "REJECTED" | "PENDING";
export type Exchange = "NSE" | "BSE" | "NFO" | "BFO" | "MCX" | "CDS";

export interface BrokerCredentials {
  apiKey: string;
  accessToken: string;
}

export interface OrderRequest {
  symbol: string;
  exchange: Exchange;
  side: OrderSide;
  orderType: OrderType;
  productType: ProductType;
  quantity: number;
  price?: number;
  triggerPrice?: number;
  tag?: string;
}

export interface OrderResponse {
  orderId: string;
  status: OrderStatus;
  message?: string;
}

export interface ModifyOrderRequest {
  orderId: string;
  quantity?: number;
  orderType?: OrderType;
  price?: number;
  triggerPrice?: number;
}

export interface OrderBookEntry {
  orderId: string;
  symbol: string;
  exchange: Exchange;
  side: OrderSide;
  orderType: OrderType;
  productType: ProductType;
  quantity: number;
  filledQuantity: number;
  price: number;
  triggerPrice: number;
  avgPrice: number;
  status: OrderStatus;
  timestamp: string;
  tag?: string;
}

export interface TradeBookEntry {
  tradeId: string;
  orderId: string;
  symbol: string;
  exchange: Exchange;
  side: OrderSide;
  quantity: number;
  price: number;
  timestamp: string;
}

export interface Position {
  symbol: string;
  exchange: Exchange;
  productType: ProductType;
  side: OrderSide;
  quantity: number;
  avgPrice: number;
  ltp: number;
  pnl: number;
  pnlPercent: number;
}

export interface Holding {
  symbol: string;
  exchange: Exchange;
  quantity: number;
  avgPrice: number;
  ltp: number;
  pnl: number;
  investedValue: number;
  currentValue: number;
}

export interface FundsInfo {
  availableBalance: number;
  usedMargin: number;
  totalBalance: number;
  collateral: number;
  realizedPnl: number;
  unrealizedPnl: number;
}

export interface Quote {
  symbol: string;
  exchange: Exchange;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bidPrice: number;
  askPrice: number;
  bidQty: number;
  askQty: number;
  oi?: number;
  timestamp: number;
}

export interface DepthLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface MarketDepth {
  symbol: string;
  exchange: Exchange;
  bids: DepthLevel[];
  asks: DepthLevel[];
  ltp: number;
  totalBuyQty: number;
  totalSellQty: number;
}

export interface HistoricalBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number;
}

export type Resolution =
  | "1" | "2" | "3" | "5" | "10" | "15" | "30"
  | "60" | "120" | "240"
  | "1D" | "1W" | "1M";

// ─── Broker Interface ─────────────────────────────────────────────
export interface IBrokerAdapter {
  name: string;

  // Authentication
  authenticate(authCode: string): Promise<{ accessToken: string; refreshToken?: string }>;

  // Orders
  placeOrder(credentials: BrokerCredentials, order: OrderRequest): Promise<OrderResponse>;
  modifyOrder(credentials: BrokerCredentials, order: ModifyOrderRequest): Promise<OrderResponse>;
  cancelOrder(credentials: BrokerCredentials, orderId: string): Promise<OrderResponse>;

  // Book data
  getOrderBook(credentials: BrokerCredentials): Promise<OrderBookEntry[]>;
  getTradeBook(credentials: BrokerCredentials): Promise<TradeBookEntry[]>;
  getPositions(credentials: BrokerCredentials): Promise<Position[]>;
  getHoldings(credentials: BrokerCredentials): Promise<Holding[]>;

  // Account
  getFunds(credentials: BrokerCredentials): Promise<FundsInfo>;

  // Market data
  getQuote(credentials: BrokerCredentials, symbol: string, exchange: Exchange): Promise<Quote>;
  getMarketDepth(credentials: BrokerCredentials, symbol: string, exchange: Exchange): Promise<MarketDepth>;
  getHistoricalData(
    credentials: BrokerCredentials,
    symbol: string,
    exchange: Exchange,
    resolution: Resolution,
    fromDate: string,
    toDate: string
  ): Promise<HistoricalBar[]>;
}
