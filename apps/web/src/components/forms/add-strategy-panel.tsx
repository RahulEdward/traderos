"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createStrategySchema, type CreateStrategyInput } from "@tradeos/shared";
import { MARKET_OPTIONS, TIMEFRAME_OPTIONS } from "@tradeos/shared";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";

interface AddStrategyPanelProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  editData?: CreateStrategyInput & { id: string };
}

export function AddStrategyPanel({
  open,
  onClose,
  onCreated,
  editData,
}: AddStrategyPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateStrategyInput>({
    resolver: zodResolver(createStrategySchema),
    defaultValues: editData || {
      name: "",
      description: "",
      market: "",
      instrument: "",
      timeframe: "",
      entryLogic: "",
      exitLogic: "",
      tags: [],
      status: "IDEA",
    },
  });

  const tags = watch("tags") || [];
  const market = watch("market");
  const timeframe = watch("timeframe");
  const status = watch("status");

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setValue("tags", [...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setValue(
      "tags",
      tags.filter((t) => t !== tag)
    );
  };

  const onSubmit = async (data: CreateStrategyInput) => {
    setIsSubmitting(true);
    try {
      const url = editData
        ? `/api/strategies/${editData.id}`
        : "/api/strategies";
      const method = editData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        reset();
        onCreated();
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {editData ? "Edit Strategy" : "Add Strategy"}
          </SheetTitle>
          <SheetDescription>
            {editData
              ? "Update your strategy details"
              : "Create a new trading strategy"}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 mt-6"
        >
          {/* Name */}
          <div className="space-y-2">
            <Label>Strategy Name *</Label>
            <Input placeholder="e.g. Nifty Breakout v2" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-[#EF4444]">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Brief description of your strategy..."
              rows={3}
              {...register("description")}
            />
          </div>

          {/* Market */}
          <div className="space-y-2">
            <Label>Market *</Label>
            <Select
              value={market}
              onValueChange={(v) => setValue("market", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select market" />
              </SelectTrigger>
              <SelectContent>
                {MARKET_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.market && (
              <p className="text-xs text-[#EF4444]">{errors.market.message}</p>
            )}
          </div>

          {/* Instrument */}
          <div className="space-y-2">
            <Label>Instrument / Symbol</Label>
            <Input placeholder="e.g. NIFTY, RELIANCE" {...register("instrument")} />
          </div>

          {/* Timeframe */}
          <div className="space-y-2">
            <Label>Timeframe *</Label>
            <Select
              value={timeframe}
              onValueChange={(v) => setValue("timeframe", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entry Logic */}
          <div className="space-y-2">
            <Label>Entry Logic</Label>
            <Textarea
              placeholder="Describe your entry conditions..."
              rows={4}
              {...register("entryLogic")}
            />
          </div>

          {/* Exit Logic */}
          <div className="space-y-2">
            <Label>Exit Logic</Label>
            <Textarea
              placeholder="Describe your exit conditions..."
              rows={4}
              {...register("exitLogic")}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} type="button">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v: any) => setValue("status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IDEA">Idea</SelectItem>
                <SelectItem value="IN_DEVELOPMENT">In Development</SelectItem>
                <SelectItem value="BACKTESTING">Backtesting</SelectItem>
                <SelectItem value="REVIEW">Review</SelectItem>
                <SelectItem value="PAPER_TRADING">Paper Trading</SelectItem>
                <SelectItem value="LIVE">Live</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="RETIRED">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB]"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editData ? "Update Strategy" : "Create Strategy"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
