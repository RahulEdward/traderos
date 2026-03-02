"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Plus,
  Download,
  ArrowUpDown,
  BarChart3,
  Activity,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/shared/metric-card";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { formatINR, formatPercentage } from "@tradeos/shared";
import { format } from "date-fns";

interface LiveTrade {
  id: string;
  strategyId: string;
  entryDate: string;
  exitDate: string | null;
  symbol: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  grossPnl: number | null;
  netPnl: number | null;
  broker: string | null;
  notes: string | null;
  strategy: { id: string; name: string };
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3 shadow-lg">
      <p className="text-sm text-[var(--text-primary)] font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatINR(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function LiveTradingPage() {
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [formData, setFormData] = useState({
    strategyId: "",
    symbol: "",
    direction: "LONG",
    entryDate: "",
    entryPrice: "",
    exitDate: "",
    exitPrice: "",
    quantity: "",
    grossPnl: "",
    netPnl: "",
    broker: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [strategyFilter]);

  const fetchData = async () => {
    try {
      const params = strategyFilter !== "all" ? `?strategyId=${strategyFilter}` : "";
      const [tradesRes, stratRes] = await Promise.all([
        fetch(`/api/live-trades${params}`),
        fetch("/api/strategies"),
      ]);
      if (tradesRes.ok) {
        const data = await tradesRes.json();
        setTrades(data.trades || []);
        setSummary(data.summary);
      }
      if (stratRes.ok) {
        const data = await stratRes.json();
        setStrategies(Array.isArray(data) ? data : data.strategies || []);
      }
    } catch (error) {
      console.error("Error fetching live trades:", error);
    } finally {
      setLoading(false);
    }
  };

  const logTrade = async () => {
    if (!formData.strategyId || !formData.symbol || !formData.entryDate || !formData.entryPrice) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/live-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowLogDialog(false);
        setFormData({
          strategyId: "", symbol: "", direction: "LONG", entryDate: "",
          entryPrice: "", exitDate: "", exitPrice: "", quantity: "",
          grossPnl: "", netPnl: "", broker: "", notes: "",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error logging trade:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    const headers = ["Date", "Symbol", "Direction", "Entry", "Exit", "Qty", "Gross P&L", "Net P&L", "Broker", "Notes"];
    const rows = trades.map((t) => [
      t.entryDate ? format(new Date(t.entryDate), "yyyy-MM-dd") : "",
      t.symbol,
      t.direction,
      t.entryPrice,
      t.exitPrice || "",
      t.quantity,
      t.grossPnl || "",
      t.netPnl || "",
      t.broker || "",
      t.notes || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-trades-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build equity curve from trades
  const equityCurve = trades
    .slice()
    .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime())
    .reduce<{ date: string; cumPnl: number }[]>((acc, trade) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].cumPnl : 0;
      acc.push({
        date: format(new Date(trade.entryDate), "dd MMM"),
        cumPnl: prev + (trade.netPnl || 0),
      });
      return acc;
    }, []);

  // Monthly P&L for heatmap-style bar chart
  const monthlyPnl = trades.reduce<Record<string, number>>((acc, t) => {
    const month = format(new Date(t.entryDate), "MMM yyyy");
    acc[month] = (acc[month] || 0) + (t.netPnl || 0);
    return acc;
  }, {});
  const monthlyData = Object.entries(monthlyPnl).map(([month, pnl]) => ({ month, pnl }));

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">Live Trading</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[120px]" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Live Trading</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Track real money performance across strategies
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={strategyFilter} onValueChange={setStrategyFilter}>
            <SelectTrigger className="w-[200px] bg-[var(--bg-main)] border-[var(--border-color)]">
              <SelectValue placeholder="All Strategies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Strategies</SelectItem>
              {strategies.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
                <Plus className="h-4 w-4 mr-2" />
                Log Trade
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[var(--bg-card)] border-[var(--border-color)] max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-[var(--text-primary)]">Log Live Trade</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Strategy *</label>
                    <Select value={formData.strategyId} onValueChange={(v) => setFormData({ ...formData, strategyId: v })}>
                      <SelectTrigger className="bg-[var(--bg-main)] border-[var(--border-color)]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {strategies.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Symbol *</label>
                    <Input
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      placeholder="NIFTY 50"
                      className="bg-[var(--bg-main)] border-[var(--border-color)]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Direction</label>
                    <Select value={formData.direction} onValueChange={(v) => setFormData({ ...formData, direction: v })}>
                      <SelectTrigger className="bg-[var(--bg-main)] border-[var(--border-color)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LONG">Long</SelectItem>
                        <SelectItem value="SHORT">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Entry Date *</label>
                    <Input
                      type="date"
                      value={formData.entryDate}
                      onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                      className="bg-[var(--bg-main)] border-[var(--border-color)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Exit Date</label>
                    <Input
                      type="date"
                      value={formData.exitDate}
                      onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                      className="bg-[var(--bg-main)] border-[var(--border-color)]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Entry Price *</label>
                    <Input
                      type="number"
                      value={formData.entryPrice}
                      onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                      placeholder="22450.50"
                      className="bg-[var(--bg-main)] border-[var(--border-color)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Exit Price</label>
                    <Input
                      type="number"
                      value={formData.exitPrice}
                      onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                      placeholder="22520.30"
                      className="bg-[var(--bg-main)] border-[var(--border-color)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Quantity</label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="50"
                      className="bg-[var(--bg-main)] border-[var(--border-color)]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Gross P&L</label>
                    <Input
                      type="number"
                      value={formData.grossPnl}
                      onChange={(e) => setFormData({ ...formData, grossPnl: e.target.value })}
                      className="bg-[var(--bg-main)] border-[var(--border-color)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Net P&L</label>
                    <Input
                      type="number"
                      value={formData.netPnl}
                      onChange={(e) => setFormData({ ...formData, netPnl: e.target.value })}
                      className="bg-[var(--bg-main)] border-[var(--border-color)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)] mb-1 block">Broker</label>
                    <Input
                      value={formData.broker}
                      onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                      placeholder="Zerodha"
                      className="bg-[var(--bg-main)] border-[var(--border-color)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Trade notes..."
                    className="bg-[var(--bg-main)] border-[var(--border-color)]"
                    rows={2}
                  />
                </div>
                <Button
                  className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
                  onClick={logTrade}
                  disabled={submitting || !formData.strategyId || !formData.symbol || !formData.entryDate || !formData.entryPrice}
                >
                  {submitting ? "Logging..." : "Log Trade"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title={<span className="flex items-center gap-1">Total P&L <InfoTooltip text="Total realized profit and loss from all live trades" /></span>}
            value={formatINR(summary.totalPnl)}
            icon={DollarSign}
            color={summary.totalPnl >= 0 ? "#10B981" : "#EF4444"}
          />
          <MetricCard
            title={<span className="flex items-center gap-1">Total Trades <InfoTooltip text="Number of trades executed in live trading mode" /></span>}
            value={summary.totalTrades}
            icon={Activity}
            color="#3B82F6"
          />
          <MetricCard
            title={<span className="flex items-center gap-1">Win Rate <InfoTooltip text="Percentage of live trades that were profitable" /></span>}
            value={summary.totalTrades > 0
              ? formatPercentage((summary.winningTrades / summary.totalTrades) * 100)
              : "—"}
            icon={Target}
            color="#10B981"
          />
          <MetricCard
            title={<span className="flex items-center gap-1">Avg Slippage <InfoTooltip text="Average difference between expected and actual fill price. Lower is better" /></span>}
            value={formatINR(summary.avgSlippage)}
            icon={ArrowUpDown}
            color="#F59E0B"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Live Equity Curve */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--color-primary)]" />
            Live Equity Curve
          </h2>
          {equityCurve.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="cumPnl" name="Cumulative P&L" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-10">No live trades yet</p>
          )}
        </div>

        {/* Monthly P&L */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#F59E0B]" />
            Monthly P&L
          </h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? "#10B981" : "#EF4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-10">No monthly data</p>
          )}
        </div>
      </div>

      {/* Slippage Analysis */}
      {summary && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Slippage Analysis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1 flex items-center gap-1">Average Slippage <InfoTooltip text="Mean slippage per trade in basis points" /></p>
              <p className="text-xl font-mono text-[#F59E0B]">{formatINR(summary.avgSlippage)}</p>
            </div>
            <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1 flex items-center gap-1">Worst Slippage <InfoTooltip text="Largest slippage experienced on a single trade" /></p>
              <p className="text-xl font-mono text-[#EF4444]">{formatINR(summary.worstSlippage)}</p>
            </div>
            <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-1 flex items-center gap-1">Total Slippage Impact <InfoTooltip text="Cumulative cost of slippage across all trades" /></p>
              <p className="text-xl font-mono text-[#EF4444]">
                {formatINR(summary.avgSlippage * summary.totalTrades)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trade Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Live Trades</h2>
        {trades.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">No live trades logged yet. Click &ldquo;Log Trade&rdquo; to record your first trade.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs">
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-left py-3 px-2">Symbol</th>
                  <th className="text-left py-3 px-2">Direction</th>
                  <th className="text-right py-3 px-2">Entry</th>
                  <th className="text-right py-3 px-2">Exit</th>
                  <th className="text-right py-3 px-2">Qty</th>
                  <th className="text-right py-3 px-2">Gross P&L</th>
                  <th className="text-right py-3 px-2">Net P&L</th>
                  <th className="text-left py-3 px-2">Broker</th>
                  <th className="text-left py-3 px-2">Strategy</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-sidebar)] transition-colors">
                    <td className="py-3 px-2 text-[var(--text-secondary)] font-mono text-xs">
                      {format(new Date(trade.entryDate), "dd MMM yyyy")}
                    </td>
                    <td className="py-3 px-2 text-[var(--text-primary)] font-medium">{trade.symbol}</td>
                    <td className="py-3 px-2">
                      <Badge className={trade.direction === "LONG"
                        ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]"
                        : "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]"
                      }>
                        {trade.direction}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-[var(--text-secondary)]">
                      {formatINR(trade.entryPrice)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-[var(--text-secondary)]">
                      {trade.exitPrice ? formatINR(trade.exitPrice) : "—"}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-[var(--text-secondary)]">{trade.quantity}</td>
                    <td className={`py-3 px-2 text-right font-mono ${(trade.grossPnl || 0) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                      {trade.grossPnl != null ? formatINR(trade.grossPnl) : "—"}
                    </td>
                    <td className={`py-3 px-2 text-right font-mono ${(trade.netPnl || 0) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                      {trade.netPnl != null ? formatINR(trade.netPnl) : "—"}
                    </td>
                    <td className="py-3 px-2 text-[var(--text-secondary)] text-xs">{trade.broker || "—"}</td>
                    <td className="py-3 px-2">
                      <Badge variant="secondary" className="text-xs">{trade.strategy?.name}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
