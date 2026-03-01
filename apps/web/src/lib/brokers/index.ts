// ─── Broker Registry ──────────────────────────────────────────────
// Central broker registry - add new brokers here

import type { IBrokerAdapter } from "./types";
export type { IBrokerAdapter } from "./types";
export * from "./types";

import { FyersAdapter } from "./fyers";
import { AngelOneAdapter } from "./angelone";

export type BrokerName = "fyers" | "angelone";

const brokerRegistry: Record<BrokerName, () => IBrokerAdapter> = {
  fyers: () => new FyersAdapter(),
  angelone: () => new AngelOneAdapter(),
};

export function getBrokerAdapter(name: BrokerName): IBrokerAdapter {
  const factory = brokerRegistry[name];
  if (!factory) {
    throw new Error(`Broker "${name}" is not supported`);
  }
  return factory();
}

// Re-export individual brokers
export { FyersAdapter } from "./fyers";
export { AngelOneAdapter } from "./angelone";
