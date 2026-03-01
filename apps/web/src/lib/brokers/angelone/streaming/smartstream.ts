// ─── Angel One SmartStream WebSocket Client ──────────────────────
// Binary protocol WebSocket client for real-time market data
// Based on OpenAlgo's smartWebSocketV2.py, ported to TypeScript
// This runs on the server side (Express backend / API route)

import { ANGELONE_CONFIG, WS_EXCHANGE_TYPE, WS_MODE } from "../config";
import type {
  TickData,
  SubscriptionMode,
  SubscriptionRequest,
  StreamCallbacks,
} from "./types";

const PING_INTERVAL = 10_000; // 10 seconds
const STALE_TIMEOUT = 90_000; // 90 seconds no data = stale
const MAX_RETRIES = 10;
const RETRY_DELAY_MIN = 5_000;
const RETRY_DELAY_MAX = 60_000;

export class AngelSmartStream {
  private apiKey: string;
  private clientCode: string;
  private authToken: string;
  private feedToken: string;
  private ws: WebSocket | null = null;
  private callbacks: StreamCallbacks;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private lastDataTime = 0;
  private retryCount = 0;
  private isRunning = false;
  private subscriptions: Map<string, { exchangeType: number; tokens: string[]; mode: SubscriptionMode }> = new Map();

  constructor(
    apiKey: string,
    clientCode: string,
    authToken: string,
    feedToken: string,
    callbacks: StreamCallbacks
  ) {
    this.apiKey = apiKey;
    this.clientCode = clientCode;
    this.authToken = authToken;
    this.feedToken = feedToken;
    this.callbacks = callbacks;
  }

  // ─── Connect to WebSocket ──────────────────────────────────────
  connect(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this._connect();
  }

  private _connect(): void {
    try {
      // Note: For Node.js, you'll need the 'ws' package
      // In browser, native WebSocket works
      const wsUrl = ANGELONE_CONFIG.WS_URL;

      this.ws = new WebSocket(wsUrl, {
        // @ts-expect-error - Node.js ws accepts headers in options
        headers: {
          Authorization: this.authToken,
          "x-api-key": this.apiKey,
          "x-client-code": this.clientCode,
          "x-feed-token": this.feedToken,
        },
      });

      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        console.log("[SmartStream] Connected");
        this.retryCount = 0;
        this.lastDataTime = Date.now();
        this._startPing();
        this._startHealthCheck();
        this.callbacks.onConnect?.();

        // Re-subscribe to any existing subscriptions
        for (const [, sub] of this.subscriptions) {
          this._sendSubscribe(sub.exchangeType, sub.tokens, sub.mode);
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.lastDataTime = Date.now();

        if (event.data instanceof ArrayBuffer) {
          this._parseBinaryTick(event.data);
        }
      };

      this.ws.onerror = (event: Event) => {
        console.error("[SmartStream] WebSocket error:", event);
        this.callbacks.onError?.(new Error("WebSocket connection error"));
      };

      this.ws.onclose = () => {
        console.log("[SmartStream] Disconnected");
        this._cleanup();
        this.callbacks.onDisconnect?.();

        if (this.isRunning) {
          this._reconnect();
        }
      };
    } catch (err) {
      console.error("[SmartStream] Connection failed:", err);
      if (this.isRunning) {
        this._reconnect();
      }
    }
  }

