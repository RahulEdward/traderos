"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Database,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Play,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileDown,
  Clock,
  BarChart2,
  Layers,
  Info,
  Search,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────

interface WatchlistItem {
  id: string;
  symbol: string;
  exchange: string;
  instrumentType?: string;
  candleCount: number;
  firstDate: string | null;
  lastDate: string | null;
}

interface DownloadJob {
  id: string;
  status: string;
  totalSymbols: number;
  completedSymbols: number;
  failedSymbols: number;
  interval: string;
  fromDate: string;
  toDate: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage?: string;
  items: Array<{
    id: string;
    symbol: string;
    exchange: string;
    status: string;
    rowCount: number;
    error?: string;
  }>;
}

interface CatalogEntry {
  symbol: string;
  exchange: string;
  totalCandles: number;
  intervals: Array<{
    interval: string;
    count: number;
    firstDate: string;
    lastDate: string;
  }>;
}

const INTERVALS = [
  { value: "DAILY", label: "Daily (1D)" },
  { value: "60MIN", label: "60 Minute" },
  { value: "30MIN", label: "30 Minute" },
  { value: "15MIN", label: "15 Minute" },
  { value: "5MIN", label: "5 Minute" },
  { value: "1MIN", label: "1 Minute" },
];

const EXCHANGES = ["NSE", "BSE", "NFO", "BFO", "MCX", "CDS"];

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; icon: any; label: string }
> = {
  PENDING: {
    color: "#94A3B8",
    bg: "#94A3B820",
    icon: Clock,
    label: "Pending",
  },
  RUNNING: {
    color: "#3B82F6",
    bg: "#3B82F620",
    icon: Loader2,
    label: "Running",
  },
  COMPLETED: {
    color: "#10B981",
    bg: "#10B98120",
    icon: CheckCircle2,
    label: "Done",
  },
  FAILED: {
    color: "#EF4444",
    bg: "#EF444420",
    icon: AlertTriangle,
    label: "Failed",
  },
};

// ─── Main Page ────────────────────────────────────────────────────────────

