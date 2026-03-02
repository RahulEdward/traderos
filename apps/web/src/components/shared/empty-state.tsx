"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 bg-[var(--border-color)]/50 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-lg font-semibold text-[#F1F5F9] mb-1">{title}</h3>
      <p className="text-sm text-[#94A3B8] text-center max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button className="bg-[#3B82F6] hover:bg-[#2563EB]" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
