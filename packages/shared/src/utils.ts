// ─── Indian Number Formatting ──────────────────────────────────────

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// ─── Color Helpers ─────────────────────────────────────────────────

export function getWinRateColor(winRate: number): string {
  if (winRate > 55) return "#10B981";
  if (winRate < 45) return "#EF4444";
  return "#F59E0B";
}

export function getPnLColor(pnl: number): string {
  return pnl >= 0 ? "#10B981" : "#EF4444";
}

export function getScoreColor(score: number): string {
  if (score > 70) return "#10B981";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

// ─── Date Helpers ──────────────────────────────────────────────────

export function isMarketOpen(): boolean {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = utcMinutes + istOffset;

  const marketOpen = 9 * 60 + 15; // 9:15
  const marketClose = 15 * 60 + 30; // 15:30

  const day = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  ).getDay();

  // Closed on weekends
  if (day === 0 || day === 6) return false;

  return istMinutes >= marketOpen && istMinutes <= marketClose;
}

// ─── String Helpers ────────────────────────────────────────────────

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function generateWebhookKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
