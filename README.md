# TradeOS India

The Operating System for Indian Breakout Traders. A full-stack SaaS platform for managing trading strategies, backtesting with AFML methods, AI-powered analysis, portfolio management, and live trading integrations.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Next.js API Routes + Express.js with Socket.io
- **Database**: Prisma ORM (SQLite for dev, PostgreSQL for production)
- **Auth**: NextAuth v5 (JWT strategy) with Google OAuth + Credentials
- **AI**: Anthropic Claude API for strategy analysis
- **Payments**: PayU integration for INR subscriptions
- **Broker**: Fyers API integration for live trading

## Monorepo Structure

```
tradeos-india/
  apps/
    web/          # Next.js 14 frontend + API routes (port 3001)
    api/          # Express.js backend with Socket.io (port 4000)
  packages/
    db/           # Prisma schema, client, migrations
    shared/       # Shared constants, types, utilities
```

## Features

### Strategy Manager
- Create and manage trading strategies with entry/exit logic
- Tag-based organization, status tracking (Idea > Backtesting > Live > Archived)
- Version history and strategy notes

### Backtesting Engine
- CSV trade import with auto column mapping
- Performance metrics: Win Rate, Profit Factor, Sharpe, Sortino, Calmar, Max Drawdown, Expectancy
- Interactive charts: Equity Curve, Drawdown, Monthly P&L Heatmap
- **AFML Advanced Analysis** (Advances in Financial Machine Learning, Ch.12):
  - Walk-Forward Analysis
  - Purged K-Fold Cross-Validation
  - CPCV (Combinatorial Purged Cross-Validation)
  - Synthetic Data Generation (Ornstein-Uhlenbeck process)
  - PSR/DSR (Probabilistic/Deflated Sharpe Ratio)
  - HHI concentration analysis

### AI Analysis
- Claude-powered strategy evaluation
- Strengths, weaknesses, and improvement suggestions
- Interactive chat for strategy Q&A

### Portfolio Manager
- Multi-strategy portfolios with correlation analysis
- Allocation optimization and risk metrics

### Live Trading
- Fyers broker integration with encrypted credential storage (AES-256-GCM)
- Real-time market data via WebSocket
- Order placement and position tracking

### Analytics Dashboard
- Cross-strategy performance comparison
- Win rate trends, P&L distribution, monthly breakdown
- Sector and timeframe analysis

### Subscription Tiers
- **Free**: 3 strategies, 5 imports/month
- **Pro**: Unlimited strategies, AI analysis, portfolios, integrations
- **Agency**: Multi-account support, API access, webhook integrations

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm 9.x

### Installation

```bash
# Clone the repository
git clone https://github.com/RahulEdward/traderos.git
cd tradeos-india

# Install dependencies
pnpm install

# Copy environment variables
cp apps/web/.env.example apps/web/.env

# Generate Prisma client
pnpm db:generate

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env` in `apps/web/` and configure:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Database connection string |
| `NEXTAUTH_SECRET` | Yes | 32-char random secret for JWT |
| `NEXTAUTH_URL` | Yes | App URL (http://localhost:3001) |
| `ENCRYPTION_KEY` | Yes | 32-char key for AES-256-GCM |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `ANTHROPIC_API_KEY` | No | Claude API key for AI analysis |
| `RESEND_API_KEY` | No | Resend.com for transactional emails |
| `PAYU_MERCHANT_KEY` | No | PayU payment gateway key |
| `PAYU_MERCHANT_SALT` | No | PayU payment gateway salt |
| `FYERS_API_KEY` | No | Fyers broker API key |
| `FYERS_API_SECRET` | No | Fyers broker API secret |
| `AWS_ACCESS_KEY_ID` | No | S3 for file storage |

### Scripts

```bash
pnpm dev          # Start web + API dev servers
pnpm build        # Build for production
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Prisma Studio
pnpm lint         # Run ESLint
```

## Design System

- **Background**: #0A0E1A | **Cards**: #0F1629 | **Border**: #1E2A45
- **Primary**: #3B82F6 | **Cyan**: #06B6D4 | **Green**: #10B981
- **Amber**: #F59E0B | **Red**: #EF4444
- **Fonts**: Inter (UI), JetBrains Mono (numbers/code)
- **Currency**: INR with `Intl.NumberFormat('en-IN')`

## License

Private - All rights reserved.
