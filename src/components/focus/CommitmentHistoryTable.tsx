'use client';

import React from 'react';
import { Commitment, COMMITMENT_STATUS_CONFIG } from '@/types/commitment';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import {
  Clock,
  Calendar,
  Trash2,
} from 'lucide-react';
import { deleteCommitment } from '@/lib/commitments';

interface CommitmentHistoryTableProps {
  commitments: Commitment[];
  onCommitmentDeleted?: () => void;
}

export function CommitmentHistoryTable({
  commitments,
  onCommitmentDeleted,
}: CommitmentHistoryTableProps) {
  if (commitments.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/60">
        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No Focus Commitments Yet
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
          Pick a task from above and sign your first focus contract to build your study streak.
        </p>
      </div>
    );
  }

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Remove focus commitment history for "${title}"?`)) {
      await deleteCommitment(id);
      onCommitmentDeleted?.();
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {commitments.map((c) => {
          const statusConfig = COMMITMENT_STATUS_CONFIG[c.status] || COMMITMENT_STATUS_CONFIG.completed;
          const taskTitle = c.task?.title || 'Academic Task';

          return (
            <div
              key={c.id}
              className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-850 transition-colors"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {taskTitle}
                  </h4>
                  <Badge className={`${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {c.duration_minutes} minutes
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(c.started_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDelete(c.id, taskTitle)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Delete record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
