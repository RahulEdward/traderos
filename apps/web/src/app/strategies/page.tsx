"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Search,
  List,
  LayoutGrid,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  Edit,
  ArrowUpDown,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { STRATEGY_STATUS_CONFIG } from "@tradeos/shared";
import { formatINR, formatPercentage } from "@tradeos/shared";
import { AddStrategyPanel } from "@/components/forms/add-strategy-panel";

const STATUS_FILTERS = [
  "All",
  "IDEA",
  "IN_DEVELOPMENT",
  "BACKTESTING",
  "REVIEW",
  "PAPER_TRADING",
  "LIVE",
  "PAUSED",
  "RETIRED",
] as const;

type StrategyStatus = keyof typeof STRATEGY_STATUS_CONFIG;

interface Strategy {
  id: string;
  name: string;
  status: StrategyStatus;
  market: string | null;
  instrument: string | null;
  updatedAt: string;
  backtestResults: {
    winRate: number;
    profitFactor: number;
    maxDrawdownPct: number;
    netProfit: number;
  }[];
}

// Sortable Kanban Card
function SortableKanbanCard({ strategy }: { strategy: Strategy }) {
  const bt = strategy.backtestResults[0];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: strategy.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-3 bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg hover:border-[#3B82F6]/30 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 text-[#475569] hover:text-[#94A3B8] cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Link href={`/strategies/${strategy.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#F1F5F9] mb-1 truncate">
          {strategy.name}
        </p>
        <p className="text-xs text-[#475569] mb-2">
          {strategy.market || "No market set"}
        </p>
        {bt && (
          <div className="flex gap-3 text-xs">
            <span className="text-[#94A3B8]">
              WR:{" "}
              <span className="font-mono text-[#F1F5F9]">
                {bt.winRate.toFixed(1)}%
              </span>
            </span>
            <span className="text-[#94A3B8]">
              PF:{" "}
              <span className="font-mono text-[#F1F5F9]">
                {bt.profitFactor.toFixed(2)}
              </span>
            </span>
          </div>
        )}
        <p className="text-[10px] text-[#475569] mt-1">
          {formatDistanceToNow(new Date(strategy.updatedAt), { addSuffix: true })}
        </p>
      </Link>
    </div>
  );
}

