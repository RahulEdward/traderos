// ─── Angel One SmartStream Integration ──────────────────────────
// Manages WebSocket connections to Angel One per-user and broadcasts
// tick data to clients via Socket.io rooms

import { Router, type Request, type Response } from "express";
import WebSocket from "ws";
import type { Server as SocketServer } from "socket.io";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────
interface StreamSession {
  ws: WebSocket;
  userId: string;
  subscriptions: Map<string, { exchangeType: number; tokens: string[]; mode: number }>;
  lastData: number;
  pingTimer: ReturnType<typeof setInterval> | null;
  healthTimer: ReturnType<typeof setInterval> | null;
}

// ─── Constants ──────────────────────────────────────────────────
const WS_URL = "wss://smartapisocket.angelone.in/smart-stream";
const PING_INTERVAL = 10_000;
const STALE_TIMEOUT = 90_000;

const EXCHANGE_TYPE_MAP: Record<string, number> = {
  NSE: 1, NFO: 2, BSE: 3, BFO: 4, MCX: 5, CDS: 13,
};

// Active stream sessions per user
const sessions = new Map<string, StreamSession>();

// ─── Binary Tick Parser ───────────────────────────────────────────
function parseBinaryTick(buffer: Buffer) {
  if (buffer.byteLength < 51) return null;

  const mode = buffer.readUInt8(0);
  const exchangeType = buffer.readUInt8(1);

  // Read token (25 bytes null-terminated)
  let token = "";
  for (let i = 2; i < 27; i++) {
    if (buffer[i] === 0) break;
    token += String.fromCharCode(buffer[i]);
  }
  token = token.trim();

  const tick: any = {
    token,
    exchangeType,
    mode,
    ltp: Number(buffer.readBigInt64LE(43)) / 100,
    exchangeTimestamp: Number(buffer.readBigInt64LE(35)),
  };

  // QUOTE mode (mode >= 2)
  if (mode >= 2 && buffer.byteLength >= 123) {
    tick.ltq = Number(buffer.readBigInt64LE(51));
    tick.avgPrice = Number(buffer.readBigInt64LE(59)) / 100;
    tick.volume = Number(buffer.readBigInt64LE(67));
    tick.totalBuyQty = Number(buffer.readBigInt64LE(75));
    tick.totalSellQty = Number(buffer.readBigInt64LE(83));
    tick.open = Number(buffer.readBigInt64LE(91)) / 100;
    tick.high = Number(buffer.readBigInt64LE(99)) / 100;
    tick.low = Number(buffer.readBigInt64LE(107)) / 100;
    tick.close = Number(buffer.readBigInt64LE(115)) / 100;
  }

  return tick;
}

// ─── Create/Get streaming session for user ───────────────────────
function getOrCreateSession(
  userId: string,
  apiKey: string,
  clientCode: string,
  authToken: string,
  feedToken: string,
  io: SocketServer
): StreamSession {
  // Reuse existing session if alive
  const existing = sessions.get(userId);
  if (existing && existing.ws.readyState === WebSocket.OPEN) {
    return existing;
  }

  // Close old session if stale
  if (existing) {
    cleanupSession(userId);
  }

  const ws = new WebSocket(WS_URL, {
    headers: {
      Authorization: authToken,
      "x-api-key": apiKey,
      "x-client-code": clientCode,
      "x-feed-token": feedToken,
    },
    rejectUnauthorized: false,
  });

  const session: StreamSession = {
    ws,
    userId,
    subscriptions: new Map(),
    lastData: Date.now(),
    pingTimer: null,
    healthTimer: null,
  };

  ws.on("open", () => {
    console.log(`[AngelStream] Connected for user ${userId}`);
    session.lastData = Date.now();

    // Ping timer
    session.pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send("ping");
      }
    }, PING_INTERVAL);

    // Health check
    session.healthTimer = setInterval(() => {
      if (Date.now() - session.lastData > STALE_TIMEOUT) {
        console.warn(`[AngelStream] Stale connection for user ${userId}, closing`);
        ws.close();
      }
    }, 30_000);

    // Resubscribe
    for (const [, sub] of session.subscriptions) {
      sendSubscribe(ws, sub.exchangeType, sub.tokens, sub.mode);
    }
  });

  ws.on("message", (data: Buffer) => {
    session.lastData = Date.now();
    const tick = parseBinaryTick(data);
    if (tick) {
      // Broadcast to user's Socket.io room
      io.to(userId).emit("tick", tick);
    }
  });

  ws.on("error", (err) => {
    console.error(`[AngelStream] Error for user ${userId}:`, err.message);
  });

  ws.on("close", () => {
    console.log(`[AngelStream] Disconnected for user ${userId}`);
    if (session.pingTimer) clearInterval(session.pingTimer);
    if (session.healthTimer) clearInterval(session.healthTimer);
    sessions.delete(userId);
  });

  sessions.set(userId, session);
  return session;
}