export default function HistorifyPage() {
  const [activeTab, setActiveTab] = useState<"watchlist" | "download" | "catalog">("watchlist");

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [addSymbol, setAddSymbol] = useState("");
  const [addExchange, setAddExchange] = useState("NSE");
  const [addLoading, setAddLoading] = useState(false);
  const [bulkCsv, setBulkCsv] = useState("");
  const [showBulk, setShowBulk] = useState(false);

  // Download state
  const [dlFromDate, setDlFromDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dlToDate, setDlToDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [dlInterval, setDlInterval] = useState("DAILY");
  const [dlSelectedSymbols, setDlSelectedSymbols] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<DownloadJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Catalog state
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Data fetching ──────────────────────────────────────────────────

  const fetchWatchlist = useCallback(async () => {
    setWatchlistLoading(true);
    try {
      const res = await fetch("/api/historify/watchlist");
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.watchlist || []);
      }
    } catch {}
    finally { setWatchlistLoading(false); }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/historify/jobs?limit=10");
      if (res.ok) {
        const data = await res.json();
        setActiveJobs(data.jobs || []);
      }
    } catch {}
    finally { setJobsLoading(false); }
  }, []);

  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch("/api/historify/candles");
      if (res.ok) {
        const data = await res.json();
        setCatalog(data.catalog || []);
      }
    } catch {}
    finally { setCatalogLoading(false); }
  }, []);

  useEffect(() => {
    fetchWatchlist();
    fetchJobs();
  }, [fetchWatchlist, fetchJobs]);

  useEffect(() => {
    if (activeTab === "catalog") fetchCatalog();
  }, [activeTab, fetchCatalog]);

  // Poll for job updates when there are running jobs
  useEffect(() => {
    const hasRunning = activeJobs.some(
      (j) => j.status === "RUNNING" || j.status === "PENDING"
    );
    if (hasRunning) {
      pollingRef.current = setInterval(fetchJobs, 2000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeJobs, fetchJobs]);

  // ── Watchlist actions ──────────────────────────────────────────────

  const addToWatchlist = async () => {
    if (!addSymbol.trim()) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/historify/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: [{ symbol: addSymbol.trim(), exchange: addExchange }],
        }),
      });
      if (res.ok) {
        setAddSymbol("");
        fetchWatchlist();
      }
    } catch {} finally { setAddLoading(false); }
  };

  const addBulkSymbols = async () => {
    if (!bulkCsv.trim()) return;
    setAddLoading(true);
    try {
      const lines = bulkCsv.split("\n").filter((l) => l.trim());
      const symbols = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return { symbol: parts[0], exchange: parts[1] || "NSE" };
      }).filter((s) => s.symbol);

      const res = await fetch("/api/historify/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });
      if (res.ok) {
        setBulkCsv("");
        setShowBulk(false);
        fetchWatchlist();
      }
    } catch {} finally { setAddLoading(false); }
  };

  const removeFromWatchlist = async (symbol: string, exchange: string) => {
    try {
      await fetch(
        `/api/historify/watchlist?symbol=${symbol}&exchange=${exchange}`,
        { method: "DELETE" }
      );
      fetchWatchlist();
    } catch {}
  };

  // ── Download actions ──────────────────────────────────────────────

  const startDownload = async (
    specificSymbols?: Array<{ symbol: string; exchange: string }>
  ) => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/historify/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: specificSymbols,
          interval: dlInterval,
          fromDate: dlFromDate,
          toDate: dlToDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDownloadError(data.error || "Download failed");
      } else {
        fetchJobs();
        setActiveTab("download");
      }
    } catch (e) {
      setDownloadError("Network error");
    } finally {
      setDownloading(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      await fetch(`/api/historify/jobs/${jobId}`, { method: "DELETE" });
      fetchJobs();
    } catch {}
  };

  const exportCSV = (symbol: string, exchange: string, interval: string) => {
    const url = `/api/historify/candles?symbol=${symbol}&exchange=${exchange}&interval=${interval}&format=csv`;
    window.open(url, "_blank");
  };

  // ── Filtered catalog ──────────────────────────────────────────────
  const filteredCatalog = catalog.filter(
    (c) =>
      c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.exchange.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center">
              <Database className="h-5 w-5 text-[#06B6D4]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Historify
            </h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)] ml-12">
            Historical OHLCV data manager — download, store and export candle
            data from Angel One
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchWatchlist();
              fetchJobs();
            }}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => startDownload()}
            disabled={downloading || watchlist.length === 0}
            className="gap-1.5 bg-[#06B6D4] hover:bg-[#0891B2] text-white text-xs"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Download All Watchlist
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] gap-0">
        {(["watchlist", "download", "catalog"] as const).map((tab) => {
          const labels: Record<string, string> = {
            watchlist: `Watchlist (${watchlist.length})`,
            download: `Download Jobs (${activeJobs.filter((j) => j.status === "RUNNING" || j.status === "PENDING").length} active)`,
            catalog: `Data Catalog`,
          };
          const icons: Record<string, any> = {
            watchlist: Layers,
            download: Download,
            catalog: BarChart2,
          };
          const Icon = icons[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-[#06B6D4] text-[#06B6D4]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Watchlist ────────────────────────────────────────── */}
      {activeTab === "watchlist" && (
        <div className="space-y-4">
          {/* Add symbol form */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)] p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#06B6D4]" />
              Add Symbol
            </h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-[var(--text-muted)] mb-1 block">
                  Symbol
                </label>
                <Input
                  value={addSymbol}
                  onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. RELIANCE, NIFTY50"
                  className="bg-[var(--bg-main)] border-[var(--border-color)] text-sm h-9"
                  onKeyDown={(e) => e.key === "Enter" && addToWatchlist()}
                />
              </div>
              <div className="w-32">
                <label className="text-xs text-[var(--text-muted)] mb-1 block">
                  Exchange
                </label>
                <Select value={addExchange} onValueChange={setAddExchange}>
                  <SelectTrigger className="bg-[var(--bg-main)] border-[var(--border-color)] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXCHANGES.map((ex) => (
                      <SelectItem key={ex} value={ex}>
                        {ex}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={addToWatchlist}
                disabled={addLoading || !addSymbol.trim()}
                className="bg-[#06B6D4] hover:bg-[#0891B2] text-white h-9"
                size="sm"
              >
                {addLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulk(!showBulk)}
                className="h-9 gap-1.5 text-xs"
              >
                <Upload className="h-3.5 w-3.5" />
                Bulk Add
              </Button>
            </div>

            {/* Bulk CSV input */}
            {showBulk && (
              <div className="mt-3 space-y-2">
                <label className="text-xs text-[var(--text-muted)]">
                  Paste CSV (one per line): SYMBOL,EXCHANGE
                </label>
                <textarea
                  value={bulkCsv}
                  onChange={(e) => setBulkCsv(e.target.value)}
                  placeholder={"RELIANCE,NSE\nINFY,NSE\nBANKNIFTY,NFO"}
                  className="w-full h-28 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-3 text-xs text-[var(--text-primary)] font-mono resize-none focus:outline-none focus:border-[#06B6D4]"
                />
                <Button
                  size="sm"
                  onClick={addBulkSymbols}
                  disabled={addLoading || !bulkCsv.trim()}
                  className="bg-[#06B6D4] hover:bg-[#0891B2] text-white text-xs"
                >
                  {addLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  Add All Symbols
                </Button>
              </div>
            )}
          </Card>

          {/* Download config */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)] p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Download className="h-4 w-4 text-[#3B82F6]" />
              Download Configuration
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">
                  From Date
                </label>
                <Input
                  type="date"
                  value={dlFromDate}
                  onChange={(e) => setDlFromDate(e.target.value)}
                  className="bg-[var(--bg-main)] border-[var(--border-color)] h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">
                  To Date
                </label>
                <Input
                  type="date"
                  value={dlToDate}
                  onChange={(e) => setDlToDate(e.target.value)}
                  className="bg-[var(--bg-main)] border-[var(--border-color)] h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">
                  Interval
                </label>
                <Select value={dlInterval} onValueChange={setDlInterval}>
                  <SelectTrigger className="bg-[var(--bg-main)] border-[var(--border-color)] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVALS.map((iv) => (
                      <SelectItem key={iv.value} value={iv.value}>
                        {iv.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {downloadError && (
              <div className="mt-3 flex items-center gap-2 text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg p-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {downloadError}
              </div>
            )}
          </Card>

          {/* Watchlist table */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Watchlist ({watchlist.length} symbols)
              </h3>
              {watchlist.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => startDownload()}
                  disabled={downloading}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs gap-1.5"
                >
                  {downloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Download All ({watchlist.length})
                </Button>
              )}
            </div>
            {watchlistLoading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-6 w-6 text-[#06B6D4] animate-spin" />
              </div>
            ) : watchlist.length === 0 ? (
              <div className="p-8 text-center">
                <Database className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
                <p className="text-sm text-[var(--text-secondary)]">
                  No symbols in watchlist
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Add symbols above to start downloading historical data
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-color)]">
                      {[
                        "Symbol",
                        "Exchange",
                        "Candles Stored",
                        "Date Range",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {watchlist.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-[var(--border-color)] hover:bg-[var(--bg-main)]/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-[var(--text-primary)]">
                          {item.symbol}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] border-[var(--border-color)] text-[var(--text-secondary)]"
                          >
                            {item.exchange}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">
                          {item.candleCount > 0 ? (
                            <span className="text-[#10B981]">
                              {item.candleCount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {item.firstDate && item.lastDate ? (
                            <span>
                              {new Date(item.firstDate).toLocaleDateString(
                                "en-IN",
                                { day: "numeric", month: "short", year: "2-digit" }
                              )}{" "}
                              →{" "}
                              {new Date(item.lastDate).toLocaleDateString(
                                "en-IN",
                                { day: "numeric", month: "short", year: "2-digit" }
                              )}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">
                              No data
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                startDownload([
                                  {
                                    symbol: item.symbol,
                                    exchange: item.exchange,
                                  },
                                ])
                              }
                              disabled={downloading}
                              className="h-7 px-2 text-[#3B82F6] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 text-xs gap-1"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removeFromWatchlist(item.symbol, item.exchange)
                              }
                              className="h-7 px-2 text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Tab: Download Jobs ────────────────────────────────────── */}
      {activeTab === "download" && (
        <div className="space-y-4">
          {/* Quick launch */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)] p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Start New Download
            </h3>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">
                  From Date
                </label>
                <Input
                  type="date"
                  value={dlFromDate}
                  onChange={(e) => setDlFromDate(e.target.value)}
                  className="bg-[var(--bg-main)] border-[var(--border-color)] h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">
                  To Date
                </label>
                <Input
                  type="date"
                  value={dlToDate}
                  onChange={(e) => setDlToDate(e.target.value)}
                  className="bg-[var(--bg-main)] border-[var(--border-color)] h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">
                  Interval
                </label>
                <Select value={dlInterval} onValueChange={setDlInterval}>
                  <SelectTrigger className="bg-[var(--bg-main)] border-[var(--border-color)] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVALS.map((iv) => (
                      <SelectItem key={iv.value} value={iv.value}>
                        {iv.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => startDownload()}
                  disabled={downloading || watchlist.length === 0}
                  className="w-full bg-[#06B6D4] hover:bg-[#0891B2] text-white h-9 gap-2 text-sm"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {downloading ? "Starting..." : `Download All (${watchlist.length})`}
                </Button>
              </div>
            </div>
            {downloadError && (
              <div className="flex items-center gap-2 text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg p-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {downloadError}
              </div>
            )}
            {watchlist.length === 0 && (
              <p className="text-xs text-[#F59E0B] mt-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Add symbols to Watchlist first
              </p>
            )}
          </Card>

          {/* Jobs list */}
          <Card className="bg-[var(--bg-card)] border-[var(--border-color)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Download History
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchJobs}
                className="h-7 text-xs gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            </div>
            {jobsLoading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-6 w-6 text-[#06B6D4] animate-spin" />
              </div>
            ) : activeJobs.length === 0 ? (
              <div className="p-8 text-center">
                <Download className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
                <p className="text-sm text-[var(--text-secondary)]">
                  No download jobs yet
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Configure a date range above and click Download
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {activeJobs.map((job) => (
                  <JobCard key={job.id} job={job} onDelete={deleteJob} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Tab: Data Catalog ─────────────────────────────────────── */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol..."
                className="pl-9 bg-[var(--bg-card)] border-[var(--border-color)] h-9 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCatalog}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {catalogLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 text-[#06B6D4] animate-spin" />
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart2 className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
              <p className="text-sm text-[var(--text-secondary)]">
                {catalog.length === 0
                  ? "No historical data downloaded yet"
                  : "No symbols match your search"}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Download data from the Download tab to see it here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCatalog.map((entry) => (
                <CatalogCard
                  key={`${entry.symbol}-${entry.exchange}`}
                  entry={entry}
                  onExport={exportCSV}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────

function JobCard({
  job,
  onDelete,
}: {
  job: DownloadJob;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = cfg.icon;
  const processed = job.completedSymbols + job.failedSymbols;
  const pct =
    job.totalSymbols > 0
      ? Math.round((processed / job.totalSymbols) * 100)
      : 0;
  const isActive = job.status === "RUNNING" || job.status === "PENDING";

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Status icon */}
          <div
            className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: cfg.bg }}
          >
            <StatusIcon
              className={`h-4 w-4 ${isActive ? "animate-spin" : ""}`}
              style={{ color: cfg.color }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono">
                {job.interval}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {new Date(job.fromDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "2-digit",
                })}{" "}
                →{" "}
                {new Date(job.toDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "2-digit",
                })}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {new Date(job.createdAt).toLocaleString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
                <span>
                  {processed}/{job.totalSymbols} symbols
                  {job.failedSymbols > 0 && (
                    <span className="text-[#EF4444] ml-2">
                      ({job.failedSymbols} failed)
                    </span>
                  )}
                </span>
                <span className="font-mono">{pct}%</span>
              </div>
              <div className="h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor:
                      job.failedSymbols > 0 &&
                      job.failedSymbols === job.totalSymbols
                        ? "#EF4444"
                        : "#10B981",
                  }}
                />
              </div>
            </div>

            {job.errorMessage && (
              <p className="text-xs text-[#EF4444]">{job.errorMessage}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#3B82F6] hover:underline"
          >
            {expanded ? "Hide" : "Details"}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(job.id)}
            className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-[#EF4444]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded items */}
      {expanded && job.items.length > 0 && (
        <div className="mt-3 ml-10 grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {job.items.map((item) => {
            const itemCfg =
              STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
            const ItemIcon = itemCfg.icon;
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                style={{ background: itemCfg.bg }}
              >
                <ItemIcon
                  className={`h-3 w-3 shrink-0 ${item.status === "RUNNING" ? "animate-spin" : ""}`}
                  style={{ color: itemCfg.color }}
                />
                <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                  {item.symbol}
                </span>
                <span
                  className="text-xs ml-auto font-mono"
                  style={{ color: itemCfg.color }}
                >
                  {item.status === "COMPLETED"
                    ? `${item.rowCount.toLocaleString()} rows`
                    : item.status === "FAILED"
                      ? "failed"
                      : item.status.toLowerCase()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Catalog Card ─────────────────────────────────────────────────────────

function CatalogCard({
  entry,
  onExport,
}: {
  entry: CatalogEntry;
  onExport: (symbol: string, exchange: string, interval: string) => void;
}) {
  return (
    <Card className="bg-[var(--bg-card)] border-[var(--border-color)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono font-bold text-[var(--text-primary)]">
              {entry.symbol}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] border-[var(--border-color)] text-[var(--text-secondary)]"
            >
              {entry.exchange}
            </Badge>
            <span className="text-xs text-[var(--text-secondary)]">
              {entry.totalCandles.toLocaleString()} total candles
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {entry.intervals.map((iv) => (
              <div
                key={iv.interval}
                className="flex items-center gap-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-3 py-1.5"
              >
                <span className="text-xs font-mono font-semibold text-[#06B6D4]">
                  {iv.interval}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {iv.count.toLocaleString()} bars
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(iv.firstDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}{" "}
                  →{" "}
                  {new Date(iv.lastDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                </span>
                <button
                  onClick={() =>
                    onExport(entry.symbol, entry.exchange, iv.interval)
                  }
                  className="ml-1 text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
                  title="Export as CSV"
                >
                  <FileDown className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
