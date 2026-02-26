"use client";

import {
  Layers,
  BarChart3,
  Brain,
  Upload,
  CheckCircle,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
}

const typeIcons: Record<string, any> = {
  strategy_created: Layers,
  backtest_imported: Upload,
  ai_analysis: Brain,
  task_completed: CheckCircle,
  live_trade: Activity,
  default: BarChart3,
};

const typeColors: Record<string, string> = {
  strategy_created: "#3B82F6",
  backtest_imported: "#F59E0B",
  ai_analysis: "#06B6D4",
  task_completed: "#10B981",
  live_trade: "#A855F7",
  default: "#94A3B8",
};

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#475569]">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const Icon = typeIcons[item.type] || typeIcons.default;
        const color = typeColors[item.type] || typeColors.default;

        return (
          <div key={item.id} className="flex items-start gap-3">
            <div
              className="p-1.5 rounded-lg shrink-0 mt-0.5"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="h-3.5 w-3.5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#F1F5F9] truncate">{item.title}</p>
              <p className="text-xs text-[#475569]">
                {formatDistanceToNow(new Date(item.timestamp), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
