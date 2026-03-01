"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

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
}

interface UseLiveTicksOptions {
  userId: string;
  enabled?: boolean;
  onTick?: (tick: TickData) => void;
}

export function useLiveTicks({ userId, enabled = true, onTick }: UseLiveTicksOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [ticks, setTicks] = useState<Map<string, TickData>>(new Map());

  useEffect(() => {
    if (!enabled || !userId) return;

    const wsUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const socket = io(wsUrl, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join", userId);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("tick", (tick: TickData) => {
      setTicks((prev) => {
        const next = new Map(prev);
        next.set(tick.token, tick);
        return next;
      });
      onTick?.(tick);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = useCallback(
    async (exchange: string, tokens: string[], mode: number = 1) => {
      try {
        const res = await fetch("/api/broker/angelone/live-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "subscribe",
            exchange,
            tokens,
            mode,
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    []
  );

  const unsubscribe = useCallback(
    async (exchange: string, tokens: string[], mode: number = 1) => {
      try {
        const res = await fetch("/api/broker/angelone/live-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unsubscribe",
            exchange,
            tokens,
            mode,
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    []
  );

  const getTickForToken = useCallback(
    (token: string): TickData | undefined => ticks.get(token),
    [ticks]
  );

  return {
    connected,
    ticks,
    subscribe,
    unsubscribe,
    getTickForToken,
  };
}
