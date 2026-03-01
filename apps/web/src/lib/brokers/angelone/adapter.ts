// ─── Angel One Broker Adapter ─────────────────────────────────────
// Implements IBrokerAdapter for Angel One SmartAPI, transforming
// between TradeOS standard types and Angel One-specific API format

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

import { AngelOneClient } from "./client";
import {
  ORDER_TYPE_MAP,
  ORDER_TYPE_REVERSE,
  VARIETY_MAP,
  PRODUCT_MAP,
  PRODUCT_REVERSE,
  ORDER_STATUS_MAP,
  EXCHANGE_MAP,
  RESOLUTION_MAP,
} from "./config";

export class AngelOneAdapter implements IBrokerAdapter {
  name = "AngelOne";

  private getApiKey(): string {
    return process.env.ANGELONE_API_KEY || "";
  }

  private createClient(credentials: BrokerCredentials): AngelOneClient {
    return new AngelOneClient(credentials.apiKey, credentials.accessToken);
  }

  // ─── Symbol Handling ──────────────────────────────────────────
  // Angel One uses "SBIN-EQ" for cash, "NIFTY28FEB25FUT" for derivatives
  // TradeOS stores as "SBIN" with exchange "NSE"
  // For now we pass the trading symbol directly as stored in configJson
  private toAngelSymbol(symbol: string, exchange: Exchange): string {
    // Cash market symbols need -EQ suffix
    if (exchange === "NSE" || exchange === "BSE") {
      if (!symbol.includes("-")) {
        return `${symbol}-EQ`;
      }
    }
    return symbol;
  }

