"use client";

import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/components/shared/session-provider";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { isCollapsed, setCollapsed, isMobileOpen, setMobileOpen } =
    useSidebarStore();

  // Auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setCollapsed]);

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar />
      <Header />

      <main
        className={cn(
          "pt-[60px] min-h-screen transition-all duration-300",
          isCollapsed ? "ml-[60px]" : "ml-[240px]"
        )}
      >
        <div className="p-8">{children}</div>
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
