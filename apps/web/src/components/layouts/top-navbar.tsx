"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
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
  Search,
  Bell,
  LogOut,
  User,
  CreditCard,
  Brain,
  Upload,
  CheckCircle,
  AlertTriangle,
  CheckCheck,
  Sun,
  Moon,
  Landmark,
  Database,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificationStore } from "@/stores/notification-store";
import { MarketStatus } from "@/components/shared/market-status";

// ─── Nav Items ─────────────────────────────────────────────────────
const navItems = [
  { href: "/dashboard", label: "DASHBOARD", icon: LayoutDashboard },
  { href: "/strategies", label: "STRATEGIES", icon: Layers },
  { href: "/portfolios", label: "PORTFOLIOS", icon: Briefcase },
  { href: "/analytics", label: "ANALYTICS", icon: BarChart3 },
  { href: "/live-trading", label: "LIVE TRADING", icon: Activity },
  { href: "/broker", label: "BROKER", icon: Landmark },
  { href: "/tasks", label: "TASKS", icon: CheckSquare },
  { href: "/reports", label: "REPORTS", icon: FileText },
  { href: "/integrations", label: "INTEGRATIONS", icon: Plug },
  { href: "/historify", label: "HISTORIFY", icon: Database },
];

const moreItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
];

const notificationIcons: Record<string, any> = {
  ai_analysis_complete: Brain,
  backtest_imported: Upload,
  task_due_soon: AlertTriangle,
  webhook_received: Layers,
  strategy_created: Layers,
  task_completed: CheckCircle,
};

function useBrokerStatus() {
  const [status, setStatus] = useState<"CONNECTED" | "DISCONNECTED" | null>(null);
  useEffect(() => {
    const run = () =>
      fetch("/api/broker/angelone/auth")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const ao = data?.brokers?.find((b: any) => b.platform === "ANGELONE");
          setStatus(ao ? (ao.status === "CONNECTED" ? "CONNECTED" : "DISCONNECTED") : null);
        })
        .catch(() => {});
    run();
    const id = setInterval(run, 60_000);
    return () => clearInterval(id);
  }, []);
  return status;
}

