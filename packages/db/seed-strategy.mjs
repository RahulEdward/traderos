import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'test@tradeos.in' },
    });

    if (!user) {
        console.log('Error: Test user not found. Run seed-user.mjs first.');
        return;
    }

    // Delete existing strategy
    await prisma.strategy.deleteMany({
        where: {
            userId: user.id,
            name: 'Omni Test Strategy'
        }
    });

    console.log('Creating FULL Test Strategy for all features...');

    const strategy = await prisma.strategy.create({
        data: {
            userId: user.id,
            name: 'Omni Test Strategy',
            description: 'A comprehensive strategy designed to test all features of TradeOS India, including backtesting metrics, AI analysis, and live trading components.',
            market: 'NSE_EQUITY',
            instrument: 'RELIANCE',
            timeframe: '15m',
            entryLogic: 'RSI(14) < 30 AND MACD > Signal',
            exitLogic: 'Trailing Stop 2% OR RSI(14) > 70',
            status: 'BACKTESTING',
            tags: '["mean-reversion", "large-cap", "test"]',
            version: 1,
        },
    });

    console.log('Strategy ID created:', strategy.id);

    console.log('Adding Backtest Results with AFML metrics...');
    const backtestResult = await prisma.backtestResult.create({
        data: {
            strategyId: strategy.id,
            versionNumber: 1,
            sourcePlatform: 'AMIBROKER',
            totalTrades: 200,
            winRate: 55.5,
            profitFactor: 1.85,
            netProfit: 154000.50,
            maxDrawdown: 12500.00,
            maxDrawdownPct: 15.2,
            sharpeRatio: 1.45,
            sortinoRatio: 2.1,
            calmarRatio: 1.2,
            expectancy: 450.20,
            avgWin: 2100.00,
            avgLoss: 1500.00,
            bestTrade: 8500.00,
            worstTrade: -3000.00,
            recoveryFactor: 3.5,
            psr: 0.95,
            dsr: 0.88,
            hhiPositive: 0.12,
            hhiNegative: 0.08,
            hhiTime: 0.05,
            drawdown95: 14000.00,
            tuw95: 45.5,
            strategyRisk: 0.15,
            impliedPrecision: 0.65,
            frequencyOfBets: 0.8,
            ratioOfLongs: 0.6,
            startDate: new Date('2023-01-01'),
            endDate: new Date('2023-12-31'),
            notes: 'Test backtest generated for UI validation.',
        },
    });

    console.log('Generating 200 Sample Trades...');

    const initialPrice = 2500;
    const trades = [];
    let currentEquity = 10000;
    let maxEquity = currentEquity;

    let currentDate = new Date('2023-01-01T09:15:00Z');

    for (let i = 1; i <= 200; i++) {
        // Advance time by 1-3 days randomly
        const daysToAdvance = Math.floor(Math.random() * 3) + 1;
        currentDate.setDate(currentDate.getDate() + daysToAdvance);

        // Skip weekends
        while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Determine win/loss based on 55% win rate
        const isWin = Math.random() < 0.55;

        // Profit logic (with a drift upwards simulating the profit factor)
        // Average win = 2100, Average loss = 1500
        const profitLoss = isWin
            ? Math.random() * 1500 + 1000  // Win between 1000 and 2500
            : -(Math.random() * 1000 + 800); // Loss between -800 and -1800

        currentEquity += profitLoss;
        if (currentEquity > maxEquity) maxEquity = currentEquity;

        const entryPrice = initialPrice + (Math.random() * 200 - 100);
        const exitPrice = entryPrice + (profitLoss / 100);

        trades.push({
            backtestResultId: backtestResult.id,
            tradeNumber: i,
            entryDate: new Date(currentDate),
            exitDate: new Date(currentDate.getTime() + 1000 * 60 * 60 * 4), // Exit 4 hours later
            direction: Math.random() > 0.5 ? 'LONG' : 'SHORT',
            entryPrice: Number(entryPrice.toFixed(2)),
            exitPrice: Number(exitPrice.toFixed(2)),
            profitLoss: Number(profitLoss.toFixed(2)),
            profitLossPct: Number((profitLoss / currentEquity * 100).toFixed(2)),
            holdingPeriod: 4,
            symbol: 'RELIANCE',
        });
    }

    await prisma.trade.createMany({ data: trades });

    console.log('Adding AI Analysis...');
    await prisma.aiAnalysis.create({
        data: {
            strategyId: strategy.id,
            backtestResultId: backtestResult.id,
            overallScore: 85,
            readinessScore: 78,
            readinessVerdict: 'PAPER_TRADE_READY',
            summary: 'This mean-reversion strategy on RELIANCE shows solid historical performance with a balanced risk-reward profile. The execution logic is clear, but drawdown duration could be improved.',
            strengths: '["High profit factor", "Consistent equity curve", "Robust against recent market regimes"]',
            weaknesses: '["Slightly high max drawdown percentage", "Dependent on specific intraday volatility"]',
            suggestions: '["Implement a time-based stop loss", "Test on other large-cap stocks like HDFC Bank"]',
            riskNotes: 'Overall strategy risk is acceptable, but ensure position sizing does not exceed 2% per trade.',
        }
    });

    console.log('Adding to a Test Portfolio...');
    const portfolio = await prisma.portfolio.create({
        data: {
            userId: user.id,
            name: 'Alpha Portfolio',
            description: 'Test portfolio for aggregating multiple strategies.',
            status: 'ACTIVE',
        }
    });

    await prisma.portfolioStrategy.create({
        data: {
            portfolioId: portfolio.id,
            strategyId: strategy.id,
            capitalAllocationPct: 100.0,
        }
    });

    console.log('Strategy and all related test data successfully created!');
}

main()
    .catch((e) => {
        console.error('ERROR:', e.message);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