function sendSubscribe(ws: WebSocket, exchangeType: number, tokens: string[], mode: number) {
  if (ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({
    correlationID: `sub_${Date.now()}`,
    action: 1,
    params: {
      mode,
      tokenList: [{ exchangeType, tokens }],
    },
  }));
}

function cleanupSession(userId: string) {
  const session = sessions.get(userId);
  if (!session) return;
  if (session.pingTimer) clearInterval(session.pingTimer);
  if (session.healthTimer) clearInterval(session.healthTimer);
  if (session.ws.readyState === WebSocket.OPEN) {
    session.ws.close();
  }
  sessions.delete(userId);
}

// ─── Route factory (needs io instance) ──────────────────────────
export function createAngelStreamRouter(io: SocketServer): Router {
  // POST /api/stream/angelone
  router.post("/angelone", async (req: Request, res: Response) => {
    try {
      const { userId, action, exchange, tokens, mode, apiKey, clientCode, authToken, feedToken } = req.body;

      if (!userId || !action || !exchange || !tokens?.length) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const exchangeType = EXCHANGE_TYPE_MAP[exchange];
      if (exchangeType === undefined) {
        return res.status(400).json({ error: `Unknown exchange: ${exchange}` });
      }

      if (action === "subscribe") {
        // Need credentials to create session
        if (!apiKey || !clientCode || !authToken || !feedToken) {
          return res.status(400).json({ error: "Credentials required for subscription" });
        }

        const session = getOrCreateSession(userId, apiKey, clientCode, authToken, feedToken, io);
        const key = `${exchange}:${mode || 1}`;
        session.subscriptions.set(key, { exchangeType, tokens, mode: mode || 1 });

        // Send subscribe if already connected
        if (session.ws.readyState === WebSocket.OPEN) {
          sendSubscribe(session.ws, exchangeType, tokens, mode || 1);
        }

        return res.json({
          success: true,
          message: `Subscribed to ${tokens.length} tokens on ${exchange}`,
        });
      }

      if (action === "unsubscribe") {
        const session = sessions.get(userId);
        if (session && session.ws.readyState === WebSocket.OPEN) {
          session.ws.send(JSON.stringify({
            correlationID: `unsub_${Date.now()}`,
            action: 2,
            params: {
              mode: mode || 1,
              tokenList: [{ exchangeType, tokens }],
            },
          }));
          session.subscriptions.delete(`${exchange}:${mode || 1}`);
        }
        return res.json({ success: true, message: "Unsubscribed" });
      }

      if (action === "disconnect") {
        cleanupSession(userId);
        return res.json({ success: true, message: "Stream disconnected" });
      }

      return res.status(400).json({ error: `Unknown action: ${action}` });
    } catch (error) {
      console.error("[AngelStream] Route error:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // GET /api/stream/angelone/status
  router.get("/angelone/status", (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    const session = sessions.get(userId);
    return res.json({
      connected: session?.ws.readyState === WebSocket.OPEN,
      subscriptions: session
        ? Array.from(session.subscriptions.entries()).map(([key, sub]) => ({
            key,
            exchangeType: sub.exchangeType,
            tokens: sub.tokens,
            mode: sub.mode,
          }))
        : [],
    });
  });

  return router;
}

export default createAngelStreamRouter;
