"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  Bell,
  LogOut,
  User,
  Settings,
  CreditCard,
  Brain,
  Upload,
  CheckCircle,
  AlertTriangle,
  Layers,
  CheckCheck,
} from "lucide-react";
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
import { useSidebarStore } from "@/stores/sidebar-store";
import { useNotificationStore } from "@/stores/notification-store";
import { MarketStatus } from "@/components/shared/market-status";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/strategies": "Strategies",
  "/portfolios": "Portfolios",
  "/analytics": "Analytics",
  "/live-trading": "Live Trading",
  "/integrations": "Integrations",
  "/reports": "Reports",
  "/tasks": "Tasks",
  "/settings": "Settings",
};

const notificationIcons: Record<string, any> = {
  ai_analysis_complete: Brain,
  backtest_imported: Upload,
  task_due_soon: AlertTriangle,
  webhook_received: Layers,
  strategy_created: Layers,
  task_completed: CheckCircle,
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { isCollapsed } = useSidebarStore();
  const {
    notifications,
    unreadCount,
    setNotifications,
    markAllRead: markAllReadLocal,
  } = useNotificationStore();
  const [notifOpen, setNotifOpen] = useState(false);

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  const currentRoute = Object.keys(routeLabels).find(
    (key) => pathname === key || pathname.startsWith(key + "/")
  );
  const breadcrumb = currentRoute ? routeLabels[currentRoute] : "Dashboard";

  // Fetch notifications on mount and periodically
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
    } catch {
      // silently fail
    }
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
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-[60px] border-b border-[#1A1A1A] bg-[#050505] flex items-center justify-between px-6 transition-all duration-300",
        isCollapsed ? "left-[60px]" : "left-[240px]"
      )}
    >
      {/* Breadcrumb + Market Status */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-[#94A3B8]">{breadcrumb}</span>
        <MarketStatus />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <Button variant="ghost" size="icon" className="text-[#94A3B8]">
          <Search className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-[#94A3B8]">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[#EF4444] animate-pulse" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[380px] p-0 bg-[#0A0A0A] border-[#1A1A1A]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A1A]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#F1F5F9]">
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
                  <p className="text-xs text-[#475569]">No notifications yet</p>
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
                          style={{ backgroundColor: !n.read ? "#3B82F620" : "#1A1A1A20" }}
                        >
                          <Icon
                            className="h-4 w-4"
                            style={{ color: !n.read ? "#3B82F6" : "#475569" }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm", n.read ? "text-[#94A3B8]" : "text-[#F1F5F9]")}>
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-[#475569] truncate mt-0.5">
                              {n.body}
                            </p>
                          )}
                          <p className="text-[10px] text-[#475569] mt-1">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
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

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image || ""} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-[#F1F5F9]">
                  {user?.name}
                </p>
                <p className="text-xs text-[#94A3B8]">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings?tab=billing")}>
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="text-[#EF4444] focus:text-[#EF4444]"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
