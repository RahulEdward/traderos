"use client";

import { TopNavbar } from "./top-navbar";
import { SessionProvider } from "@/components/shared/session-provider";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#000000]">
      <TopNavbar />
      <main className="min-h-[calc(100vh-48px)]">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </SessionProvider>
  );
}
