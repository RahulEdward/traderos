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
import { formatINR } from "@tradeos/shared";

interface DataPoint {
  date: string;
  value: number;
}

interface EquityCurveChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-[#94A3B8]">{label}</p>
      <p className="text-sm font-mono font-medium text-[#00FF44]">
        {formatINR(payload[0].value)}
      </p>
    </div>
  );
}

export function EquityCurveChart({
  data,
  height = 300,
  color = "#00FF44", // Extremely bright neon green like the screenshot
}: EquityCurveChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="50%" stopColor={color} stopOpacity={0.1} />
            <stop offset="95%" stopColor={color} stopOpacity={0.0} />
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
          tickFormatter={(value) =>
            new Intl.NumberFormat("en-IN", {
              notation: "compact",
              compactDisplay: "short",
            }).format(value)
          }
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="stepAfter"
          dataKey="value"
          stroke={color}
          fillOpacity={1}
          fill="url(#equityGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
