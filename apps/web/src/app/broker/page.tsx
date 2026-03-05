"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  RefreshCw,
  Wallet,
  BarChart3,
  Package,
  FileText,
  ArrowUpDown,
  Plug,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/shared/metric-card";
import type {
  BrokerInfo,
  FundsInfo,
  Position,
  Holding,
  OrderBookEntry,
  TradeBookEntry,
} from "@/types/broker";

// ─── INR Formatter ────────────────────────────────────────────────
const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);

// ─── Tabs ─────────────────────────────────────────────────────────
const TABS = [
  { id: "positions", label: "Positions", icon: BarChart3 },
  { id: "holdings", label: "Holdings", icon: Package },
  { id: "orders", label: "Orders", icon: FileText },
  { id: "trades", label: "Trades", icon: ArrowUpDown },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function BrokerPage() {
  const router = useRouter();
  const [broker, setBroker] = useState<BrokerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("positions");

  // Data states
  const [funds, setFunds] = useState<FundsInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [orders, setOrders] = useState<OrderBookEntry[]>([]);
  const [trades, setTrades] = useState<TradeBookEntry[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Check broker status ─────────────────────────────────────────
  useEffect(() => {
    const checkStatus = async () => {
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
    checkStatus();
  }, []);

  // ── Fetch funds (always loaded when connected) ──────────────────
  const fetchFunds = useCallback(async () => {
    try {
      const res = await fetch("/api/broker/angelone/positions?type=funds");
      if (res.ok) {
        const data = await res.json();
        // API returns { funds: {...} } — extract the inner object
        setFunds(data?.funds || data);
      }
    } catch {
      // silently fail
    }
  }, []);

  // ── Fetch tab data ──────────────────────────────────────────────
  const fetchTabData = useCallback(
    async (tab: TabId) => {
      setTabLoading(true);
      try {
        let url = "";
        switch (tab) {
          case "positions":
            url = "/api/broker/angelone/positions?type=positions";
            break;
          case "holdings":
            url = "/api/broker/angelone/positions?type=holdings";
            break;
          case "orders":
            url = "/api/broker/angelone/orders?type=orders";
            break;
          case "trades":
            url = "/api/broker/angelone/orders?type=trades";
            break;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          switch (tab) {
            case "positions":
              setPositions(Array.isArray(data) ? data : data.positions || []);
              break;
            case "holdings":
              setHoldings(Array.isArray(data) ? data : data.holdings || []);
              break;
            case "orders":
              setOrders(Array.isArray(data) ? data : data.orders || []);
              break;
            case "trades":
              setTrades(Array.isArray(data) ? data : data.trades || []);
              break;
          }
        }
      } catch {
        // silently fail
      } finally {
        setTabLoading(false);
      }
    },
    []
  );

  // ── Load data when broker is connected ──────────────────────────
  useEffect(() => {
    if (broker?.connected) {
      fetchFunds();
      fetchTabData(activeTab);
    }
  }, [broker?.connected, fetchFunds, fetchTabData, activeTab]);

  // ── Auto-refresh during market hours (9:15 AM - 3:30 PM IST) ───
  useEffect(() => {
    if (!broker?.connected) return;
    const interval = setInterval(() => {
      const now = new Date();
      const ist = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      const hours = ist.getHours();
      const minutes = ist.getMinutes();
      const totalMin = hours * 60 + minutes;
      // Market hours: 9:15 AM (555) to 3:30 PM (930)
      if (totalMin >= 555 && totalMin <= 930) {
        fetchFunds();
        fetchTabData(activeTab);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [broker?.connected, activeTab, fetchFunds, fetchTabData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFunds(), fetchTabData(activeTab)]);
    setRefreshing(false);
  };

  // ── Loading state ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--bg-card)] rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[var(--bg-card)] rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-[var(--bg-card)] rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Not connected state ─────────────────────────────────────────
  if (!broker?.connected) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
          <div className="h-16 w-16 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center mb-4">
            <Landmark className="h-8 w-8 text-[#F59E0B]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            No Broker Connected
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6 text-center max-w-md">
            Connect your Angel One broker to view funds, positions, holdings,
            and order history in real-time.
          </p>
          <button
            onClick={() => router.push("/integrations")}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#3B82F6] text-white text-sm font-medium hover:bg-[#2563EB] transition-colors"
          >
            <Plug className="h-4 w-4" />
            Go to Integrations
          </button>
        </div>
      </div>
    );
  }

  // ── Connected view ──────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
            <Landmark className="h-5 w-5 text-[#F59E0B]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Broker Data
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[var(--text-muted)]">
                Angel One
              </span>
              {broker.clientCode && (
                <>
                  <span className="text-[var(--text-muted)]">&middot;</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {broker.clientCode}
                  </span>
                </>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#10B981]/10 text-[#10B981]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                Connected
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
          />
          Refresh
        </button>
      </div>

      {/* Funds Summary */}
      {funds && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Available Balance"
            value={formatINR(funds.availableBalance)}
            icon={Wallet}
            color="#10B981"
          />
          <MetricCard
            title="Used Margin"
            value={formatINR(funds.usedMargin)}
            icon={BarChart3}
            color="#F59E0B"
          />
          <MetricCard
            title="Total Balance"
            value={formatINR(funds.totalBalance)}
            icon={Landmark}
            color="#3B82F6"
          />
          <MetricCard
            title="Unrealized P&L"
            value={formatINR(funds.unrealizedPnl)}
            icon={funds.unrealizedPnl >= 0 ? TrendingUp : TrendingDown}
            color={funds.unrealizedPnl >= 0 ? "#10B981" : "#EF4444"}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-[var(--border-color)]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-xs font-semibold tracking-wide transition-colors border-b-2",
                  isActive
                    ? "border-[#3B82F6] text-[#3B82F6] bg-[#3B82F6]/5"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-4">
          {tabLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-[var(--bg-main)] rounded" />
              ))}
            </div>
          ) : (
            <>
              {activeTab === "positions" && (
                <PositionsTable data={positions} />
              )}
              {activeTab === "holdings" && <HoldingsTable data={holdings} />}
              {activeTab === "orders" && <OrdersTable data={orders} />}
              {activeTab === "trades" && <TradesTable data={trades} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Table Components ─────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-[var(--text-muted)]">No {label} found</p>
    </div>
  );
}

function SideBadge({ side }: { side: string }) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold",
        side === "BUY"
          ? "bg-[#10B981]/10 text-[#10B981]"
          : "bg-[#EF4444]/10 text-[#EF4444]"
      )}
    >
      {side}
    </span>
  );
}

function PnlValue({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "font-mono text-sm",
        value > 0 ? "text-[#10B981]" : value < 0 ? "text-[#EF4444]" : "text-[var(--text-muted)]"
      )}
    >
      {value > 0 ? "+" : ""}
      {formatINR(value)}
    </span>
  );
}

