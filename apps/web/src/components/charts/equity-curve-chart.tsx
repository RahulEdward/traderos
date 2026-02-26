"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
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
      <p className="text-sm font-mono font-medium text-[#F1F5F9]">
        {formatINR(payload[0].value)}
      </p>
    </div>
  );
}

export function EquityCurveChart({
  data,
  height = 300,
  color = "#3B82F6",
}: EquityCurveChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#475569"
          fontSize={12}
          tickLine={false}
          axisLine={false}
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
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
