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
  ExternalLink,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
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

  // Angel One connection state
  const [angelConnected, setAngelConnected] = useState(false);
  const [angelClientCode, setAngelClientCode] = useState("");
  const [angelPassword, setAngelPassword] = useState("");
  const [angelTotp, setAngelTotp] = useState("");
  const [angelConnecting, setAngelConnecting] = useState(false);
  const [angelError, setAngelError] = useState("");
  const [angelSavedClientCode, setAngelSavedClientCode] = useState("");

  useEffect(() => {
    fetchData();
    fetchAngelStatus();
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

  // ─── Angel One Functions ────────────────────────────────────
  const fetchAngelStatus = async () => {
    try {
      const res = await fetch("/api/broker/angelone/auth");
      if (res.ok) {
        const data = await res.json();
        setAngelConnected(data.connected);
        if (data.clientCode) setAngelSavedClientCode(data.clientCode);
      }
    } catch {
      // Ignore - not connected
    }
  };

  const connectAngelOne = async () => {
    if (!angelClientCode || !angelPassword || !angelTotp) return;
    setAngelConnecting(true);
    setAngelError("");
    try {
      const res = await fetch("/api/broker/angelone/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientCode: angelClientCode,
          password: angelPassword,
          totp: angelTotp,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAngelConnected(true);
        setAngelSavedClientCode(angelClientCode);
        setAngelPassword("");
        setAngelTotp("");
      } else {
        setAngelError(data.error || "Connection failed");
      }
    } catch (error) {
      setAngelError((error as Error).message);
    } finally {
      setAngelConnecting(false);
    }
  };

  const disconnectAngelOne = async () => {
    try {
      await fetch("/api/broker/angelone/auth", { method: "DELETE" });
      setAngelConnected(false);
      setAngelSavedClientCode("");
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[#F1F5F9] mb-6">Integrations</h1>
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
        <h1 className="text-2xl font-semibold text-[#F1F5F9]">Integrations</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Connect TradeOS India with your trading platforms
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* TradingView Integration */}
        <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#131722] rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-[#2962FF]">TV</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#F1F5F9]">TradingView</h3>
                <p className="text-xs text-[#94A3B8]">Receive webhook alerts</p>
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
              <div key={wh.id} className="bg-[#0A0E1A] border border-[#1E2A45] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#F1F5F9]">{wh.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {wh.strategy?.name}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 bg-[#080C18] border border-[#1E2A45] rounded px-3 py-2 text-xs text-[#94A3B8] font-mono truncate">
                    {getWebhookUrl(wh.webhookKey)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => copyToClipboard(getWebhookUrl(wh.webhookKey), wh.id)}
                  >
                    {copiedKey === wh.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#475569]">
                  <span className="flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    {wh.totalTriggers} triggers
                  </span>
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
              <DialogContent className="bg-[#0F1629] border-[#1E2A45]">
                <DialogHeader>
                  <DialogTitle className="text-[#F1F5F9]">Create Webhook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-[#94A3B8] mb-1 block">Webhook Name</label>
                    <Input
                      value={newWebhookName}
                      onChange={(e) => setNewWebhookName(e.target.value)}
                      placeholder="e.g., Nifty Breakout Alert"
                      className="bg-[#0A0E1A] border-[#1E2A45]"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[#94A3B8] mb-1 block">Strategy</label>
                    <Select value={newWebhookStrategy} onValueChange={setNewWebhookStrategy}>
                      <SelectTrigger className="bg-[#0A0E1A] border-[#1E2A45]">
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        {strategies.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full bg-[#3B82F6] hover:bg-[#2563EB]"
                    onClick={createWebhook}
                    disabled={creating || !newWebhookName || !newWebhookStrategy}
                  >
                    {creating ? "Creating..." : "Create Webhook"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Setup Instructions */}
          <div className="mt-4 bg-[#0A0E1A] border border-[#1E2A45] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#F1F5F9] mb-2">Setup Instructions</h4>
            <ol className="text-xs text-[#94A3B8] space-y-1.5 list-decimal pl-4">
              <li>Open TradingView and go to your chart</li>
              <li>Create an alert on your strategy/indicator</li>
              <li>In the alert settings, select &ldquo;Webhook URL&rdquo;</li>
              <li>Paste the webhook URL generated above</li>
              <li>Set the message format to JSON with ticker, action, close, time fields</li>
              <li>Alerts will appear in the webhook logs below</li>
            </ol>
          </div>
        </div>

        {/* Amibroker Integration */}
        <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1a1a2e] rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-[#F59E0B]">AB</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#F1F5F9]">Amibroker</h3>
                <p className="text-xs text-[#94A3B8]">Bridge App for auto-sync</p>
              </div>
            </div>
            <Badge className="bg-[#475569]/20 text-[#475569] border-[#475569]">
              <WifiOff className="h-3 w-3 mr-1" />
              Not Installed
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="bg-[#0A0E1A] border border-[#1E2A45] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[#F1F5F9] mb-2">Bridge App</h4>
              <p className="text-xs text-[#94A3B8] mb-3">
                The TradeOS Bridge App syncs your Amibroker backtest results automatically.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  alert("Bridge App download will be available soon. For now, use CSV import to sync Amibroker data.");
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Bridge App (Windows)
              </Button>
            </div>

            <div className="bg-[#0A0E1A] border border-[#1E2A45] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[#F1F5F9] mb-2">API Key</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[#080C18] border border-[#1E2A45] rounded px-3 py-2 text-xs text-[#475569] font-mono">
                  {bridgeApiKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newKey = `toi_bridge_${crypto.randomUUID().replace(/-/g, "").substring(0, 24)}`;
                    setBridgeApiKey(newKey);
                    navigator.clipboard.writeText(newKey);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(bridgeApiKey);
                    setCopiedKey("bridge");
                    setTimeout(() => setCopiedKey(null), 2000);
                  }}
                >
                  {copiedKey === "bridge" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="bg-[#0A0E1A] border border-[#1E2A45] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[#F1F5F9] mb-2">Setup Instructions</h4>
              <ol className="text-xs text-[#94A3B8] space-y-1.5 list-decimal pl-4">
                <li>Download and install the Bridge App</li>
                <li>Copy the API key above into the Bridge App settings</li>
                <li>Set the AFL export folder path in Bridge App</li>
                <li>Run your Amibroker backtests as usual</li>
                <li>Results will auto-sync to TradeOS India</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Zerodha - Coming Soon */}
        <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-6 opacity-60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#387ed1]/10 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-[#387ed1]">Z</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#F1F5F9]">Zerodha</h3>
                <p className="text-xs text-[#94A3B8]">Kite Connect API</p>
              </div>
            </div>
            <Badge className="bg-[#6366F1]/20 text-[#6366F1] border-[#6366F1]">Coming Soon</Badge>
          </div>
          <p className="text-sm text-[#475569]">
            Connect your Zerodha Kite account for automated trade logging and live P&L tracking.
          </p>
          <div className="mt-4">
            {notifySubmitted.zerodha ? (
              <p className="text-sm text-[#10B981] flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> We&apos;ll notify you when Zerodha integration is ready!
              </p>
            ) : (
              <>
                <Input
                  placeholder="Enter email to get notified"
                  className="bg-[#0A0E1A] border-[#1E2A45]"
                  value={zerodhaEmail}
                  onChange={(e) => setZerodhaEmail(e.target.value)}
                />
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  disabled={!zerodhaEmail.includes("@")}
                  onClick={() => setNotifySubmitted((p) => ({ ...p, zerodha: true }))}
                >
                  Notify Me When Available
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Angel One Integration */}
        <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#e85d04]/10 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-[#e85d04]">A</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#F1F5F9]">Angel One</h3>
                <p className="text-xs text-[#94A3B8]">SmartAPI Integration</p>
              </div>
            </div>
            <Badge className={angelConnected
              ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]"
              : "bg-[#475569]/20 text-[#475569] border-[#475569]"
            }>
              {angelConnected ? (
                <><Wifi className="h-3 w-3 mr-1" /> Connected</>
              ) : (
                <><WifiOff className="h-3 w-3 mr-1" /> Disconnected</>
              )}
            </Badge>
          </div>

          {angelConnected ? (
            <div className="space-y-4">
              <div className="bg-[#0A0E1A] border border-[#1E2A45] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#F1F5F9]">Account Connected</span>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {angelSavedClientCode}
                  </Badge>
                </div>
                <p className="text-xs text-[#94A3B8] mb-3">
                  Your Angel One account is connected. Live market data, order placement, and portfolio sync are active.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setAngelConnected(false);
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Re-authenticate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                    onClick={disconnectAngelOne}
                  >
                    <WifiOff className="h-3.5 w-3.5 mr-1" />
                    Disconnect
                  </Button>
                </div>
              </div>

              <div className="bg-[#0A0E1A] border border-[#1E2A45] rounded-lg p-4">
                <h4 className="text-sm font-medium text-[#F1F5F9] mb-2">Available Features</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#94A3B8]">
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[#10B981]" /> Live Market Data</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[#10B981]" /> Historical Candles</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[#10B981]" /> Order Placement</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[#10B981]" /> Position Tracking</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[#10B981]" /> Holdings Sync</span>
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[#10B981]" /> Funds & Margin</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#0A0E1A] border border-[#1E2A45] rounded-lg p-4">
                <h4 className="text-sm font-medium text-[#F1F5F9] mb-3">Connect Your Account</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#94A3B8] mb-1 block">Client Code</label>
                    <Input
                      value={angelClientCode}
                      onChange={(e) => setAngelClientCode(e.target.value)}
                      placeholder="Your Angel One client code"
                      className="bg-[#080C18] border-[#1E2A45] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#94A3B8] mb-1 block">MPIN / Password</label>
                    <Input
                      type="password"
                      value={angelPassword}
                      onChange={(e) => setAngelPassword(e.target.value)}
                      placeholder="Your trading PIN"
                      className="bg-[#080C18] border-[#1E2A45] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#94A3B8] mb-1 block">TOTP Code</label>
                    <Input
                      value={angelTotp}
                      onChange={(e) => setAngelTotp(e.target.value)}
                      placeholder="6-digit TOTP from authenticator app"
                      maxLength={6}
                      className="bg-[#080C18] border-[#1E2A45] text-sm font-mono"
                    />
                  </div>

                  {angelError && (
                    <p className="text-xs text-[#EF4444] flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {angelError}
                    </p>
                  )}

                  <Button
                    className="w-full bg-[#e85d04] hover:bg-[#e85d04]/90"
                    onClick={connectAngelOne}
                    disabled={angelConnecting || !angelClientCode || !angelPassword || !angelTotp}
                  >
                    {angelConnecting ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
                    ) : (
                      <><Link2 className="h-4 w-4 mr-2" /> Connect Angel One</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-[#0A0E1A] border border-[#1E2A45] rounded-lg p-4">
                <h4 className="text-sm font-medium text-[#F1F5F9] mb-2">Setup Instructions</h4>
                <ol className="text-xs text-[#94A3B8] space-y-1.5 list-decimal pl-4">
                  <li>Create a SmartAPI app at <span className="text-[#3B82F6]">smartapi.angelone.in</span></li>
                  <li>Copy your API Key and set it in server env as ANGELONE_API_KEY</li>
                  <li>Enable TOTP in your Angel One mobile app (Settings &gt; Security)</li>
                  <li>Enter your client code, MPIN, and TOTP above to connect</li>
                  <li>Re-authenticate daily as Angel One tokens expire at EOD</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Webhook Logs */}
      <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">Webhook Logs</h2>
        {webhookLogs.length === 0 ? (
          <p className="text-sm text-[#475569] text-center py-8">
            No webhook logs yet. Webhook events will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E2A45] text-[#94A3B8] text-xs">
                  <th className="text-left py-3 px-2">Timestamp</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-left py-3 px-2">Payload</th>
                  <th className="text-left py-3 px-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {webhookLogs.map((log) => (
                  <tr key={log.id} className="border-b border-[#1E2A45]/50 hover:bg-[#080C18]">
                    <td className="py-3 px-2 text-[#94A3B8] text-xs font-mono">
                      {format(new Date(log.receivedAt), "dd MMM yyyy HH:mm:ss")}
                    </td>
                    <td className="py-3 px-2">
                      {log.status === "SUCCESS" ? (
                        <Badge className="bg-[#10B981]/20 text-[#10B981] border-[#10B981] text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Success
                        </Badge>
                      ) : (
                        <Badge className="bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444] text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <code className="text-xs text-[#94A3B8] font-mono bg-[#080C18] px-2 py-1 rounded">
                        {JSON.stringify(log.payload).substring(0, 80)}...
                      </code>
                    </td>
                    <td className="py-3 px-2 text-xs text-[#EF4444]">
                      {log.errorMessage || "—"}
                    </td>
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
