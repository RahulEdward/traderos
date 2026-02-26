"use client";

import { useState, useEffect } from "react";
import { X, Search, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Strategy {
  id: string;
  name: string;
  status: string;
  market?: string;
}

interface SelectedStrategy {
  strategyId: string;
  name: string;
  capitalAllocationPct: number;
}

interface CreatePortfolioPanelProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  editData?: {
    id: string;
    name: string;
    description: string;
    status: string;
    strategies: SelectedStrategy[];
  };
}

export function CreatePortfolioPanel({
  open,
  onClose,
  onCreated,
  editData,
}: CreatePortfolioPanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategies, setSelectedStrategies] = useState<SelectedStrategy[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchStrategies();
      if (editData) {
        setName(editData.name);
        setDescription(editData.description);
        setStatus(editData.status);
        setSelectedStrategies(editData.strategies);
      } else {
        setName("");
        setDescription("");
        setStatus("ACTIVE");
        setSelectedStrategies([]);
      }
    }
  }, [open, editData]);

  const fetchStrategies = async () => {
    try {
      const res = await fetch("/api/strategies");
      if (res.ok) {
        const data = await res.json();
        setStrategies(data);
      }
    } catch (error) {
      console.error("Error fetching strategies:", error);
    }
  };

  const addStrategy = (strategy: Strategy) => {
    if (selectedStrategies.find((s) => s.strategyId === strategy.id)) return;
    setSelectedStrategies((prev) => [
      ...prev,
      { strategyId: strategy.id, name: strategy.name, capitalAllocationPct: 0 },
    ]);
  };

  const removeStrategy = (strategyId: string) => {
    setSelectedStrategies((prev) => prev.filter((s) => s.strategyId !== strategyId));
  };

  const updateAllocation = (strategyId: string, pct: number) => {
    setSelectedStrategies((prev) =>
      prev.map((s) =>
        s.strategyId === strategyId
          ? { ...s, capitalAllocationPct: Math.max(0, Math.min(100, pct)) }
          : s
      )
    );
  };

  const totalAllocation = selectedStrategies.reduce(
    (sum, s) => sum + s.capitalAllocationPct,
    0
  );

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const url = editData
        ? `/api/portfolios/${editData.id}`
        : "/api/portfolios";
      const method = editData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          status,
          strategies: selectedStrategies.map((s) => ({
            strategyId: s.strategyId,
            capitalAllocationPct: s.capitalAllocationPct,
          })),
        }),
      });

      if (res.ok) {
        onCreated();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredStrategies = strategies.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedStrategies.find((ss) => ss.strategyId === s.id)
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="bg-[#0A0A0A] border-l border-[#1A1A1A] w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-[#F1F5F9]">
            {editData ? "Edit Portfolio" : "Create Portfolio"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Name */}
          <div>
            <label className="text-xs text-[#475569] mb-1 block">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Nifty Breakout Portfolio"
              className="w-full text-sm bg-[#050505] border border-[#1A1A1A] rounded-lg px-3 py-2.5 text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-[#475569] mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Portfolio description..."
              className="w-full text-sm bg-[#050505] border border-[#1A1A1A] rounded-lg px-3 py-2.5 text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6] resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-xs text-[#475569] mb-1 block">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-sm bg-[#050505] border border-[#1A1A1A] rounded-lg px-3 py-2.5 text-[#94A3B8]"
            >
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Add Strategies */}
          <div>
            <label className="text-xs text-[#475569] mb-1 block">Strategies</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search strategies..."
                className="w-full text-sm bg-[#050505] border border-[#1A1A1A] rounded-lg pl-9 pr-3 py-2 text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            {/* Available strategies */}
            <div className="max-h-[150px] overflow-y-auto space-y-1 mb-3">
              {filteredStrategies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => addStrategy(s)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#050505] text-left transition-colors"
                >
                  <span className="text-sm text-[#F1F5F9]">{s.name}</span>
                  <Plus className="h-4 w-4 text-[#3B82F6]" />
                </button>
              ))}
              {filteredStrategies.length === 0 && (
                <p className="text-xs text-[#475569] text-center py-2">No strategies found</p>
              )}
            </div>
          </div>

          {/* Selected Strategies & Allocation */}
          {selectedStrategies.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-[#475569]">Capital Allocation</label>
                <span
                  className={`text-xs font-mono ${
                    totalAllocation === 100
                      ? "text-[#10B981]"
                      : totalAllocation > 100
                      ? "text-[#EF4444]"
                      : "text-[#F59E0B]"
                  }`}
                >
                  Total: {totalAllocation}%
                </span>
              </div>

              <div className="space-y-2">
                {selectedStrategies.map((s) => (
                  <div
                    key={s.strategyId}
                    className="flex items-center gap-2 bg-[#050505] border border-[#1A1A1A] rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-[#F1F5F9] flex-1 truncate">
                      {s.name}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={s.capitalAllocationPct}
                      onChange={(e) =>
                        updateAllocation(s.strategyId, parseFloat(e.target.value) || 0)
                      }
                      className="w-16 text-sm text-center bg-[#0A0A0A] border border-[#1A1A1A] rounded px-1 py-1 text-[#F1F5F9] font-mono"
                    />
                    <span className="text-xs text-[#475569]">%</span>
                    <button
                      onClick={() => removeStrategy(s.strategyId)}
                      className="text-[#475569] hover:text-[#EF4444]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB]"
          >
            {saving
              ? "Saving..."
              : editData
              ? "Update Portfolio"
              : "Create Portfolio"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
