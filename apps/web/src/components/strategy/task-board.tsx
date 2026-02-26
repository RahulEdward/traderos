"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Plus,
  Calendar,
  GripVertical,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TASK_PRIORITY_CONFIG, TASK_TYPE_CONFIG } from "@tradeos/shared";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  taskType: string;
  priority: string;
  status: string;
  dueDate?: string | null;
  createdAt: string;
  strategy?: { id: string; name: string } | null;
}

interface TaskBoardProps {
  strategyId: string;
  tasks: Task[];
  onRefresh: () => void;
}

const COLUMNS = [
  { key: "TODO", label: "To Do", color: "#3B82F6" },
  { key: "IN_PROGRESS", label: "In Progress", color: "#F59E0B" },
  { key: "DONE", label: "Done", color: "#10B981" },
  { key: "SKIPPED", label: "Skipped", color: "#6B7280" },
];

function AddTaskPanel({
  strategyId,
  onCreated,
  onClose,
  defaultTitle,
}: {
  strategyId: string;
  onCreated: () => void;
  onClose: () => void;
  defaultTitle?: string;
}) {
  const [title, setTitle] = useState(defaultTitle || "");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("RESEARCH");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          strategyId,
          taskType,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        onCreated();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#F1F5F9]">Add Task</span>
        <button onClick={onClose} className="text-[#475569] hover:text-[#F1F5F9]">
          <X className="h-4 w-4" />
        </button>
      </div>
      <input
        type="text"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-sm bg-[#050505] border border-[#1A1A1A] rounded-lg px-3 py-2 text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6]"
        autoFocus
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full text-sm bg-[#050505] border border-[#1A1A1A] rounded-lg px-3 py-2 text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#3B82F6] resize-none"
      />
      <div className="grid grid-cols-3 gap-2">
        <select
          value={taskType}
          onChange={(e) => setTaskType(e.target.value)}
          className="text-xs bg-[#050505] border border-[#1A1A1A] rounded-lg px-2 py-1.5 text-[#94A3B8]"
        >
          {Object.entries(TASK_TYPE_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="text-xs bg-[#050505] border border-[#1A1A1A] rounded-lg px-2 py-1.5 text-[#94A3B8]"
        >
          {Object.entries(TASK_PRIORITY_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="text-xs bg-[#050505] border border-[#1A1A1A] rounded-lg px-2 py-1.5 text-[#94A3B8]"
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!title.trim() || saving}
        size="sm"
        className="w-full bg-[#3B82F6] hover:bg-[#2563EB]"
      >
        {saving ? "Creating..." : "Create Task"}
      </Button>
    </div>
  );
}

function TaskCard({
  task,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const typeConfig = TASK_TYPE_CONFIG[task.taskType as keyof typeof TASK_TYPE_CONFIG];
  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority as keyof typeof TASK_PRIORITY_CONFIG];

  return (
    <div className="bg-[#050505] border border-[#1A1A1A] rounded-lg p-3 group hover:border-[#3B82F6]/30 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm text-[#F1F5F9] font-medium leading-tight flex-1">
          {task.title}
        </p>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-[#475569] hover:text-[#EF4444] transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-[#475569] mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-1.5 mb-2">
        <Badge
          className="text-[10px] px-1.5 py-0"
          style={{ backgroundColor: `${typeConfig?.color}20`, color: typeConfig?.color }}
        >
          {typeConfig?.label}
        </Badge>
        <Badge
          className="text-[10px] px-1.5 py-0"
          style={{ backgroundColor: `${priorityConfig?.color}20`, color: priorityConfig?.color }}
        >
          {priorityConfig?.label}
        </Badge>
      </div>

      {task.dueDate && (
        <div className="flex items-center gap-1 text-[10px] text-[#475569] mb-2">
          <Calendar className="h-3 w-3" />
          {format(new Date(task.dueDate), "dd MMM yyyy")}
        </div>
      )}

      {/* Status change buttons */}
      <div className="flex gap-1 mt-2">
        {COLUMNS.filter((c) => c.key !== task.status).map((col) => (
          <button
            key={col.key}
            onClick={() => onStatusChange(task.id, col.key)}
            className="text-[10px] px-2 py-0.5 rounded border border-[#1A1A1A] text-[#475569] hover:text-[#F1F5F9] hover:border-[#3B82F6]/30 transition-colors"
          >
            {col.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TaskBoard({ strategyId, tasks, onRefresh }: TaskBoardProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [defaultTitle, setDefaultTitle] = useState("");

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onRefresh();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      onRefresh();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Public method for parent to call
  const addTaskWithTitle = (title: string) => {
    setDefaultTitle(title);
    setShowAddTask(true);
  };

  return (
    <div>
      {/* Add Task */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-[#475569]">{tasks.length} tasks</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDefaultTitle("");
            setShowAddTask(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Task
        </Button>
      </div>

      {showAddTask && (
        <div className="mb-4">
          <AddTaskPanel
            strategyId={strategyId}
            defaultTitle={defaultTitle}
            onCreated={onRefresh}
            onClose={() => setShowAddTask(false)}
          />
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-xs font-medium text-[#94A3B8]">{col.label}</span>
                <span className="text-[10px] text-[#475569]">({columnTasks.length})</span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
