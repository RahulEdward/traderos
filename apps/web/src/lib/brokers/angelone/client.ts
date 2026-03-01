// ─── Angel One SmartAPI Client ────────────────────────────────────
// Low-level HTTP client for Angel One SmartAPI REST endpoints
// Based on OpenAlgo architecture, written in TypeScript

import {
  ANGELONE_CONFIG,
  ENDPOINTS,
  getAngelHeaders,
  INTERVAL_CHUNK_DAYS,
} from "./config";

interface AngelResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: any;
}

export interface AngelAuthResult {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
}

export class AngelOneClient {
  private apiKey: string;
  private authToken: string;

  constructor(apiKey: string, authToken: string) {
    this.apiKey = apiKey;
    this.authToken = authToken;
  }

  // ─── Generic API request ─────────────────────────────────────
  private async request<T = any>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, any>
  ): Promise<T> {
    const url = `${ANGELONE_CONFIG.BASE_URL}${endpoint}`;
    const headers = getAngelHeaders(this.apiKey, this.authToken);

    const options: RequestInit = { method, headers };

    if (body && method === "POST") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(
        `Angel One API error: ${response.status} ${response.statusText}`
      );
    }

    const data: AngelResponse = await response.json();

    if (!data.status && data.message !== "SUCCESS") {
      throw new Error(
        data.message || `Angel One API error: ${data.errorcode}`
      );
    }

    return data.data as T;
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════

  static async authenticate(
    apiKey: string,
    clientCode: string,
    password: string,
    totp: string
  ): Promise<AngelAuthResult> {
    const url = `${ANGELONE_CONFIG.BASE_URL}${ENDPOINTS.LOGIN}`;
    const headers = getAngelHeaders(apiKey);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        clientcode: clientCode,
        password,
        totp,
      }),
    });

    const result: AngelResponse = await response.json();

    if (!result.status || !result.data?.jwtToken) {
      throw new Error(result.message || "Authentication failed");
    }

    return {
      jwtToken: result.data.jwtToken,
      refreshToken: result.data.refreshToken,
      feedToken: result.data.feedToken,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ORDER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async placeOrder(order: {
    variety: string;
    tradingsymbol: string;
    symboltoken: string;
    transactiontype: string;
    exchange: string;
    ordertype: string;
    producttype: string;
    duration: string;
    price: string;
    triggerprice: string;
    quantity: string;
  }): Promise<any> {
    return this.request(ENDPOINTS.PLACE_ORDER, "POST", {
      ...order,
      squareoff: "0",
      stoploss: "0",
    });
  }

  async modifyOrder(params: {
    variety: string;
    orderid: string;
    ordertype: string;
    producttype: string;
    price: string;
    triggerprice: string;
    quantity: string;
    tradingsymbol: string;
    symboltoken: string;
    exchange: string;
    duration: string;
  }): Promise<any> {
    return this.request(ENDPOINTS.MODIFY_ORDER, "POST", params);
  }

  async cancelOrder(variety: string, orderId: string): Promise<any> {
    return this.request(ENDPOINTS.CANCEL_ORDER, "POST", {
      variety,
      orderid: orderId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // BOOK DATA
  // ═══════════════════════════════════════════════════════════════

  async getOrderBook(): Promise<any[]> {
    const data = await this.request(ENDPOINTS.ORDER_BOOK);
    return data || [];
  }

  async getTradeBook(): Promise<any[]> {
    const data = await this.request(ENDPOINTS.TRADE_BOOK);
    return data || [];
  }

  async getPositions(): Promise<any[]> {
    const data = await this.request(ENDPOINTS.POSITIONS);
    return data || [];
  }

  async getHoldings(): Promise<any[]> {
    const data = await this.request(ENDPOINTS.HOLDINGS);
    // Holdings response wraps in data.holdings for newer API
    if (Array.isArray(data)) return data;
    return data?.holdings || [];
  }

  // ═══════════════════════════════════════════════════════════════
  // ACCOUNT
  // ═══════════════════════════════════════════════════════════════

  async getFunds(): Promise<any> {
    return this.request(ENDPOINTS.FUNDS);
  }

  // ═══════════════════════════════════════════════════════════════
  // MARKET DATA
  // ═══════════════════════════════════════════════════════════════

  async getQuote(
    exchange: string,
    symboltoken: string
  ): Promise<any> {
    const data = await this.request(ENDPOINTS.QUOTE, "POST", {
      mode: "FULL",
      exchangeTokens: {
        [exchange]: [symboltoken],
      },
    });
    // Response: { fetched: [...], unfetched: [...] }
    return data?.fetched?.[0] || null;
  }

  async getMultiQuotes(
    exchangeTokenMap: Record<string, string[]>
  ): Promise<any[]> {
    const allResults: any[] = [];
    // Angel One limits 50 tokens per request
    for (const [exchange, tokens] of Object.entries(exchangeTokenMap)) {
      for (let i = 0; i < tokens.length; i += 50) {
        const batch = tokens.slice(i, i + 50);
        const data = await this.request(ENDPOINTS.QUOTE, "POST", {
          mode: "FULL",
          exchangeTokens: { [exchange]: batch },
        });
        if (data?.fetched) {
          allResults.push(...data.fetched);
        }
        // Rate limit: 1 second between batches
        if (i + 50 < tokens.length) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
    return allResults;
  }

  // ═══════════════════════════════════════════════════════════════
  // HISTORICAL DATA
  // ═══════════════════════════════════════════════════════════════

  async getHistoricalData(params: {
    exchange: string;
    symboltoken: string;
    interval: string;
    fromdate: string; // "YYYY-MM-DD HH:mm"
    todate: string;   // "YYYY-MM-DD HH:mm"
  }): Promise<any[]> {
    const chunkDays = INTERVAL_CHUNK_DAYS[params.interval] || 30;
    const allCandles: any[] = [];

    // Parse date range
    let currentFrom = new Date(params.fromdate);
    const finalTo = new Date(params.todate);

    while (currentFrom < finalTo) {
      const chunkTo = new Date(currentFrom);
      chunkTo.setDate(chunkTo.getDate() + chunkDays);
      if (chunkTo > finalTo) chunkTo.setTime(finalTo.getTime());

      const fromStr = this.formatDate(currentFrom);
      const toStr = this.formatDate(chunkTo);

      try {
        const data = await this.request(ENDPOINTS.CANDLE_DATA, "POST", {
          exchange: params.exchange,
          symboltoken: params.symboltoken,
          interval: params.interval,
          fromdate: fromStr,
          todate: toStr,
        });

        if (Array.isArray(data)) {
          allCandles.push(...data);
        }
      } catch {
        // Some chunks may have no data, continue
      }

      // Rate limit between chunks
      if (chunkTo < finalTo) {
        await new Promise((r) => setTimeout(r, 500));
      }

      currentFrom = new Date(chunkTo);
      currentFrom.setDate(currentFrom.getDate() + 1);
    }

    // Remove duplicates by timestamp
    const seen = new Set<string>();
    return allCandles.filter((c) => {
      const key = c[0]; // timestamp
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async getOIData(params: {
    exchange: string;
    symboltoken: string;
    interval: string;
    fromdate: string;
    todate: string;
  }): Promise<any[]> {
    try {
      const data = await this.request(ENDPOINTS.OI_DATA, "POST", params);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // POSITION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async closeAllPositions(): Promise<any[]> {
    const positions = await this.getPositions();
    const results: any[] = [];

    for (const pos of positions) {
      const netQty = Number(pos.netqty || 0);
      if (netQty === 0) continue;

      try {
        const result = await this.placeOrder({
          variety: "NORMAL",
          tradingsymbol: pos.tradingsymbol,
          symboltoken: pos.symboltoken,
          transactiontype: netQty > 0 ? "SELL" : "BUY",
          exchange: pos.exchange,
          ordertype: "MARKET",
          producttype: pos.producttype,
          duration: "DAY",
          price: "0",
          triggerprice: "0",
          quantity: String(Math.abs(netQty)),
        });
        results.push(result);
      } catch (err) {
        results.push({
          symbol: pos.tradingsymbol,
          error: (err as Error).message,
        });
      }
    }

    return results;
  }

  async cancelAllOrders(): Promise<any[]> {
    const orders = await this.getOrderBook();
    const results: any[] = [];

    for (const order of orders) {
      const status = (order.orderstatus || "").toLowerCase();
      if (status === "open" || status === "trigger pending") {
        try {
          const result = await this.cancelOrder(
            order.variety || "NORMAL",
            order.orderid
          );
          results.push(result);
        } catch (err) {
          results.push({
            orderId: order.orderid,
            error: (err as Error).message,
          });
        }
      }
    }

    return results;
  }

  // ─── Helpers ─────────────────────────────────────────────────
  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d} ${h}:${min}`;
  }
}
