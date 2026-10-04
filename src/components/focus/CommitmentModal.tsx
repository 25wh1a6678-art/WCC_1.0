'use client';

import React, { useState } from 'react';
import { Task } from '@/types/task';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PRIORITY_CONFIG } from '@/types/task';
import {
  Timer,
  ShieldCheck,
  Sparkles,
  X,
  AlertCircle,
} from 'lucide-react';
import { createCommitment } from '@/lib/commitments';
import { useRouter } from 'next/navigation';

interface CommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  userId: string;
  onSuccess?: () => void;
}

const PRESET_DURATIONS = [
  { minutes: 15, label: '15m', desc: 'Quick Sprint' },
  { minutes: 25, label: '25m', desc: 'Pomodoro' },
  { minutes: 45, label: '45m', desc: 'Deep Work' },
  { minutes: 60, label: '60m', desc: 'Full Session' },
];

export function CommitmentModal({
  isOpen,
  onClose,
  task,
  userId,
  onSuccess,
}: CommitmentModalProps) {
  const router = useRouter();
  const [selectedMinutes, setSelectedMinutes] = useState<number>(
    task.estimated_minutes && task.estimated_minutes > 0 ? task.estimated_minutes : 25
  );
  const [isCustom, setIsCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const activeDuration = isCustom ? Number(customMinutes) || 0 : selectedMinutes;

  const handleStartCommitment = async () => {
    setError(null);
    if (activeDuration <= 0) {
      setError('Please select or enter a valid duration of at least 1 minute.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCommitment(userId, {
        taskId: task.id,
        durationMinutes: activeDuration,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onSuccess?.();
        onClose();
        router.push('/focus');
      }
    } catch {
      setError('Failed to create focus commitment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Focus Commitment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lock in dedicated distraction-free time for this task
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Task Preview Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Committed Task
              </span>
              <Badge className={`${priorityInfo.bg} ${priorityInfo.color} ${priorityInfo.border}`}>
                {priorityInfo.label}
              </Badge>
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Select Focus Duration
            </label>
            <div className="grid grid-cols-4 gap-2.5 mb-2.5">
              {PRESET_DURATIONS.map((preset) => {
                const isSelected = !isCustom && selectedMinutes === preset.minutes;
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => {
                      setIsCustom(false);
                      setSelectedMinutes(preset.minutes);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="text-base font-bold">{preset.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom duration toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCustom(!isCustom)}
                className={`text-xs font-medium cursor-pointer underline underline-offset-2 ${
                  isCustom ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {isCustom ? 'Use preset options' : 'Enter custom duration'}
              </button>
              {isCustom && (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    placeholder="e.g. 35"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="w-24 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">minutes</span>
                </div>
              )}
            </div>
          </div>

          {/* Commitment Contract Pledge */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Focus Contract Pledge
                </span>
                <p className="text-xs text-indigo-900/80 dark:text-indigo-300 leading-relaxed italic">
                  &ldquo;I commit to focusing exclusively on{' '}
                  <span className="font-semibold underline">{task.title}</span> for the next{' '}
                  <span className="font-semibold">{activeDuration || '...'} minutes</span> without digital distractions.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleStartCommitment}
            isLoading={isSubmitting}
            className="shadow-md shadow-indigo-500/20"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Sign & Begin Focus ({activeDuration}m)
          </Button>
        </div>
      </div>
    </div>
  );
}
