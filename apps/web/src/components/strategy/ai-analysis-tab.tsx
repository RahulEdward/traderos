"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  Brain,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  Sparkles,
  Plus,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AiAnalysis {
  id: string;
  createdAt: string;
  overallScore: number;
  readinessScore: number;
  readinessVerdict: "READY" | "NEEDS_WORK" | "NOT_READY";
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  riskNotes: string | null;
  marketRegimeNotes: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiAnalysisTabProps {
  strategyId: string;
  hasBacktest: boolean;
  analyses: AiAnalysis[];
  onAnalysisComplete?: () => void;
  onAddTask?: (suggestion: string) => void;
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score > 70 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1A1A1A"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold font-mono" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-[#475569]">/ 100</span>
      </div>
    </div>
  );
}

function CollapsibleCard({
  title,
  icon: Icon,
  iconColor,
  items,
  defaultOpen = true,
  renderItem,
}: {
  title: string;
  icon: any;
  iconColor: string;
  items: string[];
  defaultOpen?: boolean;
  renderItem?: (item: string, index: number) => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#000000] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
          <span className="text-sm font-medium text-[#F1F5F9]">{title}</span>
          <Badge variant="secondary" className="text-[10px]">
            {items.length}
          </Badge>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-[#475569]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#475569]" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-2">
          {items.map((item, i) =>
            renderItem ? (
              renderItem(item, i)
            ) : (
              <div key={i} className="flex items-start gap-2 text-sm text-[#94A3B8]">
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: iconColor }} />
                <span>{item}</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function AiAnalysisTab({
  strategyId,
  hasBacktest,
  analyses: initialAnalyses,
  onAnalysisComplete,
  onAddTask,
}: AiAnalysisTabProps) {
  const [analyses, setAnalyses] = useState<AiAnalysis[]>(initialAnalyses);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AiAnalysis | null>(
    initialAnalyses[0] || null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/strategies/${strategyId}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }
      const analysis = await res.json();
      setAnalyses((prev) => [analysis, ...prev]);
      setSelectedAnalysis(analysis);
      onAnalysisComplete?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || isChatting) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user" as const, content: userMsg }];
    setChatMessages(newMessages);
    setIsChatting(true);

    try {
      const res = await fetch(`/api/strategies/${strategyId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history: chatMessages }),
      });

      if (!res.ok) throw new Error("Chat failed");
      const data = await res.json();
      setChatMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setChatMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  // No backtest state
  if (!hasBacktest) {
    return (
      <div className="text-center py-16 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl">
        <Brain className="h-10 w-10 text-[#475569] mx-auto mb-3" />
        <h3 className="text-lg font-medium text-[#F1F5F9] mb-2">
          AI Analysis
        </h3>
        <p className="text-sm text-[#94A3B8]">
          Import a backtest first to enable AI analysis
        </p>
      </div>
    );
  }

  // Analyzing skeleton
  if (isAnalyzing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#3B82F6]" />
          <span className="text-sm text-[#94A3B8]">
            AI is analyzing your strategy...
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40 animate-pulse" />
          <Skeleton className="h-40 animate-pulse" />
          <Skeleton className="h-40 animate-pulse" />
        </div>
        <Skeleton className="h-24 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 animate-pulse" />
          <Skeleton className="h-32 animate-pulse" />
        </div>
      </div>
    );
  }

  // No analysis yet
  if (!selectedAnalysis) {
    return (
      <div className="text-center py-16 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl">
        <Brain className="h-10 w-10 text-[#06B6D4] mx-auto mb-3" />
        <h3 className="text-lg font-medium text-[#F1F5F9] mb-2">
          AI Analysis
        </h3>
        <p className="text-sm text-[#94A3B8] mb-4">
          Analyze your strategy with AI to get insights, scoring, and suggestions
        </p>
        {error && (
          <p className="text-sm text-[#EF4444] mb-4">{error}</p>
        )}
        <Button
          onClick={runAnalysis}
          className="bg-[#3B82F6] hover:bg-[#2563EB]"
        >
          <Brain className="h-4 w-4 mr-2" /> Analyze with AI
        </Button>
      </div>
    );
  }

  const analysis = selectedAnalysis;
  const verdictConfig = {
    READY: { label: "Ready to Go Live", color: "#10B981", icon: CheckCircle2 },
    NEEDS_WORK: { label: "Needs More Work", color: "#F59E0B", icon: AlertTriangle },
    NOT_READY: { label: "Not Ready", color: "#EF4444", icon: XCircle },
  };
  const verdict = verdictConfig[analysis.readinessVerdict];
  const VerdictIcon = verdict.icon;

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className={cn("flex-1 space-y-6", showChat && "max-w-[calc(100%-340px)]")}>
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={runAnalysis} variant="outline" size="sm" disabled={isAnalyzing}>
              <Sparkles className="h-4 w-4 mr-2" /> Re-analyze
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {showChat ? "Hide Chat" : "Ask AI"}
            </Button>
            {analyses.length > 1 && (
              <select
                value={analysis.id}
                onChange={(e) => {
                  const a = analyses.find((a) => a.id === e.target.value);
                  if (a) setSelectedAnalysis(a);
                }}
                className="text-xs bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg px-2 py-1.5 text-[#94A3B8]"
              >
                {analyses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {format(new Date(a.createdAt), "dd MMM yyyy HH:mm")} — Score: {a.overallScore}
                  </option>
                ))}
              </select>
            )}
          </div>
          {error && <p className="text-xs text-[#EF4444]">{error}</p>}
        </div>

        {/* Score + Verdict Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Score */}
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6 flex flex-col items-center justify-center">
            <p className="text-xs text-[#475569] mb-3">Overall Score</p>
            <ScoreRing score={analysis.overallScore} />
          </div>

          {/* Verdict */}
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6 flex flex-col items-center justify-center">
            <p className="text-xs text-[#475569] mb-3">Readiness Verdict</p>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: `${verdict.color}15`,
                color: verdict.color,
              }}
            >
              <VerdictIcon className="h-5 w-5" />
              {verdict.label}
            </div>
            <p className="text-xs text-[#475569] mt-2">
              Readiness: {analysis.readinessScore}/100
            </p>
          </div>

          {/* Summary */}
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6">
            <p className="text-xs text-[#475569] mb-2">Executive Summary</p>
            <p className="text-sm text-[#F1F5F9] leading-relaxed">
              {analysis.summary}
            </p>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CollapsibleCard
            title="Strengths"
            icon={CheckCircle2}
            iconColor="#10B981"
            items={analysis.strengths}
          />
          <CollapsibleCard
            title="Weaknesses"
            icon={XCircle}
            iconColor="#EF4444"
            items={analysis.weaknesses}
          />
        </div>

        {/* Suggestions */}
        <CollapsibleCard
          title="Suggestions"
          icon={ArrowRight}
          iconColor="#3B82F6"
          items={analysis.suggestions}
          renderItem={(item, i) => (
            <div key={i} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 text-sm text-[#94A3B8] flex-1">
                <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#3B82F6]" />
                <span>{item}</span>
              </div>
              {onAddTask && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs h-7"
                  onClick={() => onAddTask(item)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Task
                </Button>
              )}
            </div>
          )}
        />

        {/* Risk Notes & Market Regime */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.riskNotes && (
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-[#F59E0B]" />
                <span className="text-sm font-medium text-[#F1F5F9]">
                  Risk Notes
                </span>
              </div>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                {analysis.riskNotes}
              </p>
            </div>
          )}

          {analysis.marketRegimeNotes && (
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-[#06B6D4]" />
                <span className="text-sm font-medium text-[#F1F5F9]">
                  Market Regime
                </span>
              </div>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                {analysis.marketRegimeNotes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="w-[320px] shrink-0 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl flex flex-col h-[600px]">
          <div className="px-4 py-3 border-b border-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-[#3B82F6]" />
              <span className="text-sm font-medium text-[#F1F5F9]">
                Strategy Chat
              </span>
            </div>
            <p className="text-[10px] text-[#475569] mt-0.5">
              Ask questions about your strategy
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <Brain className="h-8 w-8 text-[#1A1A1A] mx-auto mb-2" />
                <p className="text-xs text-[#475569]">
                  Ask about your strategy's performance, risk management, or optimization ideas
                </p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm rounded-lg px-3 py-2 max-w-[90%]",
                  msg.role === "user"
                    ? "bg-[#3B82F6] text-white ml-auto"
                    : "bg-[#1A1A1A] text-[#F1F5F9]"
                )}
              >
                {msg.content}
              </div>
            ))}
            {isChatting && (
              <div className="bg-[#1A1A1A] text-[#94A3B8] text-sm rounded-lg px-3 py-2 max-w-[90%] flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[#1A1A1A]">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about your strategy..."
                className="flex-1 text-sm bg-[#050505] border border-[#1A1A1A] rounded-lg px-3 py-2 text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
              />
              <Button
                size="sm"
                onClick={sendMessage}
                disabled={!chatInput.trim() || isChatting}
                className="bg-[#3B82F6] hover:bg-[#2563EB] h-9 w-9 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
