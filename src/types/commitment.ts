import { Task } from './task';

export type CommitmentStatus =
  | 'scheduled'
  | 'active'
  | 'completed'
  | 'rescheduled'
  | 'abandoned';

export interface Commitment {
  id: string;
  user_id: string;
  task_id: string;
  duration_minutes: number;
  status: CommitmentStatus;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  task?: Task;
}

export interface CreateCommitmentData {
  taskId: string;
  durationMinutes: number;
  status?: CommitmentStatus;
}

export interface UpdateCommitmentData {
  status?: CommitmentStatus;
  completedAt?: string | null;
  durationMinutes?: number;
}

export interface CommitmentStats {
  totalCommitments: number;
  completedCommitments: number;
  totalFocusedMinutes: number;
  activeCommitment: Commitment | null;
}

export const COMMITMENT_STATUS_CONFIG: Record<
  CommitmentStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  scheduled: {
    label: 'Scheduled',
    color: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-300 dark:border-slate-700',
  },
  active: {
    label: 'In Focus',
    color: 'text-indigo-700 dark:text-indigo-300',
    bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  rescheduled: {
    label: 'Rescheduled',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    border: 'border-amber-200 dark:border-amber-800',
  },
  abandoned: {
    label: 'Abandoned',
    color: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    border: 'border-rose-200 dark:border-rose-800',
  },
};
