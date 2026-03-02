"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Check, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR, formatPercentage } from "@tradeos/shared";

interface CsvImportWizardProps {
  open: boolean;
  onClose: () => void;
  strategyId: string;
  onImported: () => void;
}

const REQUIRED_FIELDS = [
  "entryDate",
  "exitDate",
  "direction",
  "entryPrice",
  "exitPrice",
  "profitLoss",
  "symbol",
] as const;

const FIELD_LABELS: Record<string, string> = {
  entryDate: "Entry Date",
  exitDate: "Exit Date",
  direction: "Direction (Long/Short)",
  entryPrice: "Entry Price",
  exitPrice: "Exit Price",
  profitLoss: "Profit/Loss",
  profitLossPct: "P&L %",
  symbol: "Symbol",
};

export function CsvImportWizard({
  open,
  onClose,
  strategyId,
  onImported,
}: CsvImportWizardProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [sourcePlatform, setSourcePlatform] = useState("CUSTOM");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setFile(f);

    Papa.parse(f, {
      complete: (result) => {
        const data = result.data as string[][];
        if (data.length > 1) {
          setCsvHeaders(data[0]);
          setCsvData(data.slice(1).filter((row) => row.some((cell) => cell.trim())));
          autoMapColumns(data[0]);
        }
      },
      error: () => setError("Failed to parse CSV file"),
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  const autoMapColumns = (headers: string[]) => {
    const mapping: Record<string, string> = {};
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

    // Auto-detect common patterns
    const patterns: Record<string, string[]> = {
      entryDate: ["entry date", "entry_date", "entrydate", "open date", "date"],
      exitDate: ["exit date", "exit_date", "exitdate", "close date"],
      direction: ["direction", "type", "side", "trade type"],
      entryPrice: ["entry price", "entry_price", "entryprice", "open price", "entry"],
      exitPrice: ["exit price", "exit_price", "exitprice", "close price", "exit"],
      profitLoss: ["profit", "pnl", "p&l", "profit/loss", "net profit", "profit_loss"],
      profitLossPct: ["profit%", "pnl%", "return%", "profit_pct"],
      symbol: ["symbol", "ticker", "instrument", "stock"],
    };

    for (const [field, keywords] of Object.entries(patterns)) {
      const idx = lowerHeaders.findIndex((h) =>
        keywords.some((k) => h.includes(k))
      );
      if (idx >= 0) {
        mapping[field] = headers[idx];
      }
    }

    setColumnMapping(mapping);

    // Auto-detect platform
    if (lowerHeaders.some((h) => h.includes("tradingview"))) {
      setSourcePlatform("TRADINGVIEW");
    } else if (lowerHeaders.some((h) => h.includes("amibroker") || h.includes("afl"))) {
      setSourcePlatform("AMIBROKER");
    }
  };

  const parseTrades = () => {
    return csvData.map((row, idx) => {
      const getValue = (field: string) => {
        const col = columnMapping[field];
        if (!col) return "";
        const colIdx = csvHeaders.indexOf(col);
        return colIdx >= 0 ? row[colIdx]?.trim() || "" : "";
      };

      const pnl = parseFloat(getValue("profitLoss")) || 0;
      const entryPrice = parseFloat(getValue("entryPrice")) || 0;
      const exitPrice = parseFloat(getValue("exitPrice")) || 0;
      const pnlPct =
        parseFloat(getValue("profitLossPct")) ||
        (entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0);

      const entryDate = getValue("entryDate");
      const exitDate = getValue("exitDate");
      const holdingPeriod =
        entryDate && exitDate
          ? Math.max(
              1,
              Math.ceil(
                (new Date(exitDate).getTime() - new Date(entryDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : 0;

      const dirValue = getValue("direction").toUpperCase();
      const direction =
        dirValue.startsWith("S") || dirValue === "SHORT" ? "SHORT" : "LONG";

      return {
        tradeNumber: idx + 1,
        entryDate: entryDate || new Date().toISOString(),
        exitDate: exitDate || null,
        direction,
        entryPrice,
        exitPrice: exitPrice || null,
        profitLoss: pnl,
        profitLossPct: Math.round(pnlPct * 100) / 100,
        holdingPeriod,
        symbol: getValue("symbol") || "UNKNOWN",
      };
    });
  };

  const calculateQuickMetrics = (trades: any[]) => {
    const total = trades.length;
    const winners = trades.filter((t) => t.profitLoss > 0);
    const winRate = total > 0 ? (winners.length / total) * 100 : 0;
    const netProfit = trades.reduce((sum: number, t: any) => sum + t.profitLoss, 0);
    const grossProfit = winners.reduce((sum: number, t: any) => sum + t.profitLoss, 0);
    const grossLoss = Math.abs(
      trades.filter((t) => t.profitLoss <= 0).reduce((sum: number, t: any) => sum + t.profitLoss, 0)
    );
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

    // Max Drawdown
    let peak = 0, equity = 0, maxDD = 0, maxDDPct = 0;
    for (const t of trades) {
      equity += t.profitLoss;
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      if (dd > maxDD) { maxDD = dd; maxDDPct = peak > 0 ? (dd / peak) * 100 : 0; }
    }

    const avgWin = winners.length > 0 ? grossProfit / winners.length : 0;
    const losers = trades.filter((t) => t.profitLoss <= 0);
    const avgLoss = losers.length > 0 ? losers.reduce((s: number, t: any) => s + t.profitLoss, 0) / losers.length : 0;

    return {
      totalTrades: total, winRate: Math.round(winRate * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      maxDrawdown: Math.round(maxDD * 100) / 100,
      maxDrawdownPct: Math.round(maxDDPct * 100) / 100,
      sharpeRatio: 0, sortinoRatio: 0, calmarRatio: 0,
      expectancy: Math.round((winRate / 100 * avgWin + (1 - winRate / 100) * avgLoss) * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      bestTrade: Math.round(Math.max(...trades.map((t: any) => t.profitLoss)) * 100) / 100,
      worstTrade: Math.round(Math.min(...trades.map((t: any) => t.profitLoss)) * 100) / 100,
      recoveryFactor: maxDD > 0 ? Math.round((netProfit / maxDD) * 100) / 100 : 0,
    };
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setError("");
    try {
      const trades = parseTrades();
      const metrics = calculateQuickMetrics(trades);

      const res = await fetch(`/api/strategies/${strategyId}/backtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades, sourcePlatform, notes, metrics }),
      });

      if (!res.ok) throw new Error("Import failed");

      const result = await res.json();
      setImportResult({ ...result, metrics });
      setStep(5);
    } catch (err) {
      setError("Failed to import backtest. Please check your data.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMapping({});
    setNotes("");
    setImportResult(null);
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Backtest Data</DialogTitle>
        </DialogHeader>

        <Progress value={(step / 5) * 100} className="h-1 mb-4" />

        {error && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg p-3 text-sm text-[#EF4444]">
            {error}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-[#3B82F6] bg-[#3B82F6]/5"
                  : "border-[var(--border-color)] hover:border-[#3B82F6]/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-primary)]">
                Drag & drop your CSV file here
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                or click to browse files
              </p>
            </div>

            {file && (
              <div className="flex items-center gap-3 p-3 bg-[var(--bg-main)] rounded-lg">
                <FileText className="h-5 w-5 text-[#3B82F6]" />
                <div>
                  <p className="text-sm text-[var(--text-primary)]">{file.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {(file.size / 1024).toFixed(1)} KB &middot;{" "}
                    {csvData.length} rows detected
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!file || csvData.length === 0}
                className="bg-[#3B82F6] hover:bg-[#2563EB]"
              >
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Map your CSV columns to the required fields
            </p>

            <div className="space-y-3">
              {REQUIRED_FIELDS.map((field) => (
                <div key={field} className="flex items-center gap-3">
                  <Label className="w-[140px] shrink-0 text-right text-xs">
                    {FIELD_LABELS[field]}
                  </Label>
                  <Select
                    value={columnMapping[field] || ""}
                    onValueChange={(v) =>
                      setColumnMapping((prev) => ({ ...prev, [field]: v }))
                    }
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="overflow-x-auto">
              <p className="text-xs text-[var(--text-muted)] mb-2">Preview (first 3 rows)</p>
              <table className="text-xs w-full">
                <thead>
                  <tr className="bg-[var(--bg-sidebar)]">
                    {csvHeaders.slice(0, 8).map((h) => (
                      <th key={h} className="px-2 py-1 text-left text-[var(--text-secondary)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-t border-[var(--border-color)]">
                      {row.slice(0, 8).map((cell, j) => (
                        <td key={j} className="px-2 py-1 text-[var(--text-primary)]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-[#3B82F6] hover:bg-[#2563EB]"
              >
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-main)] rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Trades detected</span>
                <span className="text-sm font-mono text-[var(--text-primary)]">
                  {csvData.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">File</span>
                <span className="text-sm text-[var(--text-primary)]">{file?.name}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Source Platform</Label>
                <Select value={sourcePlatform} onValueChange={setSourcePlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRADINGVIEW">TradingView</SelectItem>
                    <SelectItem value="AMIBROKER">Amibroker</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Version Notes (optional)</Label>
                <Input
                  placeholder="e.g. Initial backtest with default parameters"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => {
                  setStep(4);
                  handleImport();
                }}
                className="bg-[#3B82F6] hover:bg-[#2563EB]"
              >
                Import Backtest <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Processing */}
        {step === 4 && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 text-[#3B82F6] animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-primary)] font-medium">
              Calculating metrics...
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Processing {csvData.length} trades
            </p>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 5 && importResult && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-[#10B981]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-[#10B981]" />
              </div>
              <p className="text-lg font-medium text-[var(--text-primary)]">
                Import Successful!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Trades", value: importResult.metrics.totalTrades },
                { label: "Win Rate", value: formatPercentage(importResult.metrics.winRate) },
                { label: "Profit Factor", value: importResult.metrics.profitFactor.toFixed(2) },
                { label: "Net Profit", value: formatINR(importResult.metrics.netProfit) },
              ].map((m) => (
                <div key={m.label} className="bg-[var(--bg-main)] rounded-lg p-3">
                  <p className="text-xs text-[var(--text-muted)]">{m.label}</p>
                  <p className="text-lg font-mono font-medium text-[var(--text-primary)]">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  handleClose();
                  onImported();
                }}
                className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB]"
              >
                View Full Results
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setCsvData([]);
                  setImportResult(null);
                }}
              >
                Import Another
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
