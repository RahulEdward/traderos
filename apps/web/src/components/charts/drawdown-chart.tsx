"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatPercentage } from "@tradeos/shared";

interface DataPoint {
  date: string;
  drawdown: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-[#94A3B8]">{label}</p>
      <p className="text-sm font-mono font-medium text-[#ff2a2a]">
        -{formatPercentage(Math.abs(payload[0].value))}
      </p>
    </div>
  );
}

export function DrawdownChart({
  data,
  height = 200,
}: {
  data: DataPoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ff2a2a" stopOpacity={0.4} />
            <stop offset="50%" stopColor="#ff2a2a" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#ff2a2a" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={true} horizontal={true} />
        <XAxis
          dataKey="date"
          stroke="#475569"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          minTickGap={30}
        />
        <YAxis
          stroke="#475569"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v.toFixed(0)}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="stepAfter"
          dataKey="drawdown"
          stroke="#ff2a2a"
          fillOpacity={1}
          fill="url(#drawdownGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
