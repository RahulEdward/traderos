"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Plus,
  Briefcase,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreatePortfolioPanel } from "@/components/forms/create-portfolio-panel";
import { formatINR } from "@tradeos/shared";

const STATUS_CONFIG = {
  ACTIVE: { label: "Active", color: "#10B981" },
  PAUSED: { label: "Paused", color: "#F59E0B" },
  ARCHIVED: { label: "Archived", color: "#6B7280" },
};

export default function PortfoliosPage() {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPortfolios = async () => {
    try {
      const res = await fetch("/api/portfolios");
      if (res.ok) {
        setPortfolios(await res.json());
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this portfolio?")) return;
    try {
      await fetch(`/api/portfolios/${id}`, { method: "DELETE" });
      fetchPortfolios();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#F1F5F9]">Portfolios</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Group and manage your strategies together
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-[#3B82F6] hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4 mr-2" /> Create Portfolio
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : portfolios.length === 0 ? (
        <div className="text-center py-16 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl">
          <Briefcase className="h-10 w-10 text-[#475569] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-[#F1F5F9] mb-2">No portfolios yet</h3>
          <p className="text-sm text-[#94A3B8] mb-4">
            Create a portfolio to group your strategies and track combined performance
          </p>
          <Button onClick={() => setShowCreate(true)} className="bg-[#3B82F6] hover:bg-[#2563EB]">
            <Plus className="h-4 w-4 mr-2" /> Create Portfolio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((portfolio) => {
            const statusConfig = STATUS_CONFIG[portfolio.status as keyof typeof STATUS_CONFIG];
            return (
              <div
                key={portfolio.id}
                className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-5 hover:border-[#3B82F6]/30 transition-colors cursor-pointer group"
                onClick={() => router.push(`/portfolios/${portfolio.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-[#F1F5F9]">
                      {portfolio.name}
                    </h3>
                    <Badge
                      className="text-[10px] mt-1"
                      style={{
                        backgroundColor: `${statusConfig?.color}15`,
                        color: statusConfig?.color,
                      }}
                    >
                      {statusConfig?.label}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0A0A0A] border-[#1A1A1A]">
                      <DropdownMenuItem
                        className="text-[#F1F5F9]"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/portfolios/${portfolio.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-[#EF4444]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(portfolio.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {portfolio.description && (
                  <p className="text-xs text-[#475569] mb-3 line-clamp-2">
                    {portfolio.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-auto pt-3 border-t border-[#1A1A1A]">
                  <div>
                    <p className="text-[10px] text-[#475569]">Strategies</p>
                    <p className="text-sm font-mono text-[#F1F5F9]">
                      {portfolio.strategyCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#475569]">Combined P&L</p>
                    <p
                      className="text-sm font-mono"
                      style={{
                        color: portfolio.combinedPnL >= 0 ? "#10B981" : "#EF4444",
                      }}
                    >
                      {formatINR(portfolio.combinedPnL || 0)}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <p className="text-[10px] text-[#475569]">Updated</p>
                    <p className="text-xs text-[#94A3B8]">
                      {format(new Date(portfolio.updatedAt), "dd MMM")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreatePortfolioPanel
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchPortfolios}
      />
    </div>
  );
}