export function TopNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const {
    notifications,
    unreadCount,
    setNotifications,
    markAllRead: markAllReadLocal,
  } = useNotificationStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const brokerStatus = useBrokerStatus();

  useEffect(() => setMounted(true), []);

  const user = session?.user;
  const tier = (user as any)?.tier || "FREE";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  // ─── Notifications ──────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(
          data.notifications.map((n: any) => ({
            ...n,
            createdAt: new Date(n.createdAt),
          }))
        );
      }
    } catch {
      // silently fail
    }
  }, [setNotifications]);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, session?.user]);

  const handleMarkAllRead = async () => {
    markAllReadLocal();
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch {}
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notification.id }),
      });
    } catch {}
    if (notification.strategyId) {
      router.push(`/strategies/${notification.strategyId}`);
    } else if (notification.portfolioId) {
      router.push(`/portfolios/${notification.portfolioId}`);
    }
    setNotifOpen(false);
    fetchNotifications();
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)]">
        <div className="h-[48px] flex items-center px-4 lg:px-5">
          {/* Left: Logo */}
          <Link
            href="/dashboard"
            className="flex items-baseline gap-0.5 shrink-0 mr-3"
          >
            <span className="text-lg font-bold text-[var(--color-primary)]">Trade</span>
            <span className="text-lg font-bold text-[var(--text-primary)]">OS</span>
            <span className="text-[10px] font-medium text-[#06B6D4] ml-0.5">
              India
            </span>
          </Link>

          {/* Separator */}
          <div className="w-px h-5 bg-[var(--border-color)] mr-2 shrink-0" />

          {/* Center: Nav Links */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide mr-2">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));
              const Icon = item.icon;

              const isBrokerItem = item.href === "/integrations";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold tracking-wider transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-[var(--border-color)] text-[var(--color-primary)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {item.label}
                  {isBrokerItem && brokerStatus && (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        brokerStatus === "CONNECTED"
                          ? "bg-[#10B981]"
                          : "bg-[#EF4444]"
                      )}
                    />
                  )}
                </Link>
              );
            })}

            <div className="w-px h-4 bg-[var(--border-color)] mx-0.5 shrink-0" />

            {moreItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold tracking-wider transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-[var(--border-color)] text-[var(--color-primary)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {item.label.toUpperCase()}
                </Link>
              );
            })}
          </div>

          {/* Right: Market Status + Actions */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {/* Market Status */}
            <div className="hidden lg:block mr-1">
              <MarketStatus />
            </div>

            {/* Search */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--muted)]"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Theme Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--muted)]"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Notifications */}
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[380px] p-0 bg-[var(--bg-card)] border-[var(--border-color)]"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-[#EF4444] text-white px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-[#3B82F6] hover:text-[#2563EB] flex items-center gap-1"
                    >
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                </div>
                <ScrollArea className="max-h-[400px]">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="h-8 w-8 text-[#1A1A1A] mx-auto mb-2" />
                      <p className="text-xs text-[#475569]">
                        No notifications yet
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#1A1A1A]">
                      {notifications.slice(0, 20).map((n: any) => {
                        const Icon = notificationIcons[n.type] || Bell;
                        return (
                          <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={cn(
                              "w-full text-left px-4 py-3 hover:bg-[#050505] transition-colors flex gap-3",
                              !n.read && "bg-[#3B82F6]/5"
                            )}
                          >
                            <div
                              className="p-1.5 rounded-lg shrink-0 mt-0.5"
                              style={{
                                backgroundColor: !n.read
                                  ? "#3B82F620"
                                  : "#1A1A1A20",
                              }}
                            >
                              <Icon
                                className="h-4 w-4"
                                style={{
                                  color: !n.read ? "#3B82F6" : "#475569",
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-sm",
                                  n.read
                                    ? "text-[#94A3B8]"
                                    : "text-[#F1F5F9]"
                                )}
                              >
                                {n.title}
                              </p>
                              {n.body && (
                                <p className="text-xs text-[#475569] truncate mt-0.5">
                                  {n.body}
                                </p>
                              )}
                              <p className="text-[10px] text-[#475569] mt-1">
                                {formatDistanceToNow(new Date(n.createdAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                            {!n.read && (
                              <div className="w-2 h-2 rounded-full bg-[#3B82F6] shrink-0 mt-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* Tier Badge */}
            <span
              className={cn(
                "hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider",
                tier === "FREE" && "bg-[#1A1A1A] text-[#94A3B8]",
                tier === "PRO" &&
                  "bg-gradient-to-r from-blue-600 to-blue-400 text-white",
                tier === "AGENCY" &&
                  "bg-gradient-to-r from-purple-600 to-purple-400 text-white"
              )}
            >
              {tier}
            </span>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full p-0 hover:bg-[var(--bg-card)]"
                >
                  <Avatar className="h-7 w-7 border border-[var(--border-color)]">
                    <AvatarImage src={user?.image || ""} />
                    <AvatarFallback className="text-xs bg-[var(--border-color)] text-[var(--text-secondary)]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[var(--bg-card)] border-[var(--border-color)]"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[var(--border-color)]" />
                <DropdownMenuItem
                  onClick={() => router.push("/settings")}
                  className="gap-2 text-[var(--text-secondary)] focus:text-[var(--text-primary)] focus:bg-[var(--bg-main)]"
                >
                  <User className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/settings")}
                  className="gap-2 text-[var(--text-secondary)] focus:text-[var(--text-primary)] focus:bg-[var(--bg-main)]"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/settings?tab=billing")}
                  className="gap-2 text-[var(--text-secondary)] focus:text-[var(--text-primary)] focus:bg-[var(--bg-main)]"
                >
                  <CreditCard className="h-4 w-4" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--border-color)]" />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="gap-2 text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:bg-[var(--bg-main)]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Spacer for single row */}
      <div className="h-[48px]" />
    </>
  );
}
