import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@tradeos/db";
import Anthropic from "@anthropic-ai/sdk";
import { parseJsonArray } from "@/lib/db-utils";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// POST - chat with AI about strategy
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const strategy = await prisma.strategy.findFirst({
      where: { id: params.id, userId: session.user.id },
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

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    const latestBacktest = strategy.backtestResults[0];
    const latestAnalysis = strategy.aiAnalyses[0];

    const systemMessage = `You are a trading strategy advisor for Indian markets (NSE/BSE). You are helping a trader understand and improve their strategy.

Strategy Context:
- Name: ${strategy.name}
${strategy.description ? `- Description: ${strategy.description}` : ""}
${strategy.market ? `- Market: ${strategy.market}` : ""}
${strategy.timeframe ? `- Timeframe: ${strategy.timeframe}` : ""}
${strategy.entryLogic ? `- Entry Logic: ${strategy.entryLogic}` : ""}
${strategy.exitLogic ? `- Exit Logic: ${strategy.exitLogic}` : ""}
${latestBacktest ? `
Backtest Results:
- Total Trades: ${latestBacktest.totalTrades}
- Win Rate: ${latestBacktest.winRate}%
- Profit Factor: ${latestBacktest.profitFactor}
- Net Profit: ₹${latestBacktest.netProfit.toLocaleString("en-IN")}
- Max Drawdown: ${latestBacktest.maxDrawdownPct}%
- Sharpe Ratio: ${latestBacktest.sharpeRatio}
- Sortino Ratio: ${latestBacktest.sortinoRatio}
- Expectancy: ₹${latestBacktest.expectancy.toLocaleString("en-IN")}
` : "No backtest data available."}
${latestAnalysis ? `
AI Analysis (Score: ${latestAnalysis.overallScore}/100, Verdict: ${latestAnalysis.readinessVerdict}):
${latestAnalysis.summary}
Strengths: ${parseJsonArray(latestAnalysis.strengths).join(", ")}
Weaknesses: ${parseJsonArray(latestAnalysis.weaknesses).join(", ")}
` : ""}

Be concise, specific to Indian markets, and actionable. Use INR for monetary values. Keep responses focused and under 300 words.`;

    const messages = [
      ...(Array.isArray(history) ? history : []).map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemMessage,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const reply = textBlock && textBlock.type === "text"
      ? textBlock.text
      : "Sorry, I could not generate a response.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Error in AI chat:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get AI response" },
      { status: 500 }
    );
  }
}
