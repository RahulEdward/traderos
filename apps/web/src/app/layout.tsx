import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/shared/query-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const baseUrl = process.env.NEXTAUTH_URL || "https://tradeosindia.com";

export const metadata: Metadata = {
  title: {
    default: "TradeOS India - The Operating System for Indian Breakout Traders",
    template: "%s | TradeOS India",
  },
  description:
    "Build, analyze, improve, and manage your breakout strategies for Indian stock markets (NSE/BSE). AI-powered strategy analysis, backtest imports, portfolio management.",
  keywords: [
    "trading",
    "NSE",
    "BSE",
    "breakout trading",
    "strategy management",
    "backtesting",
    "Indian stocks",
    "TradingView",
    "Amibroker",
    "algorithmic trading",
    "Nifty",
    "Bank Nifty",
  ],
  metadataBase: new URL(baseUrl),
  openGraph: {
    title: "TradeOS India - The Operating System for Indian Breakout Traders",
    description:
      "Build, analyze, improve, and manage your breakout strategies for Indian stock markets (NSE/BSE).",
    url: baseUrl,
    siteName: "TradeOS India",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeOS India - The Operating System for Indian Breakout Traders",
    description:
      "Build, analyze, improve, and manage your breakout strategies for Indian stock markets (NSE/BSE).",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <QueryProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#0A0A0A",
                border: "1px solid #1A1A1A",
                color: "#F1F5F9",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
