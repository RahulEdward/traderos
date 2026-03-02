"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "./info-tooltip";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  tooltip?: string;
  change?: { value: number; label: string };
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  tooltip,
  change,
}: MetricCardProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm text-[var(--text-secondary)]">{title}</p>
            {tooltip && <InfoTooltip text={tooltip} />}
          </div>
          <p className="text-2xl font-semibold font-mono text-[var(--text-primary)]">
            {value}
          </p>
          {change && (
            <p
              className={cn(
                "text-xs mt-1",
                change.value >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
              )}
            >
              {change.value >= 0 ? "+" : ""}
              {change.value}% {change.label}
            </p>
          )}
        </div>
        <div
          className="p-2.5 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}
