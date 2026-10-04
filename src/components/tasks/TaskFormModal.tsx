'use client';

import React, { useState } from 'react';
import { Task, TaskFormData, TaskPriority, TaskStatus } from '@/types/task';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: TaskFormData) => Promise<{ error: string | null }>;
  taskToEdit?: Task | null;
}

function formatDateForInput(dateString?: string | null): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function TaskFormInner({
  onClose,
  onSubmit,
  taskToEdit,
}: {
  onClose: () => void;
  onSubmit: (formData: TaskFormData) => Promise<{ error: string | null }>;
  taskToEdit?: Task | null;
}) {
  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(taskToEdit?.priority || 'medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState(taskToEdit?.estimated_minutes || 25);
  const [deadline, setDeadline] = useState(() => formatDateForInput(taskToEdit?.deadline));
  const [status, setStatus] = useState<TaskStatus>(taskToEdit?.status || 'pending');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!title.trim()) {
      setFormError('Please enter a task title.');
      return;
    }

    if (estimatedMinutes <= 0) {
      setFormError('Estimated minutes must be at least 1 minute.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit({
        title: title.trim(),
        description: description.trim(),
        priority,
        estimated_minutes: Number(estimatedMinutes),
        deadline,
        status,
      });

      if (result.error) {
        setFormError(result.error);
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
          {formError}
        </div>
      )}

      <Input
        label="Task Title"
        required
        placeholder="e.g. Complete DLD assignment questions 1-5"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isSubmitting}
      />

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Description (Optional)
        </label>
        <textarea
          rows={3}
          className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
          placeholder="Add relevant notes, chapters, or textbook references..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            disabled={isSubmitting}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <Input
          label="Estimated Minutes"
          type="number"
          min={1}
          max={480}
          required
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(Math.max(1, parseInt(e.target.value) || 1))}
          disabled={isSubmitting}
          helperText="Suggested focus window (1-480m)"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Deadline (Optional)"
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          disabled={isSubmitting}
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            disabled={isSubmitting}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
        >
          {taskToEdit ? 'Save Changes' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}

export function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  taskToEdit,
}: TaskFormModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskToEdit ? 'Edit Task' : 'Create New Task'}
      description={
        taskToEdit
          ? 'Update the details for this task.'
          : 'Define a specific, manageable task with clear priority and duration.'
      }
      maxWidth="md"
    >
      <TaskFormInner
        key={taskToEdit?.id || 'new-task'}
        onClose={onClose}
        onSubmit={onSubmit}
        taskToEdit={taskToEdit}
      />
    </Modal>
  );
}
