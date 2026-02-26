"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  change?: { value: number; label: string };
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  change,
}: MetricCardProps) {
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <p className="text-2xl font-semibold font-mono text-[#F1F5F9]">
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
