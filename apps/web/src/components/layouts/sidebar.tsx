"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Layers,
  Briefcase,
  BarChart3,
  Activity,
  Plug,
  FileText,
  CheckSquare,
  Settings,
  HelpCircle,
  Menu,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/strategies", label: "Strategies", icon: Layers },
  { href: "/portfolios", label: "Portfolios", icon: Briefcase },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/live-trading", label: "Live Trading", icon: Activity },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
];

function useBrokerStatus() {
  const [status, setStatus] = useState<"CONNECTED" | "DISCONNECTED" | null>(null);

  useEffect(() => {
    const fetchStatus = () =>
      fetch("/api/broker/angelone/auth")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const ao = data?.brokers?.find((b: any) => b.platform === "ANGELONE");
          setStatus(ao ? (ao.status === "CONNECTED" ? "CONNECTED" : "DISCONNECTED") : null);
        })
        .catch(() => {});

    fetchStatus();
    const id = setInterval(fetchStatus, 60_000);
    return () => clearInterval(id);
  }, []);

  return status;
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const brokerStatus = useBrokerStatus();

  const user = session?.user;
  const tier = (user as any)?.tier || "FREE";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-[#1A1A1A] bg-[#050505] transition-all duration-300 flex flex-col",
          isCollapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        {/* Logo & Collapse */}
        <div
          className={cn(
            "flex items-center border-b border-[#1A1A1A] h-[60px] px-4",
            isCollapsed ? "justify-center" : "justify-between"
          )}
        >
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-baseline gap-0.5">
              <span className="text-xl font-bold text-[#3B82F6]">TradeOS</span>
              <span className="text-sm font-medium text-[#06B6D4]">India</span>
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-[#0A0A0A] text-white hover:text-white transition-colors"
          >
            {isCollapsed ? (
              <Menu className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));
              const Icon = item.icon;

              const isBrokerItem = item.href === "/integrations";
            const dotColor =
              brokerStatus === "CONNECTED" ? "bg-[#10B981]" : "bg-[#EF4444]";

            const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#1A1A1A] text-[#3B82F6]"
                      : "text-white hover:bg-[#0A0A0A] hover:text-white",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  {/* Icon — with dot badge in collapsed mode */}
                  <div className="relative shrink-0">
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        isActive ? "text-[#3B82F6]" : "text-white"
                      )}
                    />
                    {isBrokerItem && brokerStatus && isCollapsed && (
                      <span
                        className={cn(
                          "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#050505]",
                          dotColor
                        )}
                      />
                    )}
                  </div>
                  {!isCollapsed && <span>{item.label}</span>}
                  {/* Dot at end of row in expanded mode */}
                  {isBrokerItem && brokerStatus && !isCollapsed && (
                    <span
                      className={cn("ml-auto h-2 w-2 rounded-full shrink-0", dotColor)}
                    />
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-[#1A1A1A] py-4 px-2 space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white hover:bg-[#0A0A0A] hover:text-white transition-colors",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-5 w-5 shrink-0 text-white" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );

            return isCollapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              <div key={item.href}>{linkContent}</div>
            );
          })}

          {/* User */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 mt-2",
              isCollapsed && "justify-center px-0"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.image || ""} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F1F5F9] truncate">
                  {user?.name || "User"}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                    tier === "FREE" && "bg-gray-700/50 text-gray-300",
                    tier === "PRO" &&
                      "bg-gradient-to-r from-blue-600 to-blue-400 text-white",
                    tier === "AGENCY" &&
                      "bg-gradient-to-r from-purple-600 to-purple-400 text-white"
                  )}
                >
                  {tier}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
