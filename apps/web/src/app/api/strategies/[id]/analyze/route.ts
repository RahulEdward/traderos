import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@tradeos/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

const SYSTEM_PROMPT = `You are an expert algorithmic trading strategy analyst specializing in Indian markets (NSE/BSE). You analyze breakout trading strategies based on their backtest results and provide structured, actionable analysis. Always respond in the exact JSON structure requested.`;

// POST - trigger AI analysis
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const strategy = await prisma.strategy.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        backtestResults: {
          orderBy: { importedAt: "desc" },
          take: 1,
          include: { trades: { orderBy: { tradeNumber: "asc" } } },
        },
      },
    });

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const backtest = strategy.backtestResults[0];
    if (!backtest) {
      return NextResponse.json(
        { error: "No backtest data. Import a backtest first." },
        { status: 400 }
      );
    }

    // Calculate monthly breakdown
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyMap = new Map<string, { pnl: number; tradeCount: number; month: string; year: number }>();
    for (const trade of backtest.trades) {
      const d = new Date(trade.exitDate || trade.entryDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = monthlyMap.get(key) || {
        pnl: 0, tradeCount: 0, month: monthNames[d.getMonth()], year: d.getFullYear(),
      };
      existing.pnl += trade.profitLoss;
      existing.tradeCount += 1;
      monthlyMap.set(key, existing);
    }

    const userMessage = `Analyze this Indian market breakout trading strategy:

Strategy: ${strategy.name}
${strategy.description ? `Description: ${strategy.description}` : ""}
${strategy.market ? `Market: ${strategy.market}` : ""}
${strategy.instrument ? `Instrument: ${strategy.instrument}` : ""}
${strategy.timeframe ? `Timeframe: ${strategy.timeframe}` : ""}
${strategy.entryLogic ? `Entry Logic: ${strategy.entryLogic}` : ""}
${strategy.exitLogic ? `Exit Logic: ${strategy.exitLogic}` : ""}

Backtest Metrics:
- Total Trades: ${backtest.totalTrades}
- Win Rate: ${backtest.winRate}%
- Profit Factor: ${backtest.profitFactor}
- Net Profit: ₹${backtest.netProfit.toLocaleString("en-IN")}
- Max Drawdown: ₹${backtest.maxDrawdown.toLocaleString("en-IN")} (${backtest.maxDrawdownPct}%)
- Sharpe Ratio: ${backtest.sharpeRatio}
- Sortino Ratio: ${backtest.sortinoRatio}
- Calmar Ratio: ${backtest.calmarRatio}
- Expectancy: ₹${backtest.expectancy.toLocaleString("en-IN")}
- Avg Win: ₹${backtest.avgWin.toLocaleString("en-IN")}
- Avg Loss: ₹${backtest.avgLoss.toLocaleString("en-IN")}
- Best Trade: ₹${backtest.bestTrade.toLocaleString("en-IN")}
- Worst Trade: ₹${backtest.worstTrade.toLocaleString("en-IN")}
- Recovery Factor: ${backtest.recoveryFactor}
${backtest.startDate && backtest.endDate ? `- Date Range: ${backtest.startDate.toISOString()} to ${backtest.endDate.toISOString()}` : ""}
- Monthly Breakdown (recent): ${JSON.stringify(Array.from(monthlyMap.values()).slice(-6))}

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

    let jsonStr = textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const result = JSON.parse(jsonStr);

    // Clamp scores
    result.overallScore = Math.max(1, Math.min(100, Math.round(result.overallScore)));
    result.readinessScore = Math.max(1, Math.min(100, Math.round(result.readinessScore)));
    if (!["READY", "NEEDS_WORK", "NOT_READY"].includes(result.readinessVerdict)) {
      result.readinessVerdict = "NOT_READY";
    }

    // Save to DB
    const analysis = await prisma.aiAnalysis.create({
      data: {
        strategyId: params.id,
        backtestResultId: backtest.id,
        overallScore: result.overallScore,
        readinessScore: result.readinessScore,
        readinessVerdict: result.readinessVerdict,
        summary: result.summary,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        suggestions: result.suggestions,
        riskNotes: result.riskNotes,
        marketRegimeNotes: result.marketRegimeNotes,
        rawResponse: result,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "ai_analysis_complete",
        title: `AI Analysis Complete: ${strategy.name}`,
        body: `Score: ${result.overallScore}/100 - ${result.readinessVerdict.replace(/_/g, " ")}`,
        strategyId: params.id,
      },
    });

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Error running AI analysis:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run AI analysis" },
      { status: 500 }
    );
  }
}

// GET - get analyses for strategy
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify strategy belongs to user
    const strategy = await prisma.strategy.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const analyses = await prisma.aiAnalysis.findMany({
      where: { strategyId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(analyses);
  } catch (error) {
    console.error("Error fetching analyses:", error);
    return NextResponse.json(
      { error: "Failed to fetch analyses" },
      { status: 500 }
    );
  }
}
