// ─── Fyers Broker Adapter ─────────────────────────────────────────
// Implements IBrokerAdapter for Fyers, transforming between
// TradeOS standard types and Fyers-specific API format

import type {
  IBrokerAdapter,
  BrokerCredentials,
  OrderRequest,
  OrderResponse,
  ModifyOrderRequest,
  OrderBookEntry,
  TradeBookEntry,
  Position,
  Holding,
  FundsInfo,
  Quote,
  MarketDepth,
  HistoricalBar,
  Resolution,
  Exchange,
} from "../types";

import { FyersClient } from "./client";
import {
  ORDER_TYPE_MAP,
  ORDER_TYPE_REVERSE,
  SIDE_MAP,
  SIDE_REVERSE,
  PRODUCT_MAP,
  ORDER_STATUS_MAP,
  EXCHANGE_PREFIX,
  SEGMENT_SUFFIX,
  RESOLUTION_MAP,
} from "./config";

export class FyersAdapter implements IBrokerAdapter {
  name = "Fyers";

  private getApiKey(): string {
    return process.env.FYERS_API_KEY || "";
  }

  private getApiSecret(): string {
    return process.env.FYERS_API_SECRET || "";
  }

  private createClient(credentials: BrokerCredentials): FyersClient {
    return new FyersClient(credentials.apiKey, credentials.accessToken);
  }

  // ─── Symbol Formatting ──────────────────────────────────────────
  // Convert "RELIANCE" + "NSE" → "NSE:RELIANCE-EQ"
  private toFyersSymbol(symbol: string, exchange: Exchange): string {
    const prefix = EXCHANGE_PREFIX[exchange] || "NSE";
    const suffix = SEGMENT_SUFFIX[exchange] || "-EQ";
    return `${prefix}:${symbol}${suffix}`;
  }

  // Convert "NSE:RELIANCE-EQ" → { symbol: "RELIANCE", exchange: "NSE" }
  private fromFyersSymbol(fyersSymbol: string): { symbol: string; exchange: Exchange } {
    const [exchangePart, symbolPart] = fyersSymbol.split(":");
    // Remove known suffixes
    const cleanSymbol = symbolPart
      ?.replace(/-EQ$/, "")
      .replace(/-A$/, "")
      || symbolPart;

    return {
      symbol: cleanSymbol,
      exchange: (exchangePart as Exchange) || "NSE",
    };
  }

  // ─── Exchange code tuple → our Exchange enum ────────────────────
  private resolveExchange(exchCode: number, segCode: number): Exchange {
    if (exchCode === 10 && segCode === 10) return "NSE";
    if (exchCode === 10 && segCode === 11) return "NFO";
    if (exchCode === 10 && segCode === 12) return "CDS";
    if (exchCode === 12 && segCode === 10) return "BSE";
    if (exchCode === 12 && segCode === 11) return "BFO";
    if (exchCode === 11 && segCode === 20) return "MCX";
    return "NSE";
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════

  async authenticate(authCode: string) {
    const result = await FyersClient.authenticate(
      this.getApiKey(),
      this.getApiSecret(),
      authCode
    );
    return { accessToken: result.accessToken };
  }

  // ═══════════════════════════════════════════════════════════════
  // ORDER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async placeOrder(
    credentials: BrokerCredentials,
    order: OrderRequest
  ): Promise<OrderResponse> {
    const client = this.createClient(credentials);

    const fyersOrder = {
      symbol: this.toFyersSymbol(order.symbol, order.exchange),
      qty: order.quantity,
      type: ORDER_TYPE_MAP[order.orderType],
      side: SIDE_MAP[order.side],
      productType: PRODUCT_MAP[order.productType],
      limitPrice: order.price,
      stopPrice: order.triggerPrice,
      orderTag: order.tag || "tradeos",
    };

    const result = await client.placeOrder(fyersOrder);

    return {
      orderId: result.id || "",
      status: "OPEN",
      message: result.message,
    };
  }