  // ─── Subscribe to symbols ──────────────────────────────────────
  subscribe(
    exchange: string,
    tokens: string[],
    mode: SubscriptionMode = WS_MODE.LTP
  ): void {
    const exchangeType = WS_EXCHANGE_TYPE[exchange];
    if (exchangeType === undefined) {
      throw new Error(`Unknown exchange: ${exchange}`);
    }

    // Store subscription for reconnection
    const key = `${exchange}:${mode}`;
    this.subscriptions.set(key, { exchangeType, tokens, mode });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this._sendSubscribe(exchangeType, tokens, mode);
    }
  }

  // ─── Unsubscribe from symbols ─────────────────────────────────
  unsubscribe(exchange: string, tokens: string[], mode: SubscriptionMode = WS_MODE.LTP): void {
    const exchangeType = WS_EXCHANGE_TYPE[exchange];
    if (exchangeType === undefined) return;

    const key = `${exchange}:${mode}`;
    this.subscriptions.delete(key);

    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg: SubscriptionRequest = {
        correlationID: `unsub_${Date.now()}`,
        action: 2,
        params: {
          mode,
          tokenList: [{ exchangeType, tokens }],
        },
      };
      this.ws.send(JSON.stringify(msg));
    }
  }

  // ─── Disconnect ──────────────────────────────────────────────
  disconnect(): void {
    this.isRunning = false;
    this._cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ─── Parse binary tick data ────────────────────────────────────
  // Angel One sends binary frames; all prices are in paise (÷100)
  private _parseBinaryTick(buffer: ArrayBuffer): void {
    const view = new DataView(buffer);

    if (buffer.byteLength < 2) return;

    const subscriptionMode = view.getUint8(0);
    const exchangeType = view.getUint8(1);

    // Read token (25 bytes, null-terminated string)
    const tokenBytes = new Uint8Array(buffer, 2, 25);
    let token = "";
    for (let i = 0; i < 25; i++) {
      if (tokenBytes[i] === 0) break;
      token += String.fromCharCode(tokenBytes[i]);
    }
    token = token.trim();

    const tick: TickData = {
      token,
      exchangeType,
      mode: subscriptionMode,
      ltp: 0,
    };

    // LTP mode (mode 1) - minimum data
    if (buffer.byteLength >= 51) {
      // Bytes 27-34: sequence number (int64, skip)
      // Bytes 35-42: exchange timestamp (int64)
      tick.exchangeTimestamp = Number(view.getBigInt64(35, true));
      // Bytes 43-50: LTP (int64) - in paise, divide by 100
      tick.ltp = Number(view.getBigInt64(43, true)) / 100;
    }

    // QUOTE mode (mode 2) - LTP + OHLC + volume
    if (subscriptionMode >= 2 && buffer.byteLength >= 115) {
      tick.ltq = Number(view.getBigInt64(51, true));
      tick.avgPrice = Number(view.getBigInt64(59, true)) / 100;
      tick.volume = Number(view.getBigInt64(67, true));
      tick.totalBuyQty = Number(view.getBigInt64(75, true));
      tick.totalSellQty = Number(view.getBigInt64(83, true));
      tick.open = Number(view.getBigInt64(91, true)) / 100;
      tick.high = Number(view.getBigInt64(99, true)) / 100;
      tick.low = Number(view.getBigInt64(107, true)) / 100;
      tick.close = Number(view.getBigInt64(115, true)) / 100;
    }

    // SNAP_QUOTE mode (mode 3) - Quote + depth
    if (subscriptionMode >= 3 && buffer.byteLength >= 123) {
      // After OHLC, there's lastTradeTime, OI, etc.
      if (buffer.byteLength >= 131) {
        tick.lastTradeTime = Number(view.getBigInt64(123, true));
      }
      if (buffer.byteLength >= 139) {
        tick.oi = Number(view.getBigInt64(131, true));
      }

      // 5-level depth starts after OI data
      const depthOffset = 147;
      if (buffer.byteLength >= depthOffset + 200) {
        tick.depth = { buy: [], sell: [] };
        for (let i = 0; i < 5; i++) {
          const base = depthOffset + i * 20;
          tick.depth.buy.push({
            quantity: view.getInt32(base, true),
            price: view.getInt32(base + 4, true) / 100,
            orders: view.getInt16(base + 8, true),
          });
          tick.depth.sell.push({
            quantity: view.getInt32(base + 10, true),
            price: view.getInt32(base + 14, true) / 100,
            orders: view.getInt16(base + 18, true),
          });
        }
      }
    }

    this.callbacks.onTick(tick);
  }

  // ─── Internal helpers ──────────────────────────────────────────
  private _sendSubscribe(
    exchangeType: number,
    tokens: string[],
    mode: SubscriptionMode
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const msg: SubscriptionRequest = {
      correlationID: `sub_${Date.now()}`,
      action: 1,
      params: {
        mode,
        tokenList: [{ exchangeType, tokens }],
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  private _startPing(): void {
    this._stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send("ping");
      }
    }, PING_INTERVAL);
  }

  private _stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private _startHealthCheck(): void {
    this._stopHealthCheck();
    this.healthTimer = setInterval(() => {
      if (Date.now() - this.lastDataTime > STALE_TIMEOUT) {
        console.warn("[SmartStream] Connection stale, reconnecting...");
        this.ws?.close();
      }
    }, 30_000);
  }

  private _stopHealthCheck(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }

  private _cleanup(): void {
    this._stopPing();
    this._stopHealthCheck();
  }

  private _reconnect(): void {
    if (this.retryCount >= MAX_RETRIES) {
      console.error("[SmartStream] Max retries reached, giving up");
      this.isRunning = false;
      this.callbacks.onError?.(new Error("Max reconnection attempts reached"));
      return;
    }

    const delay = Math.min(
      RETRY_DELAY_MIN * Math.pow(2, this.retryCount),
      RETRY_DELAY_MAX
    );
    this.retryCount++;

    console.log(
      `[SmartStream] Reconnecting in ${delay / 1000}s (attempt ${this.retryCount}/${MAX_RETRIES})`
    );

    setTimeout(() => {
      if (this.isRunning) {
        this._connect();
      }
    }, delay);
  }
}
