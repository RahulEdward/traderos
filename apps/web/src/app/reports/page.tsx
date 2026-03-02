"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Share2,
  Plus,
  Link2,
  Copy,
  Check,
  Calendar,
  Briefcase,
  Layers,
  BarChart3,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";

interface Report {
  id: string;
  type: "STRATEGY" | "PORTFOLIO" | "WEEKLY";
  title: string;
  strategyName: string | null;
  createdAt: string;
  status: "READY" | "GENERATING" | "FAILED";
  downloadUrl: string | null;
  shareableLink: string | null;
}

const TYPE_CONFIG = {
  STRATEGY: { icon: Layers, color: "#3B82F6", label: "Strategy Report" },
  PORTFOLIO: { icon: Briefcase, color: "#06B6D4", label: "Portfolio Report" },
  WEEKLY: { icon: Calendar, color: "#10B981", label: "Weekly Summary" },
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [reportType, setReportType] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rptRes, stratRes, portRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/strategies"),
        fetch("/api/portfolios"),
      ]);
      if (rptRes.ok) {
        const data = await rptRes.json();
        setReports(data.reports || []);
      }
      if (stratRes.ok) {
        const data = await stratRes.json();
        setStrategies(Array.isArray(data) ? data : data.strategies || []);
      }
      if (portRes.ok) {
        const data = await portRes.json();
        setPortfolios(Array.isArray(data) ? data : data.portfolios || []);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!reportType) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reportType,
          strategyId: reportType === "STRATEGY" ? selectedId : undefined,
          portfolioId: reportType === "PORTFOLIO" ? selectedId : undefined,
        }),
      });
      if (res.ok) {
        setShowGenerateDialog(false);
        setReportType("");
        setSelectedId("");
        fetchData();
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async (link: string, id: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">Reports</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-[80px]" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Reports</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Generate and share strategy & portfolio reports
          </p>
        </div>
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--bg-card)] border-[var(--border-color)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--text-primary)]">Generate Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-[var(--text-secondary)] mb-1 block">Report Type</label>
                <Select value={reportType} onValueChange={(v) => { setReportType(v); setSelectedId(""); }}>
                  <SelectTrigger className="bg-[var(--bg-main)] border-[var(--border-color)]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STRATEGY">Strategy Report</SelectItem>
                    <SelectItem value="PORTFOLIO">Portfolio Report</SelectItem>
                    <SelectItem value="WEEKLY">Weekly Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType === "STRATEGY" && (
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Strategy</label>
                  <Select value={selectedId} onValueChange={setSelectedId}>
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
              )}

              {reportType === "PORTFOLIO" && (
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Portfolio</label>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger className="bg-[var(--bg-main)] border-[var(--border-color)]">
                      <SelectValue placeholder="Select portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
                onClick={generateReport}
                disabled={generating || !reportType || (reportType !== "WEEKLY" && !selectedId)}
              >
                {generating ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Report Types Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {Object.entries(TYPE_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}20` }}>
                <Icon className="h-5 w-5" style={{ color: config.color }} />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{config.label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {key === "STRATEGY" && "Full metrics, charts & AI analysis for a strategy"}
                  {key === "PORTFOLIO" && "Combined metrics, allocation & correlation analysis"}
                  {key === "WEEKLY" && "Auto-generated performance summary for the week"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reports Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Generated Reports</h2>
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              No reports generated yet. Click &ldquo;Generate Report&rdquo; to create your first report.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const typeConfig = TYPE_CONFIG[report.type];
              const Icon = typeConfig?.icon || FileText;
              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg hover:border-[#3B82F6]/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${typeConfig?.color || "#3B82F6"}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: typeConfig?.color || "#3B82F6" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{report.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor: `${typeConfig?.color || "#3B82F6"}20`,
                            color: typeConfig?.color || "#3B82F6",
                          }}
                        >
                          {typeConfig?.label || report.type}
                        </Badge>
                        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.status === "GENERATING" && (
                      <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]">
                        Generating...
                      </Badge>
                    )}
                    {report.status === "READY" && (
                      <>
                        {report.shareableLink && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLink(report.shareableLink!, report.id)}
                          >
                            {copiedLink === report.id ? (
                              <Check className="h-4 w-4 text-[#10B981]" />
                            ) : (
                              <Link2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const shareUrl = report.shareableLink || `${window.location.origin}/reports/${report.id}`;
                            if (navigator.share) {
                              await navigator.share({ title: report.title, url: shareUrl });
                            } else {
                              await navigator.clipboard.writeText(shareUrl);
                              setCopiedLink(report.id);
                              setTimeout(() => setCopiedLink(null), 2000);
                            }
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const win = window.open("", "_blank");
                            if (win) {
                              win.document.write(`<html><head><title>${report.title}</title><style>body{font-family:sans-serif;padding:20px;background:#fff;color:#000}</style></head><body><h1>${report.title}</h1><p>Type: ${report.type}</p><p>Generated: ${format(new Date(report.createdAt), "dd MMM yyyy HH:mm")}</p>${report.strategyName ? `<p>Strategy: ${report.strategyName}</p>` : ""}</body></html>`);
                              win.document.close();
                              win.print();
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
