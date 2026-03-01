/**
 * SQLite JSON Array Helpers
 *
 * SQLite doesn't support native arrays, so we store them as JSON strings.
 * These helpers handle serialization/deserialization transparently.
 */

/** Parse a JSON string field back to an array. Returns fallback if invalid. */
export function parseJsonArray<T = string>(value: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Convert an array to a JSON string for SQLite storage. */
export function toJsonString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return JSON.stringify(value);
  return "[]";
}

/** Parse a JSON string field back to an object. Returns fallback if invalid. */
export function parseJsonObject<T = Record<string, unknown>>(value: unknown, fallback: T | null = null): T | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** Convert an object to a JSON string for SQLite storage. */
export function toJsonObjectString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

/**
 * Parse all JSON array fields on a strategy object returned from Prisma.
 * Mutates in place and returns the object for chaining.
 */
export function parseStrategyArrays<T extends Record<string, any>>(strategy: T): T {
  if (strategy.tags !== undefined) {
    strategy.tags = parseJsonArray(strategy.tags);
  }
  return strategy;
}

/**
 * Parse all JSON array fields on an AI analysis object returned from Prisma.
 */
export function parseAnalysisArrays<T extends Record<string, any>>(analysis: T): T {
  if (analysis.strengths !== undefined) {
    analysis.strengths = parseJsonArray(analysis.strengths);
  }
  if (analysis.weaknesses !== undefined) {
    analysis.weaknesses = parseJsonArray(analysis.weaknesses);
  }
  if (analysis.suggestions !== undefined) {
    analysis.suggestions = parseJsonArray(analysis.suggestions);
  }
  if (analysis.rawResponse !== undefined) {
    analysis.rawResponse = parseJsonObject(analysis.rawResponse);
  }
  return analysis;
}

/**
 * Parse all JSON array fields on a user object returned from Prisma.
 */
export function parseUserArrays<T extends Record<string, any>>(user: T): T {
  if (user.marketFocus !== undefined) {
    user.marketFocus = parseJsonArray(user.marketFocus);
  }
  if (user.notificationPrefs !== undefined) {
    user.notificationPrefs = parseJsonObject(user.notificationPrefs);
  }
  return user;
}

/**
 * Parse all JSON array fields on a backtest run object returned from Prisma.
 */
export function parseBacktestRunArrays<T extends Record<string, any>>(run: T): T {
  if (run.sharpeDistribution !== undefined) {
    run.sharpeDistribution = parseJsonArray<number>(run.sharpeDistribution, []);
  }
  if (run.config !== undefined) {
    run.config = parseJsonObject(run.config);
  }
  return run;
}