// Kanban Column (droppable)
function KanbanColumn({
  status,
  config,
  strategies,
}: {
  status: string;
  config: { label: string; color: string };
  strategies: Strategy[];
}) {
  const { setNodeRef } = useSortable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-[280px] bg-[#050505] rounded-xl border border-[#1A1A1A]"
    >
      <div className="flex items-center justify-between p-3 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-sm font-medium text-[#F1F5F9]">
            {config.label}
          </span>
        </div>
        <span className="text-xs text-[#475569] bg-[#0A0A0A] px-2 py-0.5 rounded">
          {strategies.length}
        </span>
      </div>
      <SortableContext
        items={strategies.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-2 space-y-2 min-h-[200px]">
          {strategies.map((s) => (
            <SortableKanbanCard key={s.id} strategy={s} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [activeCard, setActiveCard] = useState<Strategy | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchStrategies = useCallback(async () => {
    try {
      const res = await fetch("/api/strategies");
      if (res.ok) {
        const data = await res.json();
        setStrategies(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const filteredStrategies = strategies
    .filter((s) => statusFilter === "All" || s.status === statusFilter)
    .filter(
      (s) =>
        search === "" ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.market?.toLowerCase().includes(search.toLowerCase())
    );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this strategy?")) return;
    await fetch(`/api/strategies/${id}`, { method: "DELETE" });
    fetchStrategies();
  };

  // Kanban drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedStrategy = strategies.find((s) => s.id === active.id);
    setActiveCard(draggedStrategy || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeStrategy = strategies.find((s) => s.id === active.id);
    if (!activeStrategy) return;

    // Determine target status from the drop zone
    let targetStatus: string | null = null;

    if (String(over.id).startsWith("column-")) {
      targetStatus = String(over.id).replace("column-", "");
    } else {
      // Dropped on another card — find which column it belongs to
      const overStrategy = strategies.find((s) => s.id === over.id);
      if (overStrategy) {
        targetStatus = overStrategy.status;
      }
    }

    if (!targetStatus || targetStatus === activeStrategy.status) return;

    // Optimistic update
    setStrategies((prev) =>
      prev.map((s) =>
        s.id === activeStrategy.id ? { ...s, status: targetStatus as StrategyStatus } : s
      )
    );

    // Call API to update status
    try {
      await fetch(`/api/strategies/${activeStrategy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
    } catch (error) {
      console.error("Error updating status:", error);
      fetchStrategies(); // Revert on failure
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#F1F5F9]">Strategies</h1>
        <Button
          onClick={() => setShowAddPanel(true)}
          className="bg-[#3B82F6] hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Strategy
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((status) => {
            const config =
              status === "All"
                ? null
                : STRATEGY_STATUS_CONFIG[status as StrategyStatus];
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  statusFilter === status
                    ? "bg-[#3B82F6] text-white"
                    : "bg-[#0A0A0A] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#1A1A1A]"
                )}
              >
                {status === "All" ? "All" : config?.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
            <Input
              placeholder="Search strategies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-[200px] h-9"
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] h-9">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="winRate">Win Rate</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border border-[#1A1A1A] rounded-lg overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-2 transition-colors",
                view === "list"
                  ? "bg-[#1A1A1A] text-[#F1F5F9]"
                  : "text-[#475569] hover:text-[#94A3B8]"
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "p-2 transition-colors",
                view === "kanban"
                  ? "bg-[#1A1A1A] text-[#F1F5F9]"
                  : "text-[#475569] hover:text-[#94A3B8]"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && strategies.length === 0 && (
        <div className="text-center py-16 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl">
          <div className="w-16 h-16 bg-[#3B82F6]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="h-8 w-8 text-[#3B82F6]" />
          </div>
          <h3 className="text-lg font-medium text-[#F1F5F9] mb-2">
            No strategies yet
          </h3>
          <p className="text-sm text-[#94A3B8] mb-4">
            Create your first strategy to get started
          </p>
          <Button
            onClick={() => setShowAddPanel(true)}
            className="bg-[#3B82F6] hover:bg-[#2563EB]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Strategy
          </Button>
        </div>
      )}

      {/* List View */}
      {!loading && filteredStrategies.length > 0 && view === "list" && (
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#050505] border-b border-[#1A1A1A]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#94A3B8] uppercase">Strategy</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#94A3B8] uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#94A3B8] uppercase">Market</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#94A3B8] uppercase">Win Rate</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#94A3B8] uppercase">Profit Factor</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#94A3B8] uppercase">Max DD</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#94A3B8] uppercase">Net Profit</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#94A3B8] uppercase">Updated</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredStrategies.map((strategy) => {
                const bt = strategy.backtestResults[0];
                const statusConfig = STRATEGY_STATUS_CONFIG[strategy.status];
                return (
                  <tr
                    key={strategy.id}
                    className="border-b border-[#1A1A1A] last:border-0 hover:bg-[#000000] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/strategies/${strategy.id}`}
                        className="text-sm font-medium text-[#F1F5F9] hover:text-[#3B82F6] transition-colors"
                      >
                        {strategy.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        style={{
                          backgroundColor: statusConfig.bgColor,
                          color: statusConfig.color,
                        }}
                      >
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#94A3B8]">
                      {strategy.market || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "text-sm font-mono",
                          bt
                            ? bt.winRate > 55
                              ? "text-[#10B981]"
                              : bt.winRate < 45
                                ? "text-[#EF4444]"
                                : "text-[#F59E0B]"
                            : "text-[#475569]"
                        )}
                      >
                        {bt ? formatPercentage(bt.winRate) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-[#F1F5F9]">
                      {bt ? bt.profitFactor.toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-[#EF4444]">
                      {bt ? formatPercentage(bt.maxDrawdownPct) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "text-sm font-mono",
                          bt
                            ? bt.netProfit >= 0
                              ? "text-[#10B981]"
                              : "text-[#EF4444]"
                            : "text-[#475569]"
                        )}
                      >
                        {bt ? formatINR(bt.netProfit) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[#475569]">
                      {formatDistanceToNow(new Date(strategy.updatedAt), {
                        addSuffix: true,
                      })}
                    </td>
                    <td className="px-2 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4 text-[#475569]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/strategies/${strategy.id}`}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" /> Clone
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Archive className="mr-2 h-4 w-4" /> Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(strategy.id)}
                            className="text-[#EF4444] focus:text-[#EF4444]"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban View with @dnd-kit */}
      {!loading && view === "kanban" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {Object.entries(STRATEGY_STATUS_CONFIG).map(([status, config]) => {
              const columnStrategies = filteredStrategies.filter(
                (s) => s.status === status
              );
              return (
                <KanbanColumn
                  key={status}
                  status={status}
                  config={config}
                  strategies={columnStrategies}
                />
              );
            })}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeCard && (
              <div className="p-3 bg-[#0F1629] border border-[#3B82F6] rounded-lg shadow-xl w-[260px] opacity-90">
                <p className="text-sm font-medium text-[#F1F5F9] mb-1">
                  {activeCard.name}
                </p>
                <p className="text-xs text-[#475569]">
                  {activeCard.market || "No market set"}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add Strategy Panel */}
      <AddStrategyPanel
        open={showAddPanel}
        onClose={() => setShowAddPanel(false)}
        onCreated={() => {
          setShowAddPanel(false);
          fetchStrategies();
        }}
      />
    </div>
  );
}
