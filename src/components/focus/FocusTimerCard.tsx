'use client';

import React, { useState } from 'react';
import { Commitment } from '@/types/commitment';
import { Task, PRIORITY_CONFIG } from '@/types/task';
import { useFocusTimer } from '@/lib/hooks/useFocusTimer';
import {
  completeCommitment,
  rescheduleCommitment,
  abandonCommitment,
} from '@/lib/commitments';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  XCircle,
  Sparkles,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface FocusTimerCardProps {
  commitment: Commitment;
  task: Task;
  onSessionEnded: () => void;
}

export function FocusTimerCard({
  commitment,
  task,
  onSessionEnded,
}: FocusTimerCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isAbandonding, setIsAbandoning] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [newMinutes, setNewMinutes] = useState('25');
  const [isSessionCompleteModal, setIsSessionCompleteModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const priorityInfo = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  const timer = useFocusTimer({
    durationMinutes: commitment.duration_minutes,
    startedAt: commitment.started_at,
    taskTitle: task.title,
    onFinish: () => {
      setIsSessionCompleteModal(true);
    },
  });

  // Handle Complete
  const handleComplete = async () => {
    setActionError(null);
    setIsCompleting(true);
    try {
      const result = await completeCommitment(commitment.id, true);
      if (result.error) {
        setActionError(result.error);
      } else {
        onSessionEnded();
      }
    } catch (e) {
      console.error('Error completing commitment:', e);
      setActionError('Could not complete this focus contract. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Handle Abandon
  const handleAbandon = async () => {
    if (confirm('Are you sure you want to abandon this focus contract? Your streak progress will not be updated.')) {
      setActionError(null);
      setIsAbandoning(true);
      try {
        const result = await abandonCommitment(commitment.id);
        if (result.error) setActionError(result.error);
        else onSessionEnded();
      } catch (e) {
        console.error('Error abandoning commitment:', e);
        setActionError('Could not abandon this focus contract. Please try again.');
      } finally {
        setIsAbandoning(false);
      }
    }
  };

  // Handle Reschedule
  const handleReschedule = async () => {
    const mins = Number(newMinutes);
    if (!mins || mins <= 0) return;

    setActionError(null);
    setIsRescheduling(true);
    try {
      const result = await rescheduleCommitment(commitment.id, mins);
      if (result.error) {
        setActionError(result.error);
      } else {
        setShowRescheduleDialog(false);
        onSessionEnded();
      }
    } catch (e) {
      console.error('Error rescheduling commitment:', e);
      setActionError('Could not reschedule this focus contract. Please try again.');
    } finally {
      setIsRescheduling(false);
    }
  };

  // SVG circular ring metrics
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timer.progressPercent / 100) * circumference;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Active Focus Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-10 text-center">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header / Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 mb-8">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              Focus Contract Active
            </span>
            <Badge className={`${priorityInfo.bg} ${priorityInfo.color} ${priorityInfo.border}`}>
              {priorityInfo.label} Priority
            </Badge>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Committed for {commitment.duration_minutes} min
          </span>
        </div>

        {/* Task Title & Pledge */}
        <div className="space-y-2 mb-8 relative z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {task.title}
          </h2>
          {task.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Circular Countdown Ring */}
        <div className="relative inline-flex items-center justify-center my-4 z-10">
          <svg className="w-64 h-64 sm:w-72 sm:h-72 transform -rotate-90">
            {/* Background track circle */}
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-slate-100 dark:text-slate-800"
            />
            {/* Animated progress circle */}
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className={`transition-all duration-500 ease-linear ${
                timer.isFinished
                  ? 'text-emerald-500'
                  : timer.isPaused
                  ? 'text-amber-500'
                  : 'text-indigo-600 dark:text-indigo-500'
              }`}
            />
          </svg>

          {/* Center Digital Display */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {timer.formattedTime}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-2">
              {timer.isFinished
                ? 'Goal Reached! 🎉'
                : timer.isPaused
                ? 'Session Paused'
                : `${timer.progressPercent}% Focused`}
            </span>
          </div>
        </div>

        {/* Contract Reminder Message */}
        <div className="max-w-md mx-auto my-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 relative z-10">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Keep this tab open. Avoid social media until the timer completes.</span>
        </div>

        {actionError && (
          <div role="alert" className="relative z-10 max-w-md mx-auto mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-left text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {actionError}
          </div>
        )}

        {/* Primary Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 relative z-10 pt-2">
          {/* Pause / Resume */}
          <Button
            variant="outline"
            size="md"
            onClick={timer.togglePause}
            className="flex items-center gap-2"
          >
            {timer.isPaused ? (
              <>
                <Play className="w-4 h-4 fill-current text-indigo-600 dark:text-indigo-400" />
                Resume Focus
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                Pause Timer
              </>
            )}
          </Button>

          {/* Complete Early */}
          <Button
            variant="primary"
            size="md"
            onClick={handleComplete}
            isLoading={isCompleting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Complete Task & Session
          </Button>

          {/* Reschedule */}
          <Button
            variant="ghost"
            size="md"
            onClick={() => setShowRescheduleDialog(true)}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reschedule
          </Button>

          {/* Abandon */}
          <Button
            variant="ghost"
            size="md"
            onClick={handleAbandon}
            isLoading={isAbandonding}
            className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            Abandon
          </Button>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-indigo-600" />
              Reschedule Focus Session
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Need more or less time? You can adjust the commitment duration or postpone.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Duration (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="180"
                value={newMinutes}
                onChange={(e) => setNewMinutes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRescheduleDialog(false)}
                disabled={isRescheduling}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleReschedule}
                isLoading={isRescheduling}
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Timer Finished Completion Banner */}
      {isSessionCompleteModal && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-950 dark:text-emerald-200">
              Time&rsquo;s Up! Focus Contract Completed!
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-sm mx-auto mt-1">
              You stayed focused on &ldquo;{task.title}&rdquo; for {commitment.duration_minutes} minutes.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={handleComplete}
              isLoading={isCompleting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Save & Mark Task Completed
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
