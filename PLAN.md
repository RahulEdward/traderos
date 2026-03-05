# TradeOS India - Robust Backtesting System Implementation Plan

## Vision
Transform TradeOS India from a "breakout-only" trading app into a **general-purpose robust backtesting platform** for Indian markets, based on AFML (Marcos Lopez de Prado) Part 3 principles.

---

## Phase A: Foundation (Rebrand + Historical Data Layer)

### A1. Remove all "breakout" branding
- **Landing page** (`components/landing/landing-page.tsx`): Change copy from "breakout traders" → "systematic traders / algo traders"
- **Dashboard** (`app/dashboard/page.tsx`): Update card descriptions
- **Mock data** (`lib/mock-data.ts`): Rename strategies (e.g., "Nifty 50 Breakout" → "Nifty 50 Momentum", "HDFC Bank Range Breakout" → "HDFC Bank ORB Strategy")
- **Shared constants** (`packages/shared/src/constants.ts`): Update any breakout-specific text
- **Help page** (`app/help/page.tsx`): Update FAQ content

### A2. Prisma Schema - Add Historical Data Models
New models in `packages/db/prisma/schema.prisma`:

```
Watchlist         - symbol, exchange, instrumentType, expiry, strike, lotSize, tickSize, status
HistoricalCandle  - symbol, exchange, timestamp, open, high, low, close, volume, oi, interval (1m/D)
DataDownloadJob   - status, totalSymbols, completedSymbols, failedSymbols, startedAt, completedAt
```

### A3. Historical Data Fetching Service
New files:
- `lib/data/historical-service.ts` - Core service: fetch from Fyers API, chunk by date ranges (60 days intraday, 300 days daily), transform & store
- `lib/data/candle-utils.ts` - Resample 1m → 5m/15m/30m/1h, OHLCV aggregation
- `lib/data/mock-historical.ts` - Generate synthetic OHLCV for demo mode (random walk + drift)
- `app/api/data/historical/route.ts` - GET (query candles), POST (trigger download)
- `app/api/data/watchlist/route.ts` - CRUD for symbol watchlist
- `app/api/data/download/route.ts` - POST (bulk download job), GET (job status)

