import { Database } from './database.types';

export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskFilterOptions {
  status: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  searchQuery?: string;
  sortBy?: 'created_at' | 'deadline' | 'priority' | 'estimated_minutes';
  sortOrder?: 'asc' | 'desc';
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  estimated_minutes: number;
  deadline: string;
  status: TaskStatus;
}

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string; bg: string; border: string; weight: number }
> = {
  urgent: {
    label: 'Urgent',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-900',
    weight: 4,
  },
  high: {
    label: 'High',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-900',
    weight: 3,
  },
  medium: {
    label: 'Medium',
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-900',
    weight: 2,
  },
  low: {
    label: 'Low',
    color: 'text-slate-700 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    weight: 1,
  },
};

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  pending: {
    label: 'Pending',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-indigo-700 dark:text-indigo-300',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
  },
};
