import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@tradeos/db";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

const SYSTEM_PROMPT = `You are an expert algorithmic trading strategy analyst specializing in Indian markets (NSE/BSE). You analyze breakout trading strategies based on their backtest results and provide structured, actionable analysis. Always respond in the exact JSON structure requested.`;

interface AnalysisInput {
  strategyId: string;
  backtestResultId: string;
  strategyName: string;
  description?: string;
  market?: string;
  instrument?: string;
  timeframe?: string;
  entryLogic?: string;
  exitLogic?: string;
  metrics: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    netProfit: number;
    maxDrawdown: number;
    maxDrawdownPct: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    expectancy: number;
    avgWin: number;
    avgLoss: number;
    bestTrade: number;
    worstTrade: number;
    recoveryFactor: number;
  };
  monthlyBreakdown?: { month: string; year: number; pnl: number; tradeCount: number }[];
  startDate?: string;
  endDate?: string;
}

interface AnalysisResult {
  overallScore: number;
  readinessVerdict: "READY" | "NEEDS_WORK" | "NOT_READY";
  readinessScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  riskNotes: string;
  marketRegimeNotes: string;
}

export async function runStrategyAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  const userMessage = `Analyze this Indian market breakout trading strategy:

Strategy: ${input.strategyName}
${input.description ? `Description: ${input.description}` : ""}
${input.market ? `Market: ${input.market}` : ""}
${input.instrument ? `Instrument: ${input.instrument}` : ""}
${input.timeframe ? `Timeframe: ${input.timeframe}` : ""}
${input.entryLogic ? `Entry Logic: ${input.entryLogic}` : ""}
${input.exitLogic ? `Exit Logic: ${input.exitLogic}` : ""}

Backtest Metrics:
- Total Trades: ${input.metrics.totalTrades}
- Win Rate: ${input.metrics.winRate}%
- Profit Factor: ${input.metrics.profitFactor}
- Net Profit: ₹${input.metrics.netProfit.toLocaleString("en-IN")}
- Max Drawdown: ₹${input.metrics.maxDrawdown.toLocaleString("en-IN")} (${input.metrics.maxDrawdownPct}%)
- Sharpe Ratio: ${input.metrics.sharpeRatio}
- Sortino Ratio: ${input.metrics.sortinoRatio}
- Calmar Ratio: ${input.metrics.calmarRatio}
- Expectancy: ₹${input.metrics.expectancy.toLocaleString("en-IN")}
- Avg Win: ₹${input.metrics.avgWin.toLocaleString("en-IN")}
- Avg Loss: ₹${input.metrics.avgLoss.toLocaleString("en-IN")}
- Best Trade: ₹${input.metrics.bestTrade.toLocaleString("en-IN")}
- Worst Trade: ₹${input.metrics.worstTrade.toLocaleString("en-IN")}
- Recovery Factor: ${input.metrics.recoveryFactor}
${input.startDate && input.endDate ? `- Date Range: ${input.startDate} to ${input.endDate}` : ""}
${input.monthlyBreakdown ? `- Monthly Breakdown (recent): ${JSON.stringify(input.monthlyBreakdown.slice(-6))}` : ""}

Market Context: India (NSE/BSE), risk-free rate 6%.

Respond in this exact JSON format:
{
  "overallScore": <number 1-100>,
  "readinessVerdict": "<READY|NEEDS_WORK|NOT_READY>",
  "readinessScore": <number 1-100>,
  "summary": "<2-3 sentence executive summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>", "<actionable suggestion 3>"],
  "riskNotes": "<risk assessment paragraph>",
  "marketRegimeNotes": "<when this strategy works best and when it struggles>"
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }

  // Extract JSON from response (handle possible markdown code blocks)
  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const result: AnalysisResult = JSON.parse(jsonStr);

  // Validate and clamp scores
  result.overallScore = Math.max(1, Math.min(100, Math.round(result.overallScore)));
  result.readinessScore = Math.max(1, Math.min(100, Math.round(result.readinessScore)));

  if (!["READY", "NEEDS_WORK", "NOT_READY"].includes(result.readinessVerdict)) {
    result.readinessVerdict = "NOT_READY";
  }

  return result;
}

export async function analyzeStrategy(
  strategyId: string,
  backtestResultId: string
): Promise<void> {
  // Fetch strategy + backtest data
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
  });

  const backtest = await prisma.backtestResult.findUnique({
    where: { id: backtestResultId },
    include: { trades: { orderBy: { tradeNumber: "asc" } } },
  });

  if (!strategy || !backtest) {
    throw new Error("Strategy or backtest not found");
  }

  // Calculate monthly breakdown from trades
  const monthlyMap = new Map<string, { pnl: number; tradeCount: number; month: string; year: number }>();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (const trade of backtest.trades) {
    const d = new Date(trade.exitDate || trade.entryDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const existing = monthlyMap.get(key) || {
      pnl: 0,
      tradeCount: 0,
      month: monthNames[d.getMonth()],
      year: d.getFullYear(),
    };
    existing.pnl += trade.profitLoss;
    existing.tradeCount += 1;
    monthlyMap.set(key, existing);
  }

  const input: AnalysisInput = {
    strategyId,
    backtestResultId,
    strategyName: strategy.name,
    description: strategy.description || undefined,
    market: strategy.market || undefined,
    instrument: strategy.instrument || undefined,
    timeframe: strategy.timeframe || undefined,
    entryLogic: strategy.entryLogic || undefined,
    exitLogic: strategy.exitLogic || undefined,
    metrics: {
      totalTrades: backtest.totalTrades,
      winRate: backtest.winRate,
      profitFactor: backtest.profitFactor,
      netProfit: backtest.netProfit,
      maxDrawdown: backtest.maxDrawdown,
      maxDrawdownPct: backtest.maxDrawdownPct,
      sharpeRatio: backtest.sharpeRatio,
      sortinoRatio: backtest.sortinoRatio,
      calmarRatio: backtest.calmarRatio,
      expectancy: backtest.expectancy,
      avgWin: backtest.avgWin,
      avgLoss: backtest.avgLoss,
      bestTrade: backtest.bestTrade,
      worstTrade: backtest.worstTrade,
      recoveryFactor: backtest.recoveryFactor,
    },
    monthlyBreakdown: Array.from(monthlyMap.values()),
    startDate: backtest.startDate?.toISOString(),
    endDate: backtest.endDate?.toISOString(),
  };

  const result = await runStrategyAnalysis(input);

  // Save to database
  await prisma.aiAnalysis.create({
    data: {
      strategyId,
      backtestResultId,
      overallScore: result.overallScore,
      readinessScore: result.readinessScore,
      readinessVerdict: result.readinessVerdict,
      summary: result.summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      suggestions: result.suggestions,
      riskNotes: result.riskNotes,
      marketRegimeNotes: result.marketRegimeNotes,
      rawResponse: result as any,
    },
  });
}

export async function chatWithStrategy(
  strategyId: string,
  userMessage: string,
  chatHistory: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    include: {
      backtestResults: {
        orderBy: { importedAt: "desc" },
        take: 1,
      },
      aiAnalyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!strategy) throw new Error("Strategy not found");

  const latestBacktest = strategy.backtestResults[0];
  const latestAnalysis = strategy.aiAnalyses[0];

  const systemMessage = `You are a trading strategy advisor for Indian markets (NSE/BSE). You are helping a trader understand and improve their strategy.

Strategy Context:
- Name: ${strategy.name}
${strategy.description ? `- Description: ${strategy.description}` : ""}
${strategy.market ? `- Market: ${strategy.market}` : ""}
${strategy.timeframe ? `- Timeframe: ${strategy.timeframe}` : ""}
${latestBacktest ? `
Backtest Results:
- Total Trades: ${latestBacktest.totalTrades}
- Win Rate: ${latestBacktest.winRate}%
- Profit Factor: ${latestBacktest.profitFactor}
- Net Profit: ₹${latestBacktest.netProfit.toLocaleString("en-IN")}
- Max Drawdown: ${latestBacktest.maxDrawdownPct}%
- Sharpe Ratio: ${latestBacktest.sharpeRatio}
` : "No backtest data available."}
${latestAnalysis ? `
AI Analysis (Score: ${latestAnalysis.overallScore}/100, Verdict: ${latestAnalysis.readinessVerdict}):
${latestAnalysis.summary}
` : ""}

Be concise, specific to Indian markets, and actionable. Use INR for monetary values.`;

  const messages = [
    ...chatHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemMessage,
    messages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "Sorry, I could not generate a response.";
}
