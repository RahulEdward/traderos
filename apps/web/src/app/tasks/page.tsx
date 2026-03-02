"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Plus,
  CheckSquare,
  Calendar,
  Filter,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TASK_PRIORITY_CONFIG, TASK_TYPE_CONFIG } from "@tradeos/shared";

const STATUS_OPTIONS = [
  { key: "ALL", label: "All" },
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "DONE", label: "Done" },
  { key: "SKIPPED", label: "Skipped" },
];

interface Task {
  id: string;
  title: string;
  description?: string | null;
  taskType: string;
  priority: string;
  status: string;
  dueDate?: string | null;
  createdAt: string;
  completedAt?: string | null;
  strategy?: { id: string; name: string } | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);

  // Add task form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("RESEARCH");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newDueDate, setNewDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
      if (typeFilter !== "ALL") params.set("taskType", typeFilter);

      const res = await fetch(`/api/tasks?${params}`);
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, typeFilter]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      fetchTasks();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          taskType: newType,
          priority: newPriority,
          dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewDesc("");
        setNewDueDate("");
        setShowAdd(false);
        fetchTasks();
      }
    } finally {
      setSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    TODO: "#3B82F6",
    IN_PROGRESS: "#F59E0B",
    DONE: "#10B981",
    SKIPPED: "#6B7280",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Tasks</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            All tasks across all strategies
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Status filter */}
        <div className="flex gap-1 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setStatusFilter(opt.key)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md transition-colors",
                statusFilter === opt.key
                  ? "bg-[var(--border-color)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px] h-8 text-xs bg-[var(--bg-sidebar)] border-[var(--border-color)]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            {Object.entries(TASK_PRIORITY_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs bg-[var(--bg-sidebar)] border-[var(--border-color)]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {Object.entries(TASK_TYPE_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Add Task Form */}
      {showAdd && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--text-primary)]">New Task</span>
            <button onClick={() => setShowAdd(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Input
            placeholder="Task title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="bg-[var(--bg-sidebar)] border-[var(--border-color)] mb-2"
            autoFocus
          />
          <Textarea
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            className="bg-[var(--bg-sidebar)] border-[var(--border-color)] resize-none mb-2"
          />
          <div className="flex gap-2 mb-3">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-[var(--bg-sidebar)] border-[var(--border-color)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-[var(--bg-sidebar)] border-[var(--border-color)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_PRIORITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-[160px] h-8 text-xs bg-[var(--bg-sidebar)] border-[var(--border-color)]" />
          </div>
          <Button onClick={handleCreate} disabled={!newTitle.trim() || saving} size="sm" className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
            {saving ? "Creating..." : "Create Task"}
          </Button>
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
          <CheckSquare className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No tasks</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {statusFilter !== "ALL" ? "No tasks match your filters" : "Create your first task to track your work"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const typeConfig = TASK_TYPE_CONFIG[task.taskType as keyof typeof TASK_TYPE_CONFIG];
            const priorityConfig = TASK_PRIORITY_CONFIG[task.priority as keyof typeof TASK_PRIORITY_CONFIG];

            return (
              <div
                key={task.id}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 hover:border-[#3B82F6]/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: statusColors[task.status] }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-sm font-medium", task.status === "DONE" ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]")}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.strategy && (
                        <span className="text-[10px] text-[var(--color-primary)]">{task.strategy.name}</span>
                      )}
                      <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: `${typeConfig?.color}20`, color: typeConfig?.color }}>
                        {typeConfig?.label}
                      </Badge>
                      <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: `${priorityConfig?.color}20`, color: priorityConfig?.color }}>
                        {priorityConfig?.label}
                      </Badge>
                      {task.dueDate && (
                        <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.dueDate), "dd MMM")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {task.status !== "DONE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          handleStatusChange(
                            task.id,
                            task.status === "TODO" ? "IN_PROGRESS" : "DONE"
                          )
                        }
                      >
                        {task.status === "TODO" ? "Start" : "Complete"}
                      </Button>
                    )}
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[#EF4444] p-1 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
