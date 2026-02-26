"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-[#1A1A1A] text-[#94A3B8]",
        destructive: "border-transparent bg-[#EF4444]/10 text-[#EF4444]",
        outline: "border-[#1A1A1A] text-[#F1F5F9]",
        success: "border-transparent bg-[#10B981]/10 text-[#10B981]",
        warning: "border-transparent bg-[#F59E0B]/10 text-[#F59E0B]",
        purple: "border-transparent bg-[#A855F7]/10 text-[#A855F7]",
        cyan: "border-transparent bg-[#06B6D4]/10 text-[#06B6D4]",
        indigo: "border-transparent bg-[#6366F1]/10 text-[#6366F1]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