### A4. Data Management UI
New page: `app/data/page.tsx`
- Watchlist manager (add symbols, bulk import)
- Download controls (single/batch, date range, interval)
- Data catalog (what's downloaded, date ranges, row counts)
- Export to CSV button

---

## Phase B: Backtesting Engine (Core)

### B1. Backtest Engine Service
New files:
- `lib/backtest/engine.ts` - Core engine: takes strategy rules + OHLCV data → simulates trades
- `lib/backtest/walk-forward.ts` - Walk-Forward method: train on trailing window, test forward
- `lib/backtest/cross-validation.ts` - Purged K-Fold CV: train on k-1 folds, test on 1 fold (with purging + embargo)
- `lib/backtest/cpcv.ts` - Combinatorial Purged CV: N groups, k test groups → phi paths → Sharpe distribution
- `lib/backtest/synthetic.ts` - O-U process generator: estimate {sigma, phi} from data, generate 100K+ synthetic paths
- `lib/backtest/types.ts` - Shared types for all backtest methods

### B2. Bet Sizing Module
New files:
- `lib/backtest/bet-sizing.ts` - Functions:
  - `betSizeFromProbability(p, numClasses)` → m ∈ [-1, 1]
  - `averageActiveBets(signals, holdingPeriods)` → averaged positions
  - `discretizeBetSize(m, stepSize)` → discretized size
  - `dynamicPositionSize(forecast, currentPrice, maxPosition, omega)` → target position + limit price

### B3. Statistics Calculator
New files:
- `lib/backtest/statistics.ts` - Full AFML stats suite:
  - **General**: time range, avg AUM, leverage, frequency of bets, avg holding period, turnover
  - **Performance**: PnL, hit ratio, avg win/loss
  - **Runs**: HHI concentration (positive/negative/time), drawdown series, TuW series, 95th percentile DD/TuW
  - **Efficiency**: Sharpe ratio, **PSR** (Probabilistic SR), **DSR** (Deflated SR), Information ratio, Sortino, Calmar
  - **Classification**: Accuracy, Precision, Recall, F1, Neg log-loss (for meta-labeling)
  - **Strategy Risk**: P[strategy failure], implied precision, implied frequency

### B4. Backtest API Routes
- `app/api/backtest/run/route.ts` - POST: Run backtest (WF/CV/CPCV/Synthetic)
- `app/api/backtest/results/route.ts` - GET: List all backtest results for a strategy
- `app/api/backtest/results/[id]/route.ts` - GET: Detailed result with all stats
- `app/api/backtest/compare/route.ts` - POST: Compare multiple backtests side-by-side

### B5. Backtest UI
Enhance `app/strategies/[id]/page.tsx` with new tabs:
- **Run Backtest tab**: Select method (WF/CV/CPCV), configure parameters, run
- **Results tab** (enhanced): Show full AFML stats, CPCV path distribution chart, synthetic data results
- **Compare tab**: Side-by-side comparison of backtest results

New components:
- `components/backtest/backtest-runner.tsx` - Method selector + parameter config + run button
- `components/backtest/cpcv-paths-chart.tsx` - Sharpe ratio distribution across CPCV paths
- `components/backtest/strategy-risk-panel.tsx` - P[failure] gauge, precision-frequency heatmap
- `components/backtest/statistics-grid.tsx` - Full stats display (PSR, DSR, HHI, DD, etc.)
- `components/backtest/synthetic-results.tsx` - OTR results, synthetic path visualization

---

## Phase C: Fyers Broker Upgrade

### C1. Upgrade Fyers Integration (based on OpenAlgo patterns)
Modify existing files:
- `lib/brokers/fyers/client.ts` - Add: chunked historical data fetching (60d intraday / 300d daily), multi-quote batching (50 symbols, 0.1s delay), rate limiting
- `lib/brokers/fyers/adapter.ts` - Add: SHA-256 auth hash, proper error handling, connection pooling
- `lib/brokers/fyers/config.ts` - Add: chunk size configs, timeframe mapping (5S→4H+D), candle format detection (with/without OI)

New files:
- `lib/brokers/fyers/symbol-db.ts` - Master contract database: download NSE/BSE/NFO/MCX contracts, store in Prisma, symbol lookup/search
- `lib/brokers/fyers/streaming.ts` - WebSocket client for real-time quotes (HSM protocol)
- `app/api/broker/fyers/symbols/route.ts` - GET: Search symbols, POST: Sync master contracts
- `app/api/broker/fyers/history/route.ts` - GET: Fetch historical candles with auto-chunking

### C2. API Key Encryption (TODO from last session)
- `lib/crypto.ts` - AES-256-GCM encryption/decryption for broker API keys
- Update `IntegrationSetting` model to use encrypted storage

---

## Phase D: Enhanced Analytics & Reports

### D1. Analytics Dashboard Upgrade
Modify `app/analytics/page.tsx`:
- Add PSR/DSR display with interpretation
- HHI concentration gauges (positive/negative/time)
- Strategy risk meter (P[failure])
- Monthly returns heatmap (enhanced with HHI overlay)
- Drawdown chart with 95th percentile line
- Time Under Water chart

### D2. Reports Enhancement
Modify `app/reports/page.tsx`:
- Add AFML-compliant report template
- Include: all 7 stat categories, CPCV results, strategy risk assessment
- PDF export with charts

---

## Phase E: HRP Portfolio Allocation

### E1. HRP Algorithm
New files:
- `lib/portfolio/hrp.ts` - Full HRP implementation:
  - Stage 1: Tree clustering (correlation distance → Euclidean distance of distances → hierarchical clustering)
  - Stage 2: Quasi-diagonalization (reorder covariance matrix)
  - Stage 3: Recursive bisection (inverse-variance weighted allocation)
- `lib/portfolio/covariance.ts` - Covariance matrix estimation, condition number calculation
- `lib/portfolio/monte-carlo.ts` - OOS Monte Carlo validation (HRP vs IVP vs equal-weight)

### E2. Portfolio Page Enhancement
Modify `app/portfolios/[id]/page.tsx`:
- Add "Auto-Allocate (HRP)" button
- Show dendrogram visualization
- Clustered correlation matrix heatmap
- HRP vs IVP vs Equal-Weight comparison table
- Monte Carlo OOS variance comparison

---

## Implementation Order & Priority

| # | Task | Priority | Est. Files | Dependencies |
|---|------|----------|-----------|-------------|
| 1 | A1: Rebrand (remove breakout) | P0 | ~6 files | None |
| 2 | A2: Schema changes | P0 | 1 file | None |
| 3 | B3: Statistics calculator | P0 | 1 file | None |
| 4 | B1: Backtest engine (WF) | P0 | 2 files | A2 |
| 5 | A3: Historical data service | P0 | 4 files | A2 |
| 6 | A4: Data management UI | P0 | 1 page | A3 |
| 7 | B1: CV + CPCV engine | P1 | 2 files | B1(WF) |
| 8 | B2: Bet sizing | P1 | 1 file | None |
| 9 | B4: Backtest API routes | P1 | 4 routes | B1, B3 |
| 10 | B5: Backtest UI | P1 | 5 components | B4 |
| 11 | B1: Synthetic data engine | P1 | 1 file | B3 |
| 12 | C1: Fyers upgrade | P1 | 4 files | A3 |
| 13 | C2: API key encryption | P1 | 1 file | None |
| 14 | D1: Analytics upgrade | P2 | 1 page | B3 |
| 15 | D2: Reports upgrade | P2 | 1 page | B3 |
| 16 | E1: HRP algorithm | P2 | 3 files | None |
| 17 | E2: Portfolio enhancement | P2 | 1 page | E1 |

**Total: ~35 files to create/modify**

---

## Demo Mode Strategy
All new features work in DEMO_MODE:
- Mock historical data: Generated synthetic OHLCV (Nifty, BankNifty, Reliance, etc.)
- Mock backtest results: Pre-computed WF/CV/CPCV results with realistic stats
- Mock HRP allocations: Pre-computed dendrogram and allocation weights
- No real broker connection needed

---

## Key Design Decisions

1. **All math in TypeScript** - No Python dependency. Backtest engine, statistics, HRP all in TS.
2. **Prisma + PostgreSQL** for data storage (not DuckDB as in Historify PRD).
3. **Incremental build** - Each phase builds on previous, nothing breaks existing features.
4. **Mock-first** - Every feature works in demo mode before real integration.
5. **Indian market focus** - NSE/BSE symbols, INR currency, IST timezone, Indian holidays.
