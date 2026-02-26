"use client";

import { cn } from "@/lib/utils";
import { formatINR } from "@tradeos/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MonthlyData {
  month: string;
  year: number;
  pnl: number;
  tradeCount: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getHeatColor(pnl: number, maxAbsPnl: number): string {
  if (pnl === 0 || maxAbsPnl === 0) return "bg-[#1A1A1A]";
  const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);
  if (pnl > 0) {
    if (intensity > 0.7) return "bg-[#10B981]/60";
    if (intensity > 0.4) return "bg-[#10B981]/40";
    return "bg-[#10B981]/20";
  } else {
    if (intensity > 0.7) return "bg-[#EF4444]/60";
    if (intensity > 0.4) return "bg-[#EF4444]/40";
    return "bg-[#EF4444]/20";
  }
}

export function MonthlyHeatmap({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#475569]">No monthly data available</p>
      </div>
    );
  }

  const years = [...new Set(data.map((d) => d.year))].sort();
  const maxAbsPnl = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);

  // Build lookup
  const lookup = new Map<string, MonthlyData>();
  for (const d of data) {
    lookup.set(`${d.year}-${d.month}`, d);
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs text-[#475569] py-2 pr-3 w-16">Year</th>
              {MONTHS.map((m) => (
                <th key={m} className="text-center text-xs text-[#475569] py-2 px-1">
                  {m}
                </th>
              ))}
              <th className="text-right text-xs text-[#475569] py-2 pl-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {years.map((year) => {
              const yearTotal = data
                .filter((d) => d.year === year)
                .reduce((sum, d) => sum + d.pnl, 0);

              return (
                <tr key={year}>
                  <td className="text-xs font-mono text-[#94A3B8] py-1 pr-3">
                    {year}
                  </td>
                  {MONTHS.map((month) => {
                    const d = lookup.get(`${year}-${month}`);
                    return (
                      <td key={month} className="py-1 px-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "h-8 rounded flex items-center justify-center text-xs font-mono cursor-default transition-all hover:ring-1 hover:ring-[#3B82F6]/50",
                                d ? getHeatColor(d.pnl, maxAbsPnl) : "bg-[#000000]",
                                d && d.pnl > 0 && "text-[#10B981]",
                                d && d.pnl < 0 && "text-[#EF4444]",
                                !d && "text-[#475569]"
                              )}
                            >
                              {d
                                ? new Intl.NumberFormat("en-IN", {
                                    notation: "compact",
                                    compactDisplay: "short",
                                    maximumFractionDigits: 1,
                                  }).format(d.pnl)
                                : "—"}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {d ? (
                              <div>
                                <p className="font-medium">
                                  {month} {year}
                                </p>
                                <p>P&L: {formatINR(d.pnl)}</p>
                                <p>Trades: {d.tradeCount}</p>
                              </div>
                            ) : (
                              <p>No data</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                  <td className="py-1 pl-3 text-right">
                    <span
                      className={cn(
                        "text-xs font-mono font-medium",
                        yearTotal >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
                      )}
                    >
                      {formatINR(yearTotal)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