function PositionsTable({ data }: { data: Position[] }) {
  if (data.length === 0) return <EmptyState label="positions" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            <th className="pb-3 pr-4">Symbol</th>
            <th className="pb-3 pr-4">Side</th>
            <th className="pb-3 pr-4 text-right">Qty</th>
            <th className="pb-3 pr-4 text-right">Avg Price</th>
            <th className="pb-3 pr-4 text-right">LTP</th>
            <th className="pb-3 text-right">P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]">
          {data.map((p, i) => (
            <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
              <td className="py-3 pr-4">
                <span className="font-medium text-[var(--text-primary)]">
                  {p.symbol}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] ml-1.5">
                  {p.exchange}
                </span>
              </td>
              <td className="py-3 pr-4">
                <SideBadge side={p.side} />
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[var(--text-secondary)]">
                {p.quantity}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[var(--text-secondary)]">
                {formatINR(p.avgPrice)}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[var(--text-primary)]">
                {formatINR(p.ltp)}
              </td>
              <td className="py-3 text-right">
                <PnlValue value={p.pnl} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HoldingsTable({ data }: { data: Holding[] }) {
  if (data.length === 0) return <EmptyState label="holdings" />;
  const totalInvested = data.reduce((s, h) => s + h.investedValue, 0);
  const totalCurrent = data.reduce((s, h) => s + h.currentValue, 0);
  const totalPnl = totalCurrent - totalInvested;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            <th className="pb-3 pr-4">Symbol</th>
            <th className="pb-3 pr-4 text-right">Qty</th>
            <th className="pb-3 pr-4 text-right">Avg Price</th>
            <th className="pb-3 pr-4 text-right">LTP</th>
            <th className="pb-3 pr-4 text-right">Invested</th>
            <th className="pb-3 pr-4 text-right">Current</th>
            <th className="pb-3 text-right">P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]">
          {data.map((h, i) => (
            <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
              <td className="py-3 pr-4">
                <span className="font-medium text-[var(--text-primary)]">
                  {h.symbol}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] ml-1.5">
                  {h.exchange}
                </span>
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[var(--text-secondary)]">
                {h.quantity}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[var(--text-secondary)]">
                {formatINR(h.avgPrice)}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[var(--text-primary)]">
                {formatINR(h.ltp)}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[var(--text-secondary)]">
                {formatINR(h.investedValue)}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[var(--text-primary)]">
                {formatINR(h.currentValue)}
              </td>
              <td className="py-3 text-right">
                <PnlValue value={h.pnl} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-[var(--border-color)]">
            <td colSpan={4} className="py-3 pr-4 text-xs font-semibold text-[var(--text-secondary)]">
              Total
            </td>
            <td className="py-3 pr-4 text-right font-mono text-xs font-semibold text-[var(--text-secondary)]">
              {formatINR(totalInvested)}
            </td>
            <td className="py-3 pr-4 text-right font-mono text-xs font-semibold text-[var(--text-primary)]">
              {formatINR(totalCurrent)}
            </td>
            <td className="py-3 text-right">
              <PnlValue value={totalPnl} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function OrdersTable({ data }: { data: OrderBookEntry[] }) {
  if (data.length === 0) return <EmptyState label="orders" />;

  const statusColor: Record<string, string> = {
    OPEN: "text-[#3B82F6] bg-[#3B82F6]/10",
    COMPLETE: "text-[#10B981] bg-[#10B981]/10",
    CANCELLED: "text-[#6B7280] bg-[#6B7280]/10",
    REJECTED: "text-[#EF4444] bg-[#EF4444]/10",
    PENDING: "text-[#F59E0B] bg-[#F59E0B]/10",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            <th className="pb-3 pr-4">Symbol</th>
            <th className="pb-3 pr-4">Side</th>
            <th className="pb-3 pr-4">Type</th>
            <th className="pb-3 pr-4 text-right">Qty</th>
            <th className="pb-3 pr-4 text-right">Price</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]">
          {data.map((o, i) => (
            <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
              <td className="py-3 pr-4">
                <span className="font-medium text-[var(--text-primary)]">
                  {o.symbol}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] ml-1.5">
                  {o.exchange}
                </span>
              </td>
              <td className="py-3 pr-4">
                <SideBadge side={o.side} />
              </td>
              <td className="py-3 pr-4 text-xs text-[var(--text-secondary)]">
                {o.orderType}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[var(--text-secondary)]">
                {o.filledQuantity}/{o.quantity}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[var(--text-secondary)]">
                {o.avgPrice > 0 ? formatINR(o.avgPrice) : formatINR(o.price)}
              </td>
              <td className="py-3 pr-4">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold",
                    statusColor[o.status] || "text-[var(--text-muted)]"
                  )}
                >
                  {o.status}
                </span>
              </td>
              <td className="py-3 text-xs text-[var(--text-muted)]">
                {o.timestamp}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TradesTable({ data }: { data: TradeBookEntry[] }) {
  if (data.length === 0) return <EmptyState label="trades" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            <th className="pb-3 pr-4">Symbol</th>
            <th className="pb-3 pr-4">Side</th>
            <th className="pb-3 pr-4 text-right">Qty</th>
            <th className="pb-3 pr-4 text-right">Price</th>
            <th className="pb-3 pr-4">Order ID</th>
            <th className="pb-3">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]">
          {data.map((t, i) => (
            <tr key={i} className="hover:bg-[var(--bg-main)] transition-colors">
              <td className="py-3 pr-4">
                <span className="font-medium text-[var(--text-primary)]">
                  {t.symbol}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] ml-1.5">
                  {t.exchange}
                </span>
              </td>
              <td className="py-3 pr-4">
                <SideBadge side={t.side} />
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[var(--text-secondary)]">
                {t.quantity}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[var(--text-secondary)]">
                {formatINR(t.price)}
              </td>
              <td className="py-3 pr-4 text-xs text-[var(--text-muted)] font-mono">
                {t.orderId}
              </td>
              <td className="py-3 text-xs text-[var(--text-muted)]">
                {t.timestamp}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
