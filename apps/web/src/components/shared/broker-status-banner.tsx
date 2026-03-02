"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Landmark, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrokerInfo } from "@/types/broker";

const STATUS_CONFIG = {
  CONNECTED: {
    label: "Connected",
    borderColor: "border-l-[#10B981]",
    dotColor: "bg-[#10B981]",
    badgeBg: "bg-[#10B981]/10",
    badgeText: "text-[#10B981]",
  },
  SAVED: {
    label: "Saved",
    borderColor: "border-l-[#F59E0B]",
    dotColor: "bg-[#F59E0B]",
    badgeBg: "bg-[#F59E0B]/10",
    badgeText: "text-[#F59E0B]",
  },
  DISCONNECTED: {
    label: "Not Connected",
    borderColor: "border-l-[#6B7280]",
    dotColor: "bg-[#6B7280]",
    badgeBg: "bg-[#6B7280]/10",
    badgeText: "text-[#6B7280]",
  },
};

export function BrokerStatusBanner() {
  const router = useRouter();
  const [broker, setBroker] = useState<BrokerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/broker/angelone/auth");
      if (res.ok) {
        const data = await res.json();
        const angelOne = data.brokers?.find(
          (b: BrokerInfo) => b.platform === "ANGELONE"
        );
        setBroker(angelOne || null);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;
  if (!broker) return null;

  const config = STATUS_CONFIG[broker.status] || STATUS_CONFIG.DISCONNECTED;
  const ctaHref = broker.connected ? "/broker" : "/integrations";
  const ctaLabel = broker.connected ? "View Broker Data" : "Connect Now";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-xl mb-6",
        "bg-[var(--bg-card)] border border-[var(--border-color)] border-l-4",
        config.borderColor
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Broker icon */}
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[#F59E0B]/10 shrink-0">
          <Landmark className="h-4 w-4 text-[#F59E0B]" />
        </div>

        {/* Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Angel One
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                config.badgeBg,
                config.badgeText
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
              {config.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {broker.clientCode && (
              <span className="text-xs text-[var(--text-muted)]">
                {broker.clientCode}
              </span>
            )}
            {broker.lastSyncAt && (
              <span className="text-[10px] text-[var(--text-muted)]">
                Last sync:{" "}
                {new Date(broker.lastSyncAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push(ctaHref)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0",
          broker.connected
            ? "bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20"
            : "bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/20"
        )}
      >
        {ctaLabel}
        <ExternalLink className="h-3 w-3" />
      </button>
    </div>
  );
}
