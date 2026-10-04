'use client';

import React, { useState } from 'react';
import { Task, PRIORITY_CONFIG, STATUS_CONFIG } from '@/types/task';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatMinutes, isOverdue } from '@/lib/utils';
import {
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  MoreVertical,
  Pencil,
  Trash2,
  AlertCircle,
  Timer,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (task: Task) => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void>;
  onCommit?: (task: Task) => void;
}

export function TaskCard({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  onCommit,
}: TaskCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const isCompleted = task.status === 'completed';
  const overdue = !isCompleted && isOverdue(task.deadline);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggleComplete(task);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete(task.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <Card
      hoverEffect
      className={`transition-all duration-200 border-l-4 ${
        isCompleted
          ? 'border-l-emerald-500 bg-slate-50/50 dark:bg-slate-900/40 opacity-75'
          : task.priority === 'urgent'
          ? 'border-l-red-500'
          : task.priority === 'high'
          ? 'border-l-amber-500'
          : 'border-l-indigo-500'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Toggle complete button */}
        <button
          onClick={handleToggle}
          disabled={isToggling}
          aria-label={isCompleted ? 'Mark pending' : 'Mark complete'}
          className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-50 dark:fill-emerald-950" />
          ) : (
            <Circle className="w-5 h-5 hover:scale-110 transition-transform" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h4
              className={`text-base font-semibold leading-snug break-words ${
                isCompleted
                  ? 'line-through text-slate-500 dark:text-slate-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {task.title}
            </h4>
          </div>

          {task.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 whitespace-pre-line line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Badges & Meta info */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <Badge className={`${priorityInfo.bg} ${priorityInfo.color} ${priorityInfo.border}`}>
              {priorityInfo.label}
            </Badge>

            <Badge className={`${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
              {statusInfo.label}
            </Badge>

            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {formatMinutes(task.estimated_minutes)}
            </span>

            {task.deadline && (
              <span
                className={`inline-flex items-center gap-1 ${
                  overdue ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {overdue ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                )}
                {formatDate(task.deadline)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isCompleted && onCommit && (
            <button
              onClick={() => onCommit(task)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 dark:text-indigo-300 transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800 shadow-xs"
              title="Start Focus Commitment Contract"
            >
              <Timer className="w-3.5 h-3.5" />
              Focus
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-7 z-30 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 text-xs">
                  {!isCompleted && onCommit && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onCommit(task);
                      }}
                      className="w-full px-3 py-1.5 text-left text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Timer className="w-3.5 h-3.5" />
                      Start Focus
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(task);
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Task
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleDelete();
                    }}
                    disabled={isDeleting}
                    className="w-full px-3 py-1.5 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
