// ─── Fyers API Client ─────────────────────────────────────────────
// Low-level HTTP client for Fyers REST API v3
// Inspired by OpenAlgo architecture but written from scratch in TypeScript

import { FYERS_CONFIG } from "./config";

interface FyersResponse<T = any> {
  s: "ok" | "error";
  code?: number;
  message?: string;
  [key: string]: T | string | number | undefined;
}

export class FyersClient {
  private apiKey: string;
  private accessToken: string;

  constructor(apiKey: string, accessToken: string) {
    this.apiKey = apiKey;
    this.accessToken = accessToken;
  }

  // ─── Auth header format: "{api_key}:{access_token}" ──────────
  private get authHeader(): string {
    return `${this.apiKey}:${this.accessToken}`;
  }

  // ─── Generic API request ─────────────────────────────────────
  private async request<T = any>(
    endpoint: string,
    method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
    body?: Record<string, any>
  ): Promise<T> {
    const url = `${FYERS_CONFIG.BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      "Content-Type": "application/json",
    };

    const options: RequestInit = { method, headers };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Fyers API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.s === "error") {
      throw new Error(data.message || "Fyers API returned an error");
    }

    return data as T;
  }

  // ─── Authentication ──────────────────────────────────────────
  static async authenticate(
    apiKey: string,
    apiSecret: string,
    authCode: string
  ): Promise<{ accessToken: string }> {
    // Generate SHA-256 hash of "apiKey:apiSecret"
    const encoder = new TextEncoder();
    const data = encoder.encode(`${apiKey}:${apiSecret}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const appIdHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const response = await fetch(FYERS_CONFIG.AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        appIdHash,
        code: authCode,
      }),
    });

    const result = await response.json();

    if (result.s !== "ok" || !result.access_token) {
      throw new Error(result.message || "Authentication failed");
    }

    return { accessToken: result.access_token };
  }

  // ═══════════════════════════════════════════════════════════════
  // ORDER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async placeOrder(order: {
    symbol: string;
    qty: number;
    type: number;
    side: number;
    productType: string;
    limitPrice?: number;
    stopPrice?: number;
    validity?: string;
    orderTag?: string;
  }) {
    return this.request("/api/v3/orders/sync", "POST", {
      symbol: order.symbol,
      qty: order.qty,
      type: order.type,
      side: order.side,
      productType: order.productType,
      limitPrice: order.limitPrice || 0,
      stopPrice: order.stopPrice || 0,
      validity: order.validity || "DAY",
      disclosedQty: 0,
      offlineOrder: false,
      stopLoss: 0,
      takeProfit: 0,
      orderTag: order.orderTag || "tradeos",
    });
  }

  async modifyOrder(params: {
    id: string;
    qty?: number;
    type?: number;
    limitPrice?: number;
    stopPrice?: number;
  }) {
    return this.request("/api/v3/orders/sync", "PATCH", params);
  }

  async cancelOrder(orderId: string) {
    return this.request("/api/v3/orders/sync", "DELETE", { id: orderId });
  }

  async cancelAllOrders() {
    const orderBook = await this.getOrderBook();
    const openOrders = orderBook.filter(
      (o: any) => o.status === 4 || o.status === 6
    );
    const results = [];
    for (const order of openOrders) {
      try {
        const result = await this.cancelOrder(order.id);
        results.push(result);
      } catch (err) {
        results.push({ id: order.id, error: (err as Error).message });
      }
    }
    return results;
  }

  // ═══════════════════════════════════════════════════════════════
  // BOOK DATA
  // ═══════════════════════════════════════════════════════════════

  async getOrderBook(): Promise<any[]> {
    const data = await this.request("/api/v3/orders");
    return data.orderBook || [];
  }

  async getTradeBook(): Promise<any[]> {
    const data = await this.request("/api/v3/tradebook");
    return data.tradeBook || [];
  }

  async getPositions(): Promise<any[]> {
    const data = await this.request("/api/v3/positions");
    return data.netPositions || [];
  }

  async getHoldings(): Promise<any[]> {
    const data = await this.request("/api/v3/holdings");
    return data.holdings || [];
  }

  // ═══════════════════════════════════════════════════════════════
  // ACCOUNT
  // ═══════════════════════════════════════════════════════════════

  async getFunds(): Promise<any> {
    const data = await this.request("/api/v3/funds");
    return data.fund_limit || [];
  }

  // ═══════════════════════════════════════════════════════════════
  // MARKET DATA
  // ═══════════════════════════════════════════════════════════════

  async getQuote(symbol: string): Promise<any> {
    const encodedSymbol = encodeURIComponent(symbol);
    return this.request(`/data/depth?symbol=${encodedSymbol}&ohlcv_flag=1`);
  }

  async getMultiQuotes(symbols: string[]): Promise<any> {
    const symbolStr = symbols.map(encodeURIComponent).join(",");
    return this.request(`/data/quotes?symbols=${symbolStr}`);
  }

  async getHistoricalData(params: {
    symbol: string;
    resolution: string;
    fromDate: string; // YYYY-MM-DD
    toDate: string;   // YYYY-MM-DD
    includeOI?: boolean;
  }): Promise<any> {
    const { symbol, resolution, fromDate, toDate, includeOI } = params;
    const encodedSymbol = encodeURIComponent(symbol);
    let url = `/data/history?symbol=${encodedSymbol}&resolution=${resolution}&date_format=1&range_from=${fromDate}&range_to=${toDate}&cont_flag=1`;

    if (includeOI) {
      url += "&oi_flag=1";
    }

    return this.request(url);
  }

  // ═══════════════════════════════════════════════════════════════
  // POSITIONS
  // ═══════════════════════════════════════════════════════════════

  async closeAllPositions() {
    return this.request("/api/v3/positions", "DELETE", { exit_all: 1 });
  }
}
