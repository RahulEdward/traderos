import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@tradeos/db";
import { decrypt } from "@/lib/crypto";
import { AngelOneAdapter } from "@/lib/brokers/angelone";
import type { Exchange, Resolution } from "@/lib/brokers/types";

// Resolution display labels → Angel One resolution codes
const INTERVAL_TO_RESOLUTION: Record<string, Resolution> = {
  "1MIN": "1",
  "5MIN": "5",
  "15MIN": "15",
  "30MIN": "30",
  "60MIN": "60",
  "DAILY": "1D",
};

async function getAngelCredentials(userId: string) {
  const integration = await prisma.integrationSetting.findUnique({
    where: { userId_platform: { userId, platform: "ANGELONE" } },
  });
  if (
    !integration ||
    integration.status !== "CONNECTED" ||
    !integration.apiKeyEncrypted
  ) {
    return null;
  }
  return {
    apiKey: process.env.ANGELONE_API_KEY || "",
    accessToken: decrypt(integration.apiKeyEncrypted),
  };
}

// Background job processor — runs after response is sent
async function processJob(jobId: string, userId: string, interval: string) {
  const resolution = INTERVAL_TO_RESOLUTION[interval] || "1D";
  const adapter = new AngelOneAdapter();

  try {
    const job = await prisma.dataDownloadJob.findUnique({
      where: { id: jobId },
      include: { items: true },
    });
    if (!job) return;

    // Get fresh credentials
    const credentials = await getAngelCredentials(userId);
    if (!credentials) {
      await prisma.dataDownloadJob.update({
        where: { id: jobId },
        data: { status: "FAILED", errorMessage: "Angel One not connected" },
      });
      return;
    }

    // Mark as running
    await prisma.dataDownloadJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    let completed = 0;
    let failed = 0;

    const fromDate = job.fromDate
      ? job.fromDate.toISOString().split("T")[0]
      : "";
    const toDate = job.toDate ? job.toDate.toISOString().split("T")[0] : "";

    for (const item of job.items) {
      try {
        // Mark item as running
        await prisma.dataDownloadItem.update({
          where: { id: item.id },
          data: { status: "RUNNING" },
        });

        // Fetch historical data from Angel One
        const brokerSymbol = item.symbol.includes("-")
          ? item.symbol
          : item.exchange === "NSE" || item.exchange === "BSE"
            ? `${item.symbol}-EQ`
            : item.symbol;

        const bars = await adapter.getHistoricalData(
          credentials,
          brokerSymbol,
          item.exchange as Exchange,
          resolution,
          fromDate,
          toDate
        );

        if (bars.length === 0) {
          await prisma.dataDownloadItem.update({
            where: { id: item.id },
            data: { status: "COMPLETED", rowCount: 0 },
          });
          completed++;
        } else {
          // Upsert candles into HistoricalCandle table (batch)
          const batchSize = 500;
          let inserted = 0;

          for (let i = 0; i < bars.length; i += batchSize) {
            const batch = bars.slice(i, i + batchSize);
            for (const bar of batch) {
              await prisma.historicalCandle.upsert({
                where: {
                  symbol_exchange_timestamp_interval: {
                    symbol: item.symbol,
                    exchange: item.exchange,
                    timestamp: new Date(bar.timestamp),
                    interval,
                  },
                },
                update: {
                  open: bar.open,
                  high: bar.high,
                  low: bar.low,
                  close: bar.close,
                  volume: bar.volume,
                  oi: bar.oi,
                },
                create: {
                  symbol: item.symbol,
                  exchange: item.exchange,
                  timestamp: new Date(bar.timestamp),
                  interval,
                  open: bar.open,
                  high: bar.high,
                  low: bar.low,
                  close: bar.close,
                  volume: bar.volume,
                  oi: bar.oi,
                },
              });
              inserted++;
            }
          }

          await prisma.dataDownloadItem.update({
            where: { id: item.id },
            data: { status: "COMPLETED", rowCount: inserted },
          });
          completed++;
        }
      } catch (err) {
        await prisma.dataDownloadItem.update({
          where: { id: item.id },
          data: {
            status: "FAILED",
            error: (err as Error).message,
          },
        });
        failed++;
      }

      // Update job progress after each item
      await prisma.dataDownloadJob.update({
        where: { id: jobId },
        data: { completedSymbols: completed, failedSymbols: failed },
      });
    }

    // Mark job done
    await prisma.dataDownloadJob.update({
      where: { id: jobId },
      data: {
        status: failed === job.items.length ? "FAILED" : "COMPLETED",
        completedAt: new Date(),
        completedSymbols: completed,
        failedSymbols: failed,
      },
    });
  } catch (err) {
    console.error("processJob error:", err);
    await prisma.dataDownloadJob
      .update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorMessage: (err as Error).message,
        },
      })
      .catch(() => {});
  }
}

// POST /api/historify/download
// Body: { symbols?, interval, fromDate, toDate }
// If symbols not provided, downloads entire watchlist
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { symbols, interval = "DAILY", fromDate, toDate } = body as {
    symbols?: Array<{ symbol: string; exchange: string }>;
    interval: string;
    fromDate: string;
    toDate: string;
  };

  if (!fromDate || !toDate) {
    return NextResponse.json(
      { error: "fromDate and toDate are required" },
      { status: 400 }
    );
  }

  if (!INTERVAL_TO_RESOLUTION[interval]) {
    return NextResponse.json(
      {
        error: `Invalid interval. Valid: ${Object.keys(INTERVAL_TO_RESOLUTION).join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Resolve symbol list
  let downloadSymbols = symbols;
  if (!downloadSymbols || downloadSymbols.length === 0) {
    const watchlist = await prisma.watchlist.findMany({
      where: { userId: session.user.id, isActive: true },
    });
    downloadSymbols = watchlist.map((w) => ({
      symbol: w.symbol,
      exchange: w.exchange,
    }));
  }

  if (downloadSymbols.length === 0) {
    return NextResponse.json(
      { error: "No symbols to download. Add symbols to watchlist first." },
      { status: 400 }
    );
  }

  // Verify Angel One is connected
  const credentials = await getAngelCredentials(session.user.id);
  if (!credentials) {
    return NextResponse.json(
      {
        error:
          "Angel One broker is not connected. Please connect from Integrations.",
      },
      { status: 400 }
    );
  }

  // Create job
  const job = await prisma.dataDownloadJob.create({
    data: {
      userId: session.user.id,
      status: "PENDING",
      totalSymbols: downloadSymbols.length,
      completedSymbols: 0,
      failedSymbols: 0,
      interval,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      items: {
        create: downloadSymbols.map((s) => ({
          symbol: s.symbol.toUpperCase(),
          exchange: s.exchange.toUpperCase(),
          status: "PENDING",
          rowCount: 0,
        })),
      },
    },
    include: { items: true },
  });

  // Fire-and-forget background processing
  processJob(job.id, session.user.id, interval).catch((err) =>
    console.error("Background download error:", err)
  );

  return NextResponse.json({
    jobId: job.id,
    status: "RUNNING",
    totalSymbols: job.totalSymbols,
    message: `Download started for ${job.totalSymbols} symbol(s)`,
  });
}
