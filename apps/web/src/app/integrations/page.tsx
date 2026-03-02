"use client";

import { useState, useEffect } from "react";
import {
  Link2,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Send,
  Download,
  RefreshCw,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  KeyRound,
  User,
  Shield,
  ChevronDown,
  Unplug,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";

interface Webhook {
  id: string;
  webhookKey: string;
  name: string;
  strategyId: string;
  createdAt: string;
  lastTriggeredAt: string | null;
  totalTriggers: number;
  strategy: { id: string; name: string };
}

interface WebhookLog {
  id: string;
  webhookId: string;
  receivedAt: string;
  payload: any;
  status: "SUCCESS" | "FAILED";
  errorMessage: string | null;
}

interface SavedBroker {
  platform: string;
  status: "SAVED" | "CONNECTED" | "DISCONNECTED";
  clientCode: string;
  lastSyncAt: string | null;
  connected: boolean;
  hasSavedCredentials: boolean;
}

// ─── TOTP Dialog ───────────────────────────────────────────────────
function TotpDialog({
  broker,
  clientCode,
  open,
  onOpenChange,
  onConnected,
}: {
  broker: SavedBroker;
  clientCode: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConnected: () => void;
}) {
  const [totp, setTotp] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    if (totp.length !== 6) return;
    setConnecting(true);
    setError("");
    try {
      const res = await fetch("/api/broker/angelone/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", totp }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTotp("");
        onOpenChange(false);
        onConnected();
      } else {
        setError(data.error || "Connection failed. Check your TOTP and try again.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setTotp(""); setError(""); } onOpenChange(v); }}>
      <DialogContent className="bg-[var(--bg-card)] border-[var(--border-color)] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
            <div className="w-8 h-8 bg-[#e85d04]/10 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-[#e85d04]">A</span>
            </div>
            Connect Angel One
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {/* Account info */}
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span className="text-[var(--text-secondary)]">Client Code:</span>
              <span className="text-[var(--text-primary)] font-mono font-medium">{clientCode}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1.5 block flex items-center gap-1">
                <Shield className="h-3 w-3" />
                TOTP Code
                <span className="text-[var(--text-muted)] ml-1">— from Google Authenticator</span>
              </label>
              <Input
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit TOTP"
                maxLength={6}
                className="bg-[var(--bg-main)] border-[var(--border-color)] text-center text-2xl font-mono tracking-[0.5em] h-12"
                onKeyDown={(e) => e.key === "Enter" && totp.length === 6 && handleConnect()}
                autoFocus
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                TOTP expires every 30 seconds. Enter quickly after generating.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg p-3">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <Button
              className="w-full bg-[#e85d04] hover:bg-[#e85d04]/90 h-10"
              onClick={handleConnect}
              disabled={connecting || totp.length !== 6}
            >
              {connecting ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
              ) : (
                <><Link2 className="h-4 w-4 mr-2" /> Connect Angel One</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Saved Brokers Section ─────────────────────────────────────────
function SavedBrokersSection({
  brokers,
  onRefresh,
}: {
  brokers: SavedBroker[];
  onRefresh: () => void;
}) {
  const [totpOpen, setTotpOpen] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const activeBroker = brokers.find((b) => b.platform === (totpOpen || ""));

  const handleDisconnect = async (platform: string, full = false) => {
    setDisconnecting(platform);
    try {
      await fetch(`/api/broker/angelone/auth${full ? "?full=true" : ""}`, {
        method: "DELETE",
      });
      onRefresh();
    } catch {
      // ignore
    } finally {
      setDisconnecting(null);
    }
  };

  if (brokers.length === 0) return null;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Saved Brokers</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Click Connect to authenticate with TOTP
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="text-[var(--text-muted)]">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-3">
        {brokers.map((broker) => (
          <div
            key={broker.platform}
            className="flex items-center gap-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-4"
          >
            {/* Broker logo */}
            <div className="w-10 h-10 bg-[#e85d04]/10 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#e85d04]">A</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Angel One</span>
                <Badge
                  className={
                    broker.status === "CONNECTED"
                      ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981] text-[10px] py-0"
                      : "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B] text-[10px] py-0"
                  }
                >
                  {broker.status === "CONNECTED" ? (
                    <><Wifi className="h-2.5 w-2.5 mr-1" />Connected</>
                  ) : (
                    <><WifiOff className="h-2.5 w-2.5 mr-1" />Saved</>
                  )}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-[var(--text-muted)] font-mono">{broker.clientCode}</span>
                {broker.lastSyncAt && broker.status === "CONNECTED" && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Last sync: {formatDistanceToNow(new Date(broker.lastSyncAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {broker.status === "CONNECTED" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                      <span className="text-xs">Actions</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[var(--bg-card)] border-[var(--border-color)]">
                    <DropdownMenuItem
                      className="text-xs cursor-pointer"
                      onClick={() => setTotpOpen(broker.platform)}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-2" />
                      Re-authenticate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs text-[#F59E0B] cursor-pointer focus:text-[#F59E0B]"
                      onClick={() => handleDisconnect(broker.platform, false)}
                      disabled={disconnecting === broker.platform}
                    >
                      <Unplug className="h-3.5 w-3.5 mr-2" />
                      Disconnect (keep credentials)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs text-[#EF4444] cursor-pointer focus:text-[#EF4444]"
                      onClick={() => handleDisconnect(broker.platform, true)}
                      disabled={disconnecting === broker.platform}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Remove Completely
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  size="sm"
                  className="h-8 bg-[#e85d04] hover:bg-[#e85d04]/90 text-white text-xs"
                  onClick={() => setTotpOpen(broker.platform)}
                >
                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                  Connect
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* TOTP Dialog */}
      {activeBroker && (
        <TotpDialog
          broker={activeBroker}
          clientCode={activeBroker.clientCode}
          open={totpOpen === activeBroker.platform}
          onOpenChange={(v) => { if (!v) setTotpOpen(null); }}
          onConnected={() => {
            setTotpOpen(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookStrategy, setNewWebhookStrategy] = useState("");
  const [creating, setCreating] = useState(false);
  const [bridgeApiKey, setBridgeApiKey] = useState("••••••••••••••••••••");
  const [zerodhaEmail, setZerodhaEmail] = useState("");
  const [notifySubmitted, setNotifySubmitted] = useState<Record<string, boolean>>({});

  // Angel One - saved credentials form
  const [angelApiKey, setAngelApiKey] = useState("");
  const [angelClientCode, setAngelClientCode] = useState("");
  const [angelMpin, setAngelMpin] = useState("");
  const [angelSaving, setAngelSaving] = useState(false);
  const [angelSaveError, setAngelSaveError] = useState("");
  const [angelSaveSuccess, setAngelSaveSuccess] = useState("");

  // Saved brokers from DB
  const [savedBrokers, setSavedBrokers] = useState<SavedBroker[]>([]);

  useEffect(() => {
    fetchData();
    fetchBrokerStatus();
  }, []);

  const fetchData = async () => {
    try {
      const [whRes, stratRes] = await Promise.all([
        fetch("/api/integrations/webhooks"),
        fetch("/api/strategies"),
      ]);
      if (whRes.ok) {
        const data = await whRes.json();
        setWebhooks(data.webhooks || []);
        setWebhookLogs(data.webhookLogs || []);
      }
      if (stratRes.ok) {
        const data = await stratRes.json();
        setStrategies(Array.isArray(data) ? data : data.strategies || []);
      }
    } catch (error) {
      console.error("Error fetching integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBrokerStatus = async () => {
    try {
      const res = await fetch("/api/broker/angelone/auth");
      if (res.ok) {
        const data = await res.json();
        setSavedBrokers(data.brokers?.filter((b: SavedBroker) => b.status !== "DISCONNECTED") || []);
      }
    } catch {
      // ignore
    }
  };

  const saveAngelCredentials = async () => {
    if (!angelApiKey || !angelClientCode || !angelMpin) return;
    setAngelSaving(true);
    setAngelSaveError("");
    setAngelSaveSuccess("");
    try {
      const res = await fetch("/api/broker/angelone/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          apiKey: angelApiKey,
          clientCode: angelClientCode,
          mpin: angelMpin,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAngelSaveSuccess("Credentials saved! Use the 'Saved Brokers' section above to connect with TOTP.");
        setAngelApiKey("");
        setAngelMpin("");
        fetchBrokerStatus(); // Refresh saved brokers list
      } else {
        setAngelSaveError(data.error || "Failed to save credentials");
      }
    } catch (e) {
      setAngelSaveError((e as Error).message);
    } finally {
      setAngelSaving(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const createWebhook = async () => {
    if (!newWebhookName || !newWebhookStrategy) return;
    setCreating(true);
    try {
      const res = await fetch("/api/integrations/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWebhookName, strategyId: newWebhookStrategy }),
      });
      if (res.ok) {
        setShowCreateDialog(false);
        setNewWebhookName("");
        setNewWebhookStrategy("");
        fetchData();
      }
    } catch (error) {
      console.error("Error creating webhook:", error);
    } finally {
      setCreating(false);
    }
  };

  const getWebhookUrl = (key: string) =>
    `${window.location.origin}/api/webhooks/receive/${key}`;

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">Integrations</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[300px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Integrations</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Connect TradeOS India with your trading platforms and brokers
        </p>
      </div>

      {/* ── Saved Brokers (from DB) ─────────────────────────────── */}
      <SavedBrokersSection
        brokers={savedBrokers}
        onRefresh={fetchBrokerStatus}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ── TradingView ────────────────────────────────────────── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#131722] rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-[#2962FF]">TV</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">TradingView</h3>
                <p className="text-xs text-[var(--text-secondary)]">Receive webhook alerts</p>
              </div>
            </div>
            <Badge className={webhooks.length > 0
              ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]"
              : "bg-[#475569]/20 text-[#475569] border-[#475569]"
            }>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${webhooks.length > 0 ? "bg-[#10B981]" : "bg-[#475569]"}`} />
              {webhooks.length > 0 ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          <div className="space-y-4">
            {webhooks.map((wh) => (
              <div key={wh.id} className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{wh.name}</span>
                  <Badge variant="secondary" className="text-xs">{wh.strategy?.name}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded px-3 py-2 text-xs text-[var(--text-secondary)] font-mono truncate">
                    {getWebhookUrl(wh.webhookKey)}
                  </code>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => copyToClipboard(getWebhookUrl(wh.webhookKey), wh.id)}>
                    {copiedKey === wh.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><Send className="h-3 w-3" />{wh.totalTriggers} triggers</span>
                  {wh.lastTriggeredAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last: {formatDistanceToNow(new Date(wh.lastTriggeredAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            ))}

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Webhook URL
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[var(--bg-card)] border-[var(--border-color)]">
                <DialogHeader>
                  <DialogTitle className="text-[var(--text-primary)]">Create Webhook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-[var(--text-secondary)] mb-1 block">Webhook Name</label>
                    <Input value={newWebhookName} onChange={(e) => setNewWebhookName(e.target.value)} placeholder="e.g., Nifty Breakout Alert" className="bg-[var(--bg-main)] border-[var(--border-color)]" />
                  </div>
                  <div>
                    <label className="text-sm text-[var(--text-secondary)] mb-1 block">Strategy</label>
                    <Select value={newWebhookStrategy} onValueChange={setNewWebhookStrategy}>
                      <SelectTrigger className="bg-[var(--bg-main)] border-[var(--border-color)]">
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        {strategies.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full bg-[#3B82F6] hover:bg-[#2563EB]" onClick={createWebhook} disabled={creating || !newWebhookName || !newWebhookStrategy}>
                    {creating ? "Creating..." : "Create Webhook"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Setup Instructions</h4>
            <ol className="text-xs text-[var(--text-secondary)] space-y-1.5 list-decimal pl-4">
              <li>Open TradingView and go to your chart</li>
              <li>Create an alert on your strategy/indicator</li>
              <li>In the alert settings, select &ldquo;Webhook URL&rdquo;</li>
              <li>Paste the webhook URL generated above</li>
              <li>Set the message format to JSON with ticker, action, close, time fields</li>
              <li>Alerts will appear in the webhook logs below</li>
            </ol>
          </div>
        </div>

        {/* ── Amibroker ──────────────────────────────────────────── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1a1a2e] rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-[#F59E0B]">AB</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Amibroker</h3>
                <p className="text-xs text-[var(--text-secondary)]">Bridge App for auto-sync</p>
              </div>
            </div>
            <Badge className="bg-[#475569]/20 text-[#475569] border-[#475569]">
              <WifiOff className="h-3 w-3 mr-1" />Not Installed
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Bridge App</h4>
              <p className="text-xs text-[var(--text-secondary)] mb-3">The TradeOS Bridge App syncs your Amibroker backtest results automatically.</p>
              <Button variant="outline" className="w-full" onClick={() => alert("Bridge App download will be available soon. For now, use CSV import to sync Amibroker data.")}>
                <Download className="h-4 w-4 mr-2" />Download Bridge App (Windows)
              </Button>
            </div>
            <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">API Key</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded px-3 py-2 text-xs text-[var(--text-muted)] font-mono">{bridgeApiKey}</code>
                <Button variant="outline" size="sm" onClick={() => { const k = `toi_bridge_${crypto.randomUUID().replace(/-/g, "").substring(0, 24)}`; setBridgeApiKey(k); navigator.clipboard.writeText(k); }}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(bridgeApiKey); setCopiedKey("bridge"); setTimeout(() => setCopiedKey(null), 2000); }}>
                  {copiedKey === "bridge" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Setup Instructions</h4>
              <ol className="text-xs text-[var(--text-secondary)] space-y-1.5 list-decimal pl-4">
                <li>Download and install the Bridge App</li>
                <li>Copy the API key above into the Bridge App settings</li>
                <li>Set the AFL export folder path in Bridge App</li>
                <li>Run your Amibroker backtests as usual</li>
                <li>Results will auto-sync to TradeOS India</li>
              </ol>
            </div>
          </div>
        </div>

        {/* ── Zerodha – Coming Soon ──────────────────────────────── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 opacity-60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#387ed1]/10 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-[#387ed1]">Z</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Zerodha</h3>
                <p className="text-xs text-[var(--text-secondary)]">Kite Connect API</p>
              </div>
            </div>
            <Badge className="bg-[#6366F1]/20 text-[#6366F1] border-[#6366F1]">Coming Soon</Badge>
          </div>
          <p className="text-sm text-[var(--text-muted)]">Connect your Zerodha Kite account for automated trade logging and live P&L tracking.</p>
          <div className="mt-4">
            {notifySubmitted.zerodha ? (
              <p className="text-sm text-[#10B981] flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> We&apos;ll notify you when Zerodha integration is ready!
              </p>
            ) : (
              <>
                <Input placeholder="Enter email to get notified" className="bg-[var(--bg-main)] border-[var(--border-color)]" value={zerodhaEmail} onChange={(e) => setZerodhaEmail(e.target.value)} />
                <Button variant="outline" className="w-full mt-2" disabled={!zerodhaEmail.includes("@")} onClick={() => setNotifySubmitted((p) => ({ ...p, zerodha: true }))}>
                  Notify Me When Available
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Angel One – Save Credentials ──────────────────────── */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#e85d04]/10 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-[#e85d04]">A</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Angel One</h3>
                <p className="text-xs text-[var(--text-secondary)]">SmartAPI Integration</p>
              </div>
            </div>
            <Badge className={
              savedBrokers.some((b) => b.platform === "ANGELONE" && b.status === "CONNECTED")
                ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]"
                : savedBrokers.some((b) => b.platform === "ANGELONE")
                ? "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]"
                : "bg-[#475569]/20 text-[#475569] border-[#475569]"
            }>
              {savedBrokers.some((b) => b.platform === "ANGELONE" && b.status === "CONNECTED") ? (
                <><Wifi className="h-3 w-3 mr-1" />Connected</>
              ) : savedBrokers.some((b) => b.platform === "ANGELONE") ? (
                <><KeyRound className="h-3 w-3 mr-1" />Saved</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" />Disconnected</>
              )}
            </Badge>
          </div>

          <div className="space-y-4">
            {/* Save Credentials Form */}
            <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                {savedBrokers.some((b) => b.platform === "ANGELONE") ? "Update Credentials" : "Save Credentials"}
              </h4>
              <div className="space-y-3">
                {/* API Key */}
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block flex items-center gap-1">
                    <KeyRound className="h-3 w-3" /> SmartAPI Key
                  </label>
                  <Input
                    value={angelApiKey}
                    onChange={(e) => setAngelApiKey(e.target.value)}
                    placeholder="Your SmartAPI API Key (from smartapi.angelone.in)"
                    className="bg-[var(--bg-sidebar)] border-[var(--border-color)] text-sm font-mono"
                  />
                </div>
                {/* Client Code */}
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block flex items-center gap-1">
                    <User className="h-3 w-3" /> Client Code
                  </label>
                  <Input
                    value={angelClientCode}
                    onChange={(e) => setAngelClientCode(e.target.value)}
                    placeholder="Your Angel One client code (e.g. A123456)"
                    className="bg-[var(--bg-sidebar)] border-[var(--border-color)] text-sm"
                  />
                </div>
                {/* MPIN */}
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block flex items-center gap-1">
                    <Shield className="h-3 w-3" /> MPIN
                  </label>
                  <Input
                    type="password"
                    value={angelMpin}
                    onChange={(e) => setAngelMpin(e.target.value)}
                    placeholder="Your Angel One MPIN"
                    className="bg-[var(--bg-sidebar)] border-[var(--border-color)] text-sm"
                  />
                </div>

                {angelSaveError && (
                  <div className="flex items-center gap-2 text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg p-2.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {angelSaveError}
                  </div>
                )}
                {angelSaveSuccess && (
                  <div className="flex items-start gap-2 text-xs text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg p-2.5">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {angelSaveSuccess}
                  </div>
                )}

                <Button
                  className="w-full bg-[#e85d04] hover:bg-[#e85d04]/90"
                  onClick={saveAngelCredentials}
                  disabled={angelSaving || !angelApiKey || !angelClientCode || !angelMpin}
                >
                  {angelSaving ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><KeyRound className="h-4 w-4 mr-2" />Save Credentials</>
                  )}
                </Button>

                <p className="text-[10px] text-[var(--text-muted)] text-center">
                  Credentials are encrypted and stored securely. TOTP is never stored.
                </p>
              </div>
            </div>

            {/* Features list when connected */}
            {savedBrokers.some((b) => b.platform === "ANGELONE" && b.status === "CONNECTED") && (
              <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-4">
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Active Features</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[#10B981]" />Live Market Data</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[#10B981]" />Historical Candles</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[#10B981]" />Order Placement</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[#10B981]" />Position Tracking</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[#10B981]" />Holdings Sync</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[#10B981]" />Funds & Margin</span>
                </div>
              </div>
            )}

            {/* Setup Instructions */}
            <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">Setup Instructions</h4>
              <ol className="text-xs text-[var(--text-secondary)] space-y-1.5 list-decimal pl-4">
                <li>Create a SmartAPI app at <span className="text-[#3B82F6]">smartapi.angelone.in</span></li>
                <li>Copy your <strong>API Key</strong> from the SmartAPI dashboard</li>
                <li>Enter your <strong>Client Code</strong> (Angel One login ID)</li>
                <li>Enter your <strong>MPIN</strong> (trading account PIN)</li>
                <li>Click <strong>Save Credentials</strong> — they are encrypted and stored</li>
                <li>In <strong>Saved Brokers</strong> above, click <strong>Connect</strong> and enter your TOTP</li>
                <li>Re-connect daily — Angel One tokens expire at 5 AM each day</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* ── Webhook Logs ────────────────────────────────────────── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Webhook Logs</h2>
        {webhookLogs.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            No webhook logs yet. Webhook events will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs">
                  <th className="text-left py-3 px-2">Timestamp</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-left py-3 px-2">Payload</th>
                  <th className="text-left py-3 px-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {webhookLogs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-sidebar)]">
                    <td className="py-3 px-2 text-[var(--text-secondary)] text-xs font-mono">
                      {format(new Date(log.receivedAt), "dd MMM yyyy HH:mm:ss")}
                    </td>
                    <td className="py-3 px-2">
                      {log.status === "SUCCESS" ? (
                        <Badge className="bg-[#10B981]/20 text-[#10B981] border-[#10B981] text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />Success
                        </Badge>
                      ) : (
                        <Badge className="bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444] text-xs">
                          <XCircle className="h-3 w-3 mr-1" />Failed
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <code className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--bg-sidebar)] px-2 py-1 rounded">
                        {JSON.stringify(log.payload).substring(0, 80)}...
                      </code>
                    </td>
                    <td className="py-3 px-2 text-xs text-[#EF4444]">{log.errorMessage || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