  async modifyOrder(
    credentials: BrokerCredentials,
    order: ModifyOrderRequest
  ): Promise<OrderResponse> {
    const client = this.createClient(credentials);

    const result = await client.modifyOrder({
      id: order.orderId,
      qty: order.quantity,
      type: order.orderType ? ORDER_TYPE_MAP[order.orderType] : undefined,
      limitPrice: order.price,
      stopPrice: order.triggerPrice,
    });

    return {
      orderId: order.orderId,
      status: "OPEN",
      message: result.message,
    };
  }

  async cancelOrder(
    credentials: BrokerCredentials,
    orderId: string
  ): Promise<OrderResponse> {
    const client = this.createClient(credentials);
    const result = await client.cancelOrder(orderId);

    return {
      orderId,
      status: "CANCELLED",
      message: result.message,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // BOOK DATA
  // ═══════════════════════════════════════════════════════════════

  async getOrderBook(credentials: BrokerCredentials): Promise<OrderBookEntry[]> {
    const client = this.createClient(credentials);
    const orders = await client.getOrderBook();

    return orders.map((o: any) => {
      const { symbol, exchange } = this.fromFyersSymbol(o.symbol);
      return {
        orderId: o.id,
        symbol,
        exchange,
        side: SIDE_REVERSE[o.side] as any || "BUY",
        orderType: (ORDER_TYPE_REVERSE[o.type] as any) || "MARKET",
        productType: o.productType as any,
        quantity: o.qty,
        filledQuantity: o.filledQty || 0,
        price: o.limitPrice || 0,
        triggerPrice: o.stopPrice || 0,
        avgPrice: o.tradedPrice || 0,
        status: (ORDER_STATUS_MAP[o.status] as any) || "OPEN",
        timestamp: o.orderDateTime || "",
        tag: o.orderTag,
      };
    });
  }

  async getTradeBook(credentials: BrokerCredentials): Promise<TradeBookEntry[]> {
    const client = this.createClient(credentials);
    const trades = await client.getTradeBook();

    return trades.map((t: any) => {
      const { symbol, exchange } = this.fromFyersSymbol(t.symbol);
      return {
        tradeId: t.id,
        orderId: t.orderNumber || t.id,
        symbol,
        exchange,
        side: SIDE_REVERSE[t.side] as any || "BUY",
        quantity: t.tradedQty || t.qty,
        price: t.tradePrice || 0,
        timestamp: t.orderDateTime || "",
      };
    });
  }

  async getPositions(credentials: BrokerCredentials): Promise<Position[]> {
    const client = this.createClient(credentials);
    const positions = await client.getPositions();

    return positions
      .filter((p: any) => p.netQty !== 0)
      .map((p: any) => {
        const { symbol, exchange } = this.fromFyersSymbol(p.symbol);
        return {
          symbol,
          exchange,
          productType: p.productType as any,
          side: p.netQty > 0 ? "BUY" : ("SELL" as any),
          quantity: Math.abs(p.netQty),
          avgPrice: p.netAvg || p.avgPrice || 0,
          ltp: p.ltp || 0,
          pnl: p.pl || p.realized_profit || 0,
          pnlPercent: p.netAvg
            ? ((p.ltp - p.netAvg) / p.netAvg) * 100
            : 0,
        };
      });
  }

  async getHoldings(credentials: BrokerCredentials): Promise<Holding[]> {
    const client = this.createClient(credentials);
    const holdings = await client.getHoldings();

    return holdings.map((h: any) => {
      const { symbol, exchange } = this.fromFyersSymbol(h.symbol || "");
      const investedValue = (h.costPrice || 0) * (h.quantity || 0);
      const currentValue = (h.ltp || 0) * (h.quantity || 0);
      return {
        symbol: h.symbol_desc || symbol,
        exchange,
        quantity: h.quantity || h.remainingQuantity || 0,
        avgPrice: h.costPrice || 0,
        ltp: h.ltp || 0,
        pnl: currentValue - investedValue,
        investedValue,
        currentValue,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ACCOUNT
  // ═══════════════════════════════════════════════════════════════

  async getFunds(credentials: BrokerCredentials): Promise<FundsInfo> {
    const client = this.createClient(credentials);
    const funds = await client.getFunds();

    // Fyers returns funds as an array of objects with id/title/equityAmount/commodityAmount
    let availableBalance = 0;
    let usedMargin = 0;
    let totalBalance = 0;
    let collateral = 0;
    let realizedPnl = 0;

    if (Array.isArray(funds)) {
      for (const item of funds) {
        const val = item.equityAmount || 0;
        switch (item.id) {
          case 6:  // Available balance
            availableBalance = val;
            break;
          case 9:  // Utilized margin
            usedMargin = val;
            break;
          case 10: // Total balance
            totalBalance = val;
            break;
          case 3:  // Collateral
            collateral = val;
            break;
          case 8:  // Realized P&L
            realizedPnl = val;
            break;
        }
      }
    }

    return {
      availableBalance,
      usedMargin,
      totalBalance,
      collateral,
      realizedPnl,
      unrealizedPnl: 0, // Calculated from positions
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // MARKET DATA
  // ═══════════════════════════════════════════════════════════════

  async getQuote(
    credentials: BrokerCredentials,
    symbol: string,
    exchange: Exchange
  ): Promise<Quote> {
    const client = this.createClient(credentials);
    const fyersSymbol = this.toFyersSymbol(symbol, exchange);
    const data = await client.getQuote(fyersSymbol);

    const d = data.d?.[fyersSymbol] || data.d || {};

    return {
      symbol,
      exchange,
      ltp: d.ltp || d.v?.lp || 0,
      open: d.v?.open_price || d.ohlc?.open || 0,
      high: d.v?.high_price || d.ohlc?.high || 0,
      low: d.v?.low_price || d.ohlc?.low || 0,
      close: d.v?.prev_close_price || d.ohlc?.close || 0,
      volume: d.v?.volume || d.vol_traded_today || 0,
      bidPrice: d.bids?.[0]?.price || 0,
      askPrice: d.ask?.[0]?.price || d.asks?.[0]?.price || 0,
      bidQty: d.bids?.[0]?.volume || d.bids?.[0]?.quantity || 0,
      askQty: d.ask?.[0]?.volume || d.asks?.[0]?.quantity || 0,
      oi: d.oi || 0,
      timestamp: d.v?.tt || Date.now(),
    };
  }

  async getMarketDepth(
    credentials: BrokerCredentials,
    symbol: string,
    exchange: Exchange
  ): Promise<MarketDepth> {
    const client = this.createClient(credentials);
    const fyersSymbol = this.toFyersSymbol(symbol, exchange);
    const data = await client.getQuote(fyersSymbol);

    const d = data.d?.[fyersSymbol] || data.d || {};

    const bids = (d.bids || []).slice(0, 5).map((b: any) => ({
      price: b.price || 0,
      quantity: b.volume || b.quantity || 0,
      orders: b.ord || 0,
    }));

    // Fyers uses "ask" (singular) in their API
    const asks = (d.ask || d.asks || []).slice(0, 5).map((a: any) => ({
      price: a.price || 0,
      quantity: a.volume || a.quantity || 0,
      orders: a.ord || 0,
    }));

    return {
      symbol,
      exchange,
      bids,
      asks,
      ltp: d.ltp || d.v?.lp || 0,
      totalBuyQty: d.totBuyQty || bids.reduce((s: number, b: any) => s + b.quantity, 0),
      totalSellQty: d.totSellQty || asks.reduce((s: number, a: any) => s + a.quantity, 0),
    };
  }

  async getHistoricalData(
    credentials: BrokerCredentials,
    symbol: string,
    exchange: Exchange,
    resolution: Resolution,
    fromDate: string,
    toDate: string
  ): Promise<HistoricalBar[]> {
    const client = this.createClient(credentials);
    const fyersSymbol = this.toFyersSymbol(symbol, exchange);
    const fyersResolution = RESOLUTION_MAP[resolution] || resolution;

    // Determine if we need OI data (derivatives exchanges)
    const includeOI = ["NFO", "BFO", "MCX", "CDS"].includes(exchange);

    const data = await client.getHistoricalData({
      symbol: fyersSymbol,
      resolution: fyersResolution,
      fromDate,
      toDate,
      includeOI,
    });

    const candles = data.candles || [];

    return candles.map((c: number[]) => ({
      timestamp: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5],
      oi: c[6],
    }));
  }
}
