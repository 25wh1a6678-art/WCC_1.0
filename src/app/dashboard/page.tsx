'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getTasks, toggleTaskComplete, createTask } from '@/lib/tasks';
import { Task, TaskFormData } from '@/types/task';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import { TaskPlannerModal } from '@/components/ai/TaskPlannerModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatMinutes, getGreeting } from '@/lib/utils';
import {
  CheckSquare,
  Plus,
  Flame,
  Coins,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/dashboard');
    }
  }, [user, authLoading, router]);

  // Load tasks
  useEffect(() => {
    let ignore = false;
    if (!user) return;

    const fetchTasks = async () => {
      try {
        const res = await getTasks(user.id);
        if (!ignore) {
          if (res.error) {
            setError(res.error);
          } else {
            setTasks(res.data);
          }
        }
      } catch {
        if (!ignore) {
          setError('An unexpected error occurred while loading tasks.');
        }
      } finally {
        if (!ignore) {
          setTasksLoading(false);
        }
      }
    };

    fetchTasks();

    return () => {
      ignore = true;
    };
  }, [user]);

  const handleToggleComplete = async (task: Task) => {
    if (!user) return;
    const res = await toggleTaskComplete(task.id, user.id, task.status);
    if (!res.error && res.data) {
      startTransition(() => {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? (res.data as Task) : t))
        );
      });
    }
  };

  const handleCreateTask = async (formData: TaskFormData) => {
    if (!user) return { error: 'Not authenticated' };
    const res = await createTask(user.id, formData);
    if (!res.error && res.data) {
      setTasks((prev) => [res.data as Task, ...prev]);
      return { error: null };
    }
    return { error: res.error || 'Failed to create task' };
  };

  if (authLoading || (!user && tasksLoading)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-slate-500">Loading student workspace...</p>
      </div>
    );
  }

  if (!user) return null;

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const totalFocusMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Recent tasks (show max 4 on dashboard)
  const recentTasks = tasks.slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Student Workspace
            </span>
            <Badge variant="neutral">V0 Foundation</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {getGreeting()}, {user.name} 👋
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Ready to convert procrastination into focused follow-through?
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAiModalOpen(true)}
            variant="outline"
            className="gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            AI Task Planner
          </Button>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
            className="gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Progress & Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Tasks</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {totalTasks}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {pendingTasks} pending • {formatMinutes(totalFocusMinutes)} planned
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <CheckSquare className="w-5 h-5" />
          </div>
        </Card>

        {/* Task Completion Progress */}
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completion Rate</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {completionPercentage}%
            </h3>
            <div className="w-28 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        {/* Focus Coins (V5 Milestone) */}
        <Card className="p-5 flex items-center justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">FocusCoins</p>
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono">
                V5
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              0 <span className="text-xs font-normal text-slate-400">coins</span>
            </h3>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
              Earn on task completion in V5
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Coins className="w-5 h-5" />
          </div>
        </Card>

        {/* Daily Streak (V5 Milestone) */}
        <Card className="p-5 flex items-center justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Study Streak</p>
              <span className="text-[9px] px-1 py-0.2 rounded bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-mono">
                V5
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              0 <span className="text-xs font-normal text-slate-400">days</span>
            </h3>
            <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5">
              Streak active in V5
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <Flame className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Focus Contract Loop Callout */}
      <Card className="bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-slate-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/40 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Focus Contract Workflow: Reflect → Plan → Commit → Focus
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              In V0, manual tasks provide the deterministic backbone. In upcoming versions, you will be able to speak your daily reflection (V2), let Gemini AI extract your actionable plan (V1), and trigger browser blocking during commitments (V3-V4).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href="/reflection">
              <Button variant="outline" size="sm" className="gap-1.5">
                Preview Reflection (V2)
              </Button>
            </Link>
            <Link href="/focus">
              <Button variant="outline" size="sm" className="gap-1.5">
                Preview Focus Mode (V3)
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Recent Tasks List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Tasks</h2>
            <Badge variant="neutral">{tasks.length} total</Badge>
          </div>
          <Link href="/tasks">
            <Button variant="ghost" size="sm" className="gap-1 text-indigo-600 hover:text-indigo-700">
              View All Tasks
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {tasksLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : recentTasks.length === 0 ? (
          <Card className="text-center py-12 px-4 border-dashed border-2 border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 mx-auto mb-3">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              No tasks created yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
              Start by creating your first academic task with estimated duration and priority.
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              variant="primary"
              size="sm"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Task
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={() => router.push('/tasks')}
                onDelete={async (id) => {
                  setTasks((prev) => prev.filter((t) => t.id !== id));
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      <TaskFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
      />

      {/* AI Task Planner Modal */}
      <TaskPlannerModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onTasksAccepted={(newTasks) => {
          setTasks((prev) => [...newTasks, ...prev]);
        }}
        onOpenManualCreate={() => setIsCreateModalOpen(true)}
      />
    </div>
  );
}
