'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
} from '@/lib/tasks';
import { Task, TaskFilterOptions, TaskFormData } from '@/types/task';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import { TaskPlannerModal } from '@/components/ai/TaskPlannerModal';
import { CommitmentModal } from '@/components/focus/CommitmentModal';
import { TaskFilter } from '@/components/tasks/TaskFilter';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Plus, CheckSquare, AlertCircle, Sparkles } from 'lucide-react';

export default function TasksPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasksCount, setAllTasksCount] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskForCommitment, setTaskForCommitment] = useState<Task | null>(null);

  // Filter state
  const [filter, setFilter] = useState<TaskFilterOptions>({
    status: 'all',
    priority: 'all',
    searchQuery: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const [, startTransition] = useTransition();

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/tasks');
    }
  }, [user, authLoading, router]);

  const handleFilterChange = (newFilter: TaskFilterOptions) => {
    setIsLoading(true);
    setFilter(newFilter);
  };

  useEffect(() => {
    let isCancelled = false;
    if (!user) return;

    const loadData = async () => {
      try {
        const res = await getTasks(user.id, filter);
        if (!isCancelled) {
          if (res.error) {
            setError(res.error);
          } else {
            setTasks(res.data);
          }
        }
        const countsRes = await getTasks(user.id);
        if (!isCancelled && countsRes.data) {
          setAllTasksCount(countsRes.data);
        }
      } catch {
        if (!isCancelled) {
          setError('Failed to fetch tasks.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [user, filter]);

  // Task actions
  const handleOpenCreateModal = () => {
    setTaskToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (formData: TaskFormData) => {
    if (!user) return { error: 'Not authenticated' };

    if (taskToEdit) {
      // Update
      const res = await updateTask(taskToEdit.id, user.id, formData);
      if (res.error) return { error: res.error };
      if (res.data) {
        startTransition(() => {
          setTasks((prev) =>
            prev.map((t) => (t.id === taskToEdit.id ? (res.data as Task) : t))
          );
          setAllTasksCount((prev) =>
            prev.map((t) => (t.id === taskToEdit.id ? (res.data as Task) : t))
          );
        });
      }
      return { error: null };
    } else {
      // Create
      const res = await createTask(user.id, formData);
      if (res.error) return { error: res.error };
      if (res.data) {
        startTransition(() => {
          setTasks((prev) => [res.data as Task, ...prev]);
          setAllTasksCount((prev) => [res.data as Task, ...prev]);
        });
      }
      return { error: null };
    }
  };

  const handleToggleComplete = async (task: Task) => {
    if (!user) return;
    const res = await toggleTaskComplete(task.id, user.id, task.status);
    if (!res.error && res.data) {
      startTransition(() => {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? (res.data as Task) : t))
        );
        setAllTasksCount((prev) =>
          prev.map((t) => (t.id === task.id ? (res.data as Task) : t))
        );
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    const res = await deleteTask(taskId, user.id);
    if (!res.error) {
      startTransition(() => {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setAllTasksCount((prev) => prev.filter((t) => t.id !== taskId));
      });
    } else {
      alert(`Could not delete task: ${res.error}`);
    }
  };

  if (authLoading || (!user && isLoading)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-slate-500">Loading student tasks...</p>
      </div>
    );
  }

  if (!user) return null;

  const counts = {
    all: allTasksCount.length,
    pending: allTasksCount.filter((t) => t.status === 'pending').length,
    in_progress: allTasksCount.filter((t) => t.status === 'in_progress').length,
    completed: allTasksCount.filter((t) => t.status === 'completed').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Task Management
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Organize, prioritize, and estimate your academic assignments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAiModalOpen(true)}
            variant="outline"
            className="gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            AI Plan Tasks
          </Button>

          <Button
            onClick={handleOpenCreateModal}
            variant="primary"
            className="gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 sm:p-5">
        <TaskFilter
          filter={filter}
          onChange={handleFilterChange}
          counts={counts}
        />
      </Card>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Task list container */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <LoadingSpinner size="md" />
          <p className="mt-3 text-xs text-slate-500">Filtering tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <Card className="text-center py-16 px-4 border-dashed border-2 border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 mx-auto mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            {filter.searchQuery || filter.status !== 'all' || filter.priority !== 'all'
              ? 'No matching tasks found'
              : 'No tasks on your board'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
            {filter.searchQuery || filter.status !== 'all' || filter.priority !== 'all'
              ? 'Try changing your search keywords or resetting your active filters.'
              : 'Add your first academic task with estimated duration and priority.'}
          </p>
          <Button
            onClick={handleOpenCreateModal}
            variant="primary"
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteTask}
              onCommit={(task) => setTaskForCommitment(task)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        taskToEdit={taskToEdit}
      />

      {/* AI Task Planner Modal */}
      <TaskPlannerModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onTasksAccepted={(newTasks) => {
          setTasks((prev) => [...newTasks, ...prev]);
          setAllTasksCount((prev) => [...newTasks, ...prev]);
        }}
        onOpenManualCreate={handleOpenCreateModal}
      />

      {/* Commitment Modal */}
      {taskForCommitment && user && (
        <CommitmentModal
          isOpen={!!taskForCommitment}
          onClose={() => setTaskForCommitment(null)}
          task={taskForCommitment}
          userId={user.id}
        />
      )}
    </div>
  );
}
