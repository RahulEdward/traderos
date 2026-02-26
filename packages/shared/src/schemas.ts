import { z } from "zod";

// ─── Auth Schemas ──────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number"
      ),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ─── Strategy Schemas ──────────────────────────────────────────────

export const createStrategySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  market: z.string().min(1, "Market is required"),
  instrument: z.string().optional(),
  timeframe: z.string().min(1, "Timeframe is required"),
  entryLogic: z.string().optional(),
  exitLogic: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z
    .enum([
      "IDEA",
      "IN_DEVELOPMENT",
      "BACKTESTING",
      "REVIEW",
      "PAPER_TRADING",
      "LIVE",
      "PAUSED",
      "RETIRED",
    ])
    .default("IDEA"),
});

export const updateStrategySchema = createStrategySchema.partial();

// ─── Portfolio Schemas ─────────────────────────────────────────────

export const createPortfolioSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).default("ACTIVE"),
  strategies: z
    .array(
      z.object({
        strategyId: z.string(),
        capitalAllocationPct: z.number().min(0).max(100),
      })
    )
    .default([]),
});

// ─── Task Schemas ──────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  strategyId: z.string().optional(),
  taskType: z
    .enum(["BUG_FIX", "OPTIMIZATION", "RESEARCH", "TESTING", "DOCUMENTATION"])
    .default("RESEARCH"),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional(),
});

// ─── Live Trade Schemas ────────────────────────────────────────────

export const createLiveTradeSchema = z.object({
  strategyId: z.string(),
  symbol: z.string().min(1, "Symbol is required"),
  direction: z.enum(["LONG", "SHORT"]),
  entryDate: z.string().datetime(),
  entryPrice: z.number().positive(),
  exitDate: z.string().datetime().optional(),
  exitPrice: z.number().positive().optional(),
  quantity: z.number().int().positive(),
  broker: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Onboarding Schema ────────────────────────────────────────────

export const onboardingSchema = z.object({
  tradingPlatform: z.enum(["TRADINGVIEW", "AMIBROKER", "BOTH"]),
  marketFocus: z
    .array(z.string())
    .min(1, "Select at least one market"),
  riskProfile: z.enum(["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]),
});

// ─── Type Exports ──────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateStrategyInput = z.infer<typeof createStrategySchema>;
export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;
export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CreateLiveTradeInput = z.infer<typeof createLiveTradeSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