  private fromAngelSymbol(
    angelSymbol: string,
    angelExchange: string
  ): { symbol: string; exchange: Exchange } {
    let cleanSymbol = angelSymbol;
    // Remove known suffixes for cash
    if (cleanSymbol.endsWith("-EQ")) {
      cleanSymbol = cleanSymbol.replace(/-EQ$/, "");
    } else if (cleanSymbol.endsWith("-BE")) {
      cleanSymbol = cleanSymbol.replace(/-BE$/, "");
    }

    return {
      symbol: cleanSymbol,
      exchange: (angelExchange as Exchange) || "NSE",
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════

  async authenticate(authCode: string) {
    // For Angel One, authCode is a JSON string containing:
    // { clientCode, password, totp }
    const { clientCode, password, totp } = JSON.parse(authCode);

    const result = await AngelOneClient.authenticate(
      this.getApiKey(),
      clientCode,
      password,
      totp
    );

    return {
      accessToken: result.jwtToken,
      refreshToken: result.refreshToken,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ORDER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async placeOrder(
    credentials: BrokerCredentials,
    order: OrderRequest
  ): Promise<OrderResponse> {
    const client = this.createClient(credentials);

    const angelOrder = {
      variety: VARIETY_MAP[order.orderType] || "NORMAL",
      tradingsymbol: this.toAngelSymbol(order.symbol, order.exchange),
      symboltoken: "", // Will be resolved from master contract or passed
      transactiontype: order.side,
      exchange: EXCHANGE_MAP[order.exchange] || "NSE",
      ordertype: ORDER_TYPE_MAP[order.orderType] || "MARKET",
      producttype: PRODUCT_MAP[order.productType] || "INTRADAY",
      duration: "DAY",
      price: order.price ? String(order.price) : "0",
      triggerprice: order.triggerPrice ? String(order.triggerPrice) : "0",
      quantity: String(order.quantity),
    };

    const result = await client.placeOrder(angelOrder);

    return {
      orderId: result?.orderid || result?.uniqueorderid || "",
      status: "OPEN",
      message: "Order placed successfully",
    };
  }

  async modifyOrder(
    credentials: BrokerCredentials,
    order: ModifyOrderRequest
  ): Promise<OrderResponse> {
    const client = this.createClient(credentials);

    const result = await client.modifyOrder({
      variety: order.orderType
        ? VARIETY_MAP[order.orderType] || "NORMAL"
        : "NORMAL",
      orderid: order.orderId,
      ordertype: order.orderType
        ? ORDER_TYPE_MAP[order.orderType] || "MARKET"
        : "MARKET",
      producttype: "INTRADAY", // Will be overridden if needed
      price: order.price ? String(order.price) : "0",
      triggerprice: order.triggerPrice ? String(order.triggerPrice) : "0",
      quantity: order.quantity ? String(order.quantity) : "0",
      tradingsymbol: "",
      symboltoken: "",
      exchange: "NSE",
      duration: "DAY",
    });

    return {
      orderId: order.orderId,
      status: "OPEN",
      message: result?.message || "Order modified",
    };
  }

  async cancelOrder(
    credentials: BrokerCredentials,
    orderId: string
  ): Promise<OrderResponse> {
    const client = this.createClient(credentials);
    await client.cancelOrder("NORMAL", orderId);

    return {
      orderId,
      status: "CANCELLED",
      message: "Order cancelled",
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // BOOK DATA
  // ═══════════════════════════════════════════════════════════════

  async getOrderBook(credentials: BrokerCredentials): Promise<OrderBookEntry[]> {
    const client = this.createClient(credentials);
    const orders = await client.getOrderBook();

    return orders.map((o: any) => {
      const { symbol, exchange } = this.fromAngelSymbol(
        o.tradingsymbol || "",
        o.exchange || "NSE"
      );
      const status = (o.orderstatus || "").toLowerCase();

      return {
        orderId: o.orderid || "",
        symbol,
        exchange,
        side: (o.transactiontype as any) || "BUY",
        orderType: (ORDER_TYPE_REVERSE[o.ordertype] as any) || "MARKET",
        productType: (PRODUCT_REVERSE[o.producttype] as any) || "INTRADAY",
        quantity: Number(o.quantity || 0),
        filledQuantity: Number(o.filledshares || 0),
        price: Number(o.price || 0),
        triggerPrice: Number(o.triggerprice || 0),
        avgPrice: Number(o.averageprice || 0),
        status: (ORDER_STATUS_MAP[status] as any) || "OPEN",
        timestamp: o.updatetime || o.ordervalidity || "",
        tag: o.ordertag,
      };
    });
  }

  async getTradeBook(credentials: BrokerCredentials): Promise<TradeBookEntry[]> {
    const client = this.createClient(credentials);
    const trades = await client.getTradeBook();

    return trades.map((t: any) => {
      const { symbol, exchange } = this.fromAngelSymbol(
        t.tradingsymbol || "",
        t.exchange || "NSE"
      );

      return {
        tradeId: t.tradeid || t.fillid || "",
        orderId: t.orderid || "",
        symbol,
        exchange,
        side: (t.transactiontype as any) || "BUY",
        quantity: Number(t.fillsize || t.quantity || 0),
        price: Number(t.fillprice || t.price || 0),
        timestamp: t.filltime || t.updatetime || "",
      };
    });
  }

  async getPositions(credentials: BrokerCredentials): Promise<Position[]> {
    const client = this.createClient(credentials);
    const positions = await client.getPositions();

    return positions
      .filter((p: any) => Number(p.netqty || 0) !== 0)
      .map((p: any) => {
        const { symbol, exchange } = this.fromAngelSymbol(
          p.tradingsymbol || "",
          p.exchange || "NSE"
        );
        const netQty = Number(p.netqty || 0);
        const avgPrice = Number(p.netprice || p.averagenetprice || 0);
        const ltp = Number(p.ltp || 0);

        return {
          symbol,
          exchange,
          productType: (PRODUCT_REVERSE[p.producttype] as any) || "INTRADAY",
          side: netQty > 0 ? "BUY" : ("SELL" as any),
          quantity: Math.abs(netQty),
          avgPrice,
          ltp,
          pnl: Number(p.pnl || p.realised || 0) + Number(p.unrealised || 0),
          pnlPercent: avgPrice ? ((ltp - avgPrice) / avgPrice) * 100 : 0,
        };
      });
  }

  async getHoldings(credentials: BrokerCredentials): Promise<Holding[]> {
    const client = this.createClient(credentials);
    const holdings = await client.getHoldings();

    return holdings.map((h: any) => {
      const { symbol, exchange } = this.fromAngelSymbol(
        h.tradingsymbol || "",
        h.exchange || "NSE"
      );
      const qty = Number(h.quantity || h.t1quantity || 0);
      const avgPrice = Number(h.averageprice || 0);
      const ltp = Number(h.ltp || 0);
      const investedValue = avgPrice * qty;
      const currentValue = ltp * qty;

      return {
        symbol,
        exchange,
        quantity: qty,
        avgPrice,
        ltp,
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
    const rms = await client.getFunds();

    const availableBalance = Number(rms?.availablecash || 0);
    const utilisedPayout = Number(rms?.utilisedpayout || 0);
    const collateral = availableBalance - utilisedPayout;
    const usedMargin = Number(rms?.utiliseddebits || 0);

    return {
      availableBalance,
      usedMargin,
      totalBalance: availableBalance + usedMargin,
      collateral: Math.max(0, collateral),
      realizedPnl: Number(rms?.m2mrealized || 0),
      unrealizedPnl: Number(rms?.m2munrealized || 0),
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
    const angelExchange = EXCHANGE_MAP[exchange] || "NSE";

    // Symbol token needs to be passed - for now use the symbol as token
    // In production, this would be looked up from master contract DB
    const data = await client.getQuote(angelExchange, symbol);

    if (!data) {
      throw new Error(`No quote data for ${symbol} on ${exchange}`);
    }

    return {
      symbol,
      exchange,
      ltp: Number(data.ltp || 0),
      open: Number(data.open || 0),
      high: Number(data.high || 0),
      low: Number(data.low || 0),
      close: Number(data.close || 0),
      volume: Number(data.totTradedVol || data.tradeVolume || 0),
      bidPrice: Number(data.depth?.buy?.[0]?.price || 0),
      askPrice: Number(data.depth?.sell?.[0]?.price || 0),
      bidQty: Number(data.depth?.buy?.[0]?.quantity || 0),
      askQty: Number(data.depth?.sell?.[0]?.quantity || 0),
      oi: Number(data.opnInterest || 0),
      timestamp: data.exchFeedTime
        ? new Date(data.exchFeedTime).getTime()
        : Date.now(),
    };
  }

  async getMarketDepth(
    credentials: BrokerCredentials,
    symbol: string,
    exchange: Exchange
  ): Promise<MarketDepth> {
    const client = this.createClient(credentials);
    const angelExchange = EXCHANGE_MAP[exchange] || "NSE";
    const data = await client.getQuote(angelExchange, symbol);

    if (!data) {
      throw new Error(`No depth data for ${symbol} on ${exchange}`);
    }

    const buyDepth = data.depth?.buy || [];
    const sellDepth = data.depth?.sell || [];

    const bids = buyDepth.slice(0, 5).map((b: any) => ({
      price: Number(b.price || 0),
      quantity: Number(b.quantity || 0),
      orders: Number(b.orders || 0),
    }));

    const asks = sellDepth.slice(0, 5).map((a: any) => ({
      price: Number(a.price || 0),
      quantity: Number(a.quantity || 0),
      orders: Number(a.orders || 0),
    }));

    return {
      symbol,
      exchange,
      bids,
      asks,
      ltp: Number(data.ltp || 0),
      totalBuyQty: Number(
        data.totBuyQuan || bids.reduce((s: number, b: any) => s + b.quantity, 0)
      ),
      totalSellQty: Number(
        data.totSellQuan || asks.reduce((s: number, a: any) => s + a.quantity, 0)
      ),
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
    const angelExchange = EXCHANGE_MAP[exchange] || "NSE";
    const angelInterval = RESOLUTION_MAP[resolution] || "ONE_DAY";

    // Symbol token - in production would come from master contract
    const symboltoken = symbol;

    const candles = await client.getHistoricalData({
      exchange: angelExchange,
      symboltoken,
      interval: angelInterval,
      fromdate: `${fromDate} 00:00`,
      todate: `${toDate} 15:30`,
    });

    // Fetch OI data for derivatives
    let oiMap: Record<string, number> = {};
    if (["NFO", "BFO", "MCX", "CDS"].includes(exchange)) {
      const oiData = await client.getOIData({
        exchange: angelExchange,
        symboltoken,
        interval: angelInterval,
        fromdate: `${fromDate} 00:00`,
        todate: `${toDate} 15:30`,
      });
      for (const row of oiData) {
        if (row[0]) oiMap[row[0]] = Number(row[1] || 0);
      }
    }

    return candles.map((c: any[]) => {
      // Angel One candle format: [timestamp, open, high, low, close, volume]
      const ts = c[0];
      const timestamp = typeof ts === "string" ? new Date(ts).getTime() / 1000 : ts;

      return {
        timestamp,
        open: Number(c[1]),
        high: Number(c[2]),
        low: Number(c[3]),
        close: Number(c[4]),
        volume: Number(c[5]),
        oi: oiMap[ts] || undefined,
      };
    });
  }
}
