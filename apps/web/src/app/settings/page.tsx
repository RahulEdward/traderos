"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  User,
  Bell,
  CreditCard,
  Key,
  Shield,
  Settings,
  Save,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "account", label: "Account", icon: Shield },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "America/New_York",
  "Europe/London",
  "UTC",
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "profile"
  );
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    timezone: "Asia/Kolkata",
    riskProfile: "Moderate",
  });

  // Notification state
  const [notifications, setNotifications] = useState({
    backtestAnalyzed: true,
    webhookReceived: true,
    taskDueSoon: true,
    weeklyReport: true,
    portfolioAlert: true,
    emailDigest: false,
  });

  // API Keys state
  const [apiKeys, setApiKeys] = useState([
    {
      id: "key-001",
      name: "Development Key",
      key: "toi_dev_sk_abc123...xyz789",
      created: "2025-01-15",
      lastUsed: "2025-02-24",
      permissions: "read",
    },
  ]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Account state
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (session?.user) {
      setProfileData((prev) => ({
        ...prev,
        name: session.user?.name || "",
        email: session.user?.email || "",
      }));
    }
  }, [session]);

  const saveProfile = async () => {
    setSaving(true);
    // In production, call API to save profile
    setTimeout(() => setSaving(false), 1000);
  };

  const copyApiKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F1F5F9]">Settings</h1>
        <p className="text-sm text-[#94A3B8] mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Tab Navigation */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                    activeTab === tab.id
                      ? "bg-[#1E2A45] text-[#3B82F6]"
                      : "text-[#94A3B8] hover:bg-[#0F1629] hover:text-[#F1F5F9]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 max-w-2xl">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-[#F1F5F9] mb-6">Profile</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#94A3B8] mb-1 block">Name</label>
                  <Input
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="bg-[#0A0E1A] border-[#1E2A45]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#94A3B8] mb-1 block">Email</label>
                  <Input
                    value={profileData.email}
                    disabled
                    className="bg-[#0A0E1A] border-[#1E2A45] opacity-60"
                  />
                  <p className="text-xs text-[#475569] mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="text-sm text-[#94A3B8] mb-1 block">Timezone</label>
                  <Select
                    value={profileData.timezone}
                    onValueChange={(v) => setProfileData({ ...profileData, timezone: v })}
                  >
                    <SelectTrigger className="bg-[#0A0E1A] border-[#1E2A45]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-[#94A3B8] mb-1 block">Currency</label>
                  <Input value="INR (₹)" disabled className="bg-[#0A0E1A] border-[#1E2A45] opacity-60" />
                  <p className="text-xs text-[#475569] mt-1">Fixed to Indian Rupee</p>
                </div>
                <div>
                  <label className="text-sm text-[#94A3B8] mb-1 block">Risk Profile</label>
                  <Select
                    value={profileData.riskProfile}
                    onValueChange={(v) => setProfileData({ ...profileData, riskProfile: v })}
                  >
                    <SelectTrigger className="bg-[#0A0E1A] border-[#1E2A45]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Conservative">Conservative</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="Aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="bg-[#3B82F6] hover:bg-[#2563EB]" onClick={saveProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-[#F1F5F9] mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: "backtestAnalyzed", label: "Backtest Analyzed", desc: "When AI analysis is complete" },
                  { key: "webhookReceived", label: "Webhook Received", desc: "When a TradingView alert arrives" },
                  { key: "taskDueSoon", label: "Task Due Soon", desc: "Reminder for upcoming task deadlines" },
                  { key: "weeklyReport", label: "Weekly Report", desc: "Auto-generated weekly performance email" },
                  { key: "portfolioAlert", label: "Portfolio Alert", desc: "When portfolio drawdown exceeds threshold" },
                  { key: "emailDigest", label: "Email Digest", desc: "Daily email summary of all activity" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-[#1E2A45]/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[#F1F5F9]">{item.label}</p>
                      <p className="text-xs text-[#475569]">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key as keyof typeof notifications]}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, [item.key]: checked })
                      }
                    />
                  </div>
                ))}
                <Button className="bg-[#3B82F6] hover:bg-[#2563EB]" onClick={saveProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-6">
                <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Current Plan</h2>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-semibold text-[#F1F5F9]">
                        {(session?.user as any)?.tier || "FREE"}
                      </span>
                      <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]">
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm text-[#94A3B8] mt-1">
                      {(session?.user as any)?.tier === "FREE"
                        ? "Limited to 2 strategies, 5 imports/month"
                        : "Unlimited strategies and imports"}
                    </p>
                  </div>
                  {((session?.user as any)?.tier === "FREE" || !(session?.user as any)?.tier) && (
                    <Button className="bg-[#3B82F6] hover:bg-[#2563EB]">
                      Upgrade to Pro
                    </Button>
                  )}
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="bg-[#0A0E1A] border border-[#1E2A45] rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-[#F1F5F9]">Free</h3>
                    <p className="text-2xl font-bold font-mono text-[#F1F5F9] mt-2">₹0</p>
                    <p className="text-xs text-[#475569] mt-1">Forever</p>
                    <ul className="text-xs text-[#94A3B8] space-y-1 mt-3">
                      <li>2 strategies</li>
                      <li>5 imports/month</li>
                      <li>No AI analysis</li>
                    </ul>
                  </div>
                  <div className="bg-[#0A0E1A] border-2 border-[#3B82F6] rounded-lg p-4 relative">
                    <Badge className="absolute -top-2 right-3 bg-[#3B82F6] text-white text-xs">Popular</Badge>
                    <h3 className="text-sm font-semibold text-[#F1F5F9]">Pro</h3>
                    <p className="text-2xl font-bold font-mono text-[#F1F5F9] mt-2">₹2,999<span className="text-sm font-normal text-[#475569]">/mo</span></p>
                    <p className="text-xs text-[#475569] mt-1">+ 18% GST</p>
                    <ul className="text-xs text-[#94A3B8] space-y-1 mt-3">
                      <li>Unlimited strategies</li>
                      <li>50 AI analyses/month</li>
                      <li>All integrations</li>
                    </ul>
                  </div>
                  <div className="bg-[#0A0E1A] border border-[#8B5CF6] rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-[#F1F5F9]">Agency</h3>
                    <p className="text-2xl font-bold font-mono text-[#F1F5F9] mt-2">₹9,999<span className="text-sm font-normal text-[#475569]">/mo</span></p>
                    <p className="text-xs text-[#475569] mt-1">+ 18% GST</p>
                    <ul className="text-xs text-[#94A3B8] space-y-1 mt-3">
                      <li>Everything in Pro</li>
                      <li>10 sub-accounts</li>
                      <li>Unlimited AI analyses</li>
                      <li>API access</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Billing History */}
              <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-6">
                <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Billing History</h2>
                <p className="text-sm text-[#475569] text-center py-6">No billing history yet</p>
              </div>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === "api-keys" && (
            <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[#F1F5F9]">API Keys</h2>
                <Button variant="outline" size="sm">
                  <Key className="h-4 w-4 mr-2" />
                  Generate New Key
                </Button>
              </div>
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="bg-[#0A0E1A] border border-[#1E2A45] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[#F1F5F9]">{key.name}</span>
                      <Badge variant="secondary" className="text-xs">{key.permissions}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <code className="flex-1 bg-[#080C18] border border-[#1E2A45] rounded px-3 py-2 text-xs text-[#475569] font-mono">
                        {key.key}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyApiKey(key.key, key.id)}
                      >
                        {copiedKey === key.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#475569]">
                      <span>Created: {key.created}</span>
                      <span>Last used: {key.lastUsed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === "account" && (
            <div className="space-y-6">
              {/* Change Password */}
              <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-6">
                <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Change Password</h2>
                <div className="space-y-3 max-w-sm">
                  <div>
                    <label className="text-sm text-[#94A3B8] mb-1 block">Current Password</label>
                    <Input
                      type="password"
                      value={passwordData.current}
                      onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                      className="bg-[#0A0E1A] border-[#1E2A45]"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#94A3B8] mb-1 block">New Password</label>
                    <Input
                      type="password"
                      value={passwordData.new}
                      onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                      className="bg-[#0A0E1A] border-[#1E2A45]"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#94A3B8] mb-1 block">Confirm New Password</label>
                    <Input
                      type="password"
                      value={passwordData.confirm}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                      className="bg-[#0A0E1A] border-[#1E2A45]"
                    />
                  </div>
                  <Button className="bg-[#3B82F6] hover:bg-[#2563EB]">
                    Update Password
                  </Button>
                </div>
              </div>

              {/* Export Data */}
              <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-6">
                <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Export Data</h2>
                <p className="text-sm text-[#94A3B8] mb-4">
                  Download all your data including strategies, backtests, tasks, and settings.
                </p>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export All Data (JSON)
                </Button>
              </div>

              {/* Danger Zone */}
              <div className="bg-[#0F1629] border border-[#EF4444]/30 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-[#EF4444] mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </h2>
                <p className="text-sm text-[#94A3B8] mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0F1629] border-[#1E2A45]">
                    <DialogHeader>
                      <DialogTitle className="text-[#EF4444]">Delete Account</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                      <p className="text-sm text-[#94A3B8] mb-4">
                        This will permanently delete your account and all data. Type <strong className="text-[#EF4444]">DELETE</strong> to confirm.
                      </p>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE"
                        className="bg-[#0A0E1A] border-[#1E2A45] mb-4"
                      />
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={deleteConfirmText !== "DELETE"}
                      >
                        Permanently Delete Account
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
