'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { TaskSuggestion, TaskPriority } from '@/lib/ai/schemas';
import { createTask } from '@/lib/tasks';
import { Task, PRIORITY_CONFIG } from '@/types/task';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { formatMinutes, formatDate } from '@/lib/utils';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  HelpCircle,
  Check,
} from 'lucide-react';

interface TaskPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksAccepted: (tasks: Task[]) => void;
  onOpenManualCreate: () => void;
}

interface EditableSuggestion extends TaskSuggestion {
  id: string;
  selected: boolean;
  isEditing?: boolean;
}

const EXAMPLE_PROMPTS = [
  "I finished Java lab today, but DBMS normalization assignment is still pending and due tomorrow evening. Also need to study DLD for 45 mins.",
  "I have a computer networks quiz on Thursday, need to read chapter 4, and submit my software engineering diagram by 6 PM.",
  "Need to review math calculus problem set for 30 minutes and prep for physics viva.",
];

export function TaskPlannerModal({
  isOpen,
  onClose,
  onTasksAccepted,
  onOpenManualCreate,
}: TaskPlannerModalProps) {
  const { user } = useAuth();

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<EditableSuggestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Generate plan via API
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSaveSuccessMessage(null);

    const trimmed = input.trim();
    if (!trimmed) {
      setError('Please describe your study tasks or what you need to get done.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { 'x-user-id': user.id } : {}),
        },
        body: JSON.stringify({ input: trimmed }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to generate plan.');
      } else if (data.tasks && data.tasks.length > 0) {
        const mapped: EditableSuggestion[] = data.tasks.map(
          (t: TaskSuggestion, index: number) => ({
            ...t,
            id: `sug-${Date.now()}-${index}`,
            selected: true,
            isEditing: false,
          })
        );
        setSuggestions(mapped);
      } else {
        setError('No actionable tasks could be extracted from your input. Try adding more details.');
      }
    } catch {
      setError('Network error while communicating with AI service. You can still add tasks manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  // Remove single suggestion
  const handleRemove = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  // Toggle editing state
  const handleToggleEdit = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEditing: !s.isEditing } : s))
    );
  };

  // Update fields of a suggestion
  const handleUpdateField = (
    id: string,
    field: keyof TaskSuggestion,
    value: unknown
  ) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // Add another task to review list
  const handleAddCustomSuggestion = () => {
    const newSug: EditableSuggestion = {
      id: `sug-${Date.now()}-custom`,
      title: 'New Study Task',
      description: '',
      priority: 'medium',
      estimated_minutes: 25,
      deadline: null,
      reasoning: 'Manually added to plan',
      selected: true,
      isEditing: true,
    };
    setSuggestions((prev) => [...prev, newSug]);
  };

  // Accept selected and persist using task service
  const handleAcceptSelected = async () => {
    if (!user) {
      setError('Please log in to save tasks.');
      return;
    }

    const selectedTasks = suggestions.filter((s) => s.selected);
    if (selectedTasks.length === 0) {
      setError('Please select at least one task to accept.');
      return;
    }

    setIsSaving(true);
    setError(null);
    const createdList: Task[] = [];
    let failureCount = 0;

    for (const sug of selectedTasks) {
      const res = await createTask(user.id, {
        title: sug.title,
        description: sug.description || '',
        priority: sug.priority,
        estimated_minutes: sug.estimated_minutes,
        deadline: sug.deadline || '',
        status: 'pending',
      });

      if (res.data) {
        createdList.push(res.data);
      } else {
        failureCount++;
      }
    }

    setIsSaving(false);

    if (createdList.length > 0) {
      setSaveSuccessMessage(`Successfully saved ${createdList.length} tasks to your board!`);
      onTasksAccepted(createdList);
      setTimeout(() => {
        setSuggestions([]);
        setInput('');
        onClose();
      }, 1000);
    }

    if (failureCount > 0) {
      setError(`Failed to save ${failureCount} tasks. Please try again.`);
    }
  };

  const handleDiscardAll = () => {
    setSuggestions([]);
    setError(null);
  };

  const selectedCount = suggestions.filter((s) => s.selected).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Task Planner"
      description="Tell us what's on your plate. Gemini extracts structured, prioritized tasks for you to review and confirm."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Success notification */}
        {saveSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {/* STEP 1: Input view (when no suggestions exist) */}
        {suggestions.length === 0 ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                Describe your day or assignments:
              </label>
              <textarea
                rows={4}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. I finished Java lab today, but I still have a DBMS assignment to submit by tomorrow evening, and I need to study for my DLD exam on Friday."
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                disabled={isGenerating}
              />
            </div>

            {/* Quick example prompts */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                Example student reflections:
              </span>
              <div className="flex flex-col gap-1.5">
                {EXAMPLE_PROMPTS.map((example, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInput(example)}
                    className="text-left text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline p-1 rounded transition-colors"
                  >
                    &ldquo;{example}&rdquo;
                  </button>
                ))}
              </div>
            </div>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenManualCreate();
                }}
                className="text-slate-600 dark:text-slate-400"
              >
                Add Tasks Manually
              </Button>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isGenerating}
                  className="gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate My Plan
                </Button>
              </div>
            </div>
          </form>
        ) : (
          /* STEP 2: Plan Review & Confirmation View */
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Suggested Tasks ({suggestions.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Review and customize before saving. Unselected tasks will be discarded.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddCustomSuggestion}
                className="gap-1.5 text-xs text-indigo-600"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Task
              </Button>
            </div>

            {/* Task Suggestions List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {suggestions.map((sug) => {
                const prioInfo = PRIORITY_CONFIG[sug.priority] || PRIORITY_CONFIG.medium;
                return (
                  <div
                    key={sug.id}
                    className={`p-4 rounded-xl border transition-all ${
                      sug.selected
                        ? 'border-indigo-300 dark:border-indigo-800/80 bg-white dark:bg-slate-900 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-60'
                    }`}
                  >
                    {sug.isEditing ? (
                      /* Inline Edit Form */
                      <div className="space-y-3">
                        <Input
                          label="Title"
                          value={sug.title}
                          onChange={(e) => handleUpdateField(sug.id, 'title', e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Priority
                            </label>
                            <select
                              value={sug.priority}
                              onChange={(e) => handleUpdateField(sug.id, 'priority', e.target.value as TaskPriority)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                          <Input
                            label="Duration (mins)"
                            type="number"
                            min={1}
                            max={480}
                            value={sug.estimated_minutes}
                            onChange={(e) =>
                              handleUpdateField(
                                sug.id,
                                'estimated_minutes',
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                          />
                        </div>
                        <div className="flex justify-end pt-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleToggleEdit(sug.id)}
                            className="gap-1 text-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Done Editing
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Display Suggestion */
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={sug.selected}
                          onChange={() => handleToggleSelect(sug.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {sug.title}
                            </span>
                            <Badge className={`${prioInfo.bg} ${prioInfo.color} ${prioInfo.border}`}>
                              {prioInfo.label}
                            </Badge>
                          </div>

                          {sug.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                              {sug.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatMinutes(sug.estimated_minutes)}
                            </span>
                            {sug.deadline && (
                              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <Calendar className="w-3 h-3" />
                                {formatDate(sug.deadline)}
                              </span>
                            )}
                          </div>

                          {sug.reasoning && (
                            <p className="mt-2 text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                              💡 <strong>AI Note:</strong> {sug.reasoning}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleEdit(sug.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit suggestion"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(sug.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remove suggestion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDiscardAll}
                disabled={isSaving}
                className="text-slate-500"
              >
                Discard All
              </Button>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSuggestions([])}
                  disabled={isSaving}
                >
                  Edit Input
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAcceptSelected}
                  isLoading={isSaving}
                  disabled={selectedCount === 0 || isSaving}
                  className="gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Accept Selected ({selectedCount})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
