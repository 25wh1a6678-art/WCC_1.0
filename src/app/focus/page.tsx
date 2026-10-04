'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  getActiveCommitment,
  getCommitments,
  getCommitmentStats,
  createCommitment,
} from '@/lib/commitments';
import { getTasks } from '@/lib/tasks';
import { Task } from '@/types/task';
import type { Commitment, CommitmentStats } from '@/types/commitment';
import { FocusTimerCard } from '@/components/focus/FocusTimerCard';
import { CommitmentHistoryTable } from '@/components/focus/CommitmentHistoryTable';
import { DistractionGuardCard } from '@/components/focus/DistractionGuardCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Timer,
  Sparkles,
  Flame,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Plus,
  AlertCircle,
  ArrowRight,
  ListTodo,
} from 'lucide-react';
import Link from 'next/link';

const PRESET_DURATIONS = [
  { minutes: 15, label: '15m', desc: 'Quick Sprint' },
  { minutes: 25, label: '25m', desc: 'Pomodoro Classic' },
  { minutes: 45, label: '45m', desc: 'Deep Work' },
  { minutes: 60, label: '60m', desc: 'Full Block' },
];

function FocusContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTaskId = searchParams.get('taskId');

  const [activeCommitment, setActiveCommitment] = useState<Commitment | null>(null);
  const [history, setHistory] = useState<Commitment[]>([]);
  const [stats, setStats] = useState<CommitmentStats>({
    totalCommitments: 0,
    completedCommitments: 0,
    totalFocusedMinutes: 0,
    activeCommitment: null,
  });
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Commitment Form State
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [isCustomMinutes, setIsCustomMinutes] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState('30');
  const [isStarting, setIsStarting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/focus');
    }
  }, [user, authLoading, router]);

  const [refreshKey, setRefreshKey] = useState(0);
  const reloadData = () => setRefreshKey((k) => k + 1);

  // Load data asynchronously
  useEffect(() => {
    let ignore = false;
    if (!user) return;

    const fetchFocusData = async () => {
      try {
        const [activeRes, histRes, statsRes, tasksRes] = await Promise.all([
          getActiveCommitment(user.id),
          getCommitments(user.id),
          getCommitmentStats(user.id),
          getTasks(user.id, { status: 'pending' }),
        ]);

        if (!ignore) {
          setActiveCommitment(activeRes.data);
          setHistory(histRes.data || []);
          setStats(statsRes);

          const tasks = tasksRes.data || [];
          setPendingTasks(tasks);

          // Pre-select task from query param or default to first pending
          if (preselectedTaskId && tasks.some((t) => t.id === preselectedTaskId)) {
            setSelectedTaskId(preselectedTaskId);
          } else if (tasks.length > 0) {
            setSelectedTaskId((prev) => prev || tasks[0].id);
          }
        }
      } catch (e) {
        if (!ignore) console.error('Error loading focus data:', e);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    fetchFocusData();

    return () => {
      ignore = true;
    };
  }, [user, preselectedTaskId, refreshKey]);

  // Handle Starting a Commitment
  const handleStartCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!user) return;
    if (!selectedTaskId) {
      setFormError('Please select a task to focus on.');
      return;
    }

    const duration = isCustomMinutes ? Number(customMinutesInput) : selectedMinutes;
    if (!duration || duration <= 0 || !Number.isInteger(duration)) {
      setFormError('Please choose a valid duration (minimum 1 minute).');
      return;
    }

    setIsStarting(true);
    try {
      const res = await createCommitment(user.id, {
        taskId: selectedTaskId,
        durationMinutes: duration,
      });

      if (res.error) {
        setFormError(res.error);
      } else {
        reloadData();
      }
    } catch {
      setFormError('Failed to start focus session.');
    } finally {
      setIsStarting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-xs text-slate-500">Preparing Focus Engine...</p>
      </div>
    );
  }

  // Active Focus Mode View
  if (activeCommitment && activeCommitment.task) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4 space-y-8 animate-in fade-in duration-200">
        <div className="text-center space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Live Focus Session
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Focus Contract in Progress
          </h1>
        </div>

        <FocusTimerCard
          commitment={activeCommitment}
          task={activeCommitment.task}
          onSessionEnded={reloadData}
        />
      </div>
    );
  }

  const selectedTask = pendingTasks.find((t) => t.id === selectedTaskId);
  const activeDuration = isCustomMinutes ? Number(customMinutesInput) || 0 : selectedMinutes;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-10 animate-in fade-in duration-200">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <Timer className="w-3.5 h-3.5" />
          Focus Engine (V3)
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Commitment & Focus Mode
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Lock in dedicated time for your academic tasks. Signing a focus commitment turns intentions into action and protects your study flow from distractions.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4 bg-white dark:bg-slate-900">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {stats.completedCommitments}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Completed Contracts
            </div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-white dark:bg-slate-900">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalFocusedMinutes}m
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Total Deep Work
            </div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-white dark:bg-slate-900">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {stats.completedCommitments > 0 ? 'Active' : 'Ready'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Focus Streak Status
            </div>
          </div>
        </Card>
      </div>

      {/* Main Commitment Creation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 sm:p-8 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Sign a New Focus Contract
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Select what you are going to work on and declare your committed time.
            </p>

            {pendingTasks.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/60 space-y-3">
                <ListTodo className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No Pending Tasks Available
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  To start a focus commitment, add a task manually or generate an AI plan from your reflection.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link href="/tasks">
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Task
                    </Button>
                  </Link>
                  <Link href="/reflection">
                    <Button variant="primary" size="sm">
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Voice Reflection
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleStartCommitment} className="space-y-6">
                {/* 1. Task Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    1. Select Academic Task
                  </label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  >
                    {pendingTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.priority.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Duration Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    2. Choose Dedicated Duration
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5">
                    {PRESET_DURATIONS.map((preset) => {
                      const isSelected = !isCustomMinutes && selectedMinutes === preset.minutes;
                      return (
                        <button
                          key={preset.minutes}
                          type="button"
                          onClick={() => {
                            setIsCustomMinutes(false);
                            setSelectedMinutes(preset.minutes);
                          }}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 font-bold'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
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

                  {/* Custom duration */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCustomMinutes(!isCustomMinutes)}
                      className={`text-xs underline underline-offset-2 cursor-pointer ${
                        isCustomMinutes
                          ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {isCustomMinutes ? 'Use preset options' : 'Enter custom duration'}
                    </button>
                    {isCustomMinutes && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={customMinutesInput}
                          onChange={(e) => setCustomMinutesInput(e.target.value)}
                          className="w-20 px-3 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-slate-500">minutes</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Contract Pledge Preview */}
                {selectedTask && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 text-xs font-bold">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Commitment Contract Pledge
                    </div>
                    <p className="text-xs text-indigo-950/80 dark:text-indigo-200 italic leading-relaxed">
                      &ldquo;I hereby commit to dedicating{' '}
                      <span className="font-semibold underline">{activeDuration} minutes</span> entirely to{' '}
                      <span className="font-semibold underline">&ldquo;{selectedTask.title}&rdquo;</span>{' '}
                      without switching to entertainment websites or interrupting my work.&rdquo;
                    </p>
                  </div>
                )}

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isStarting}
                  className="w-full shadow-lg shadow-indigo-600/20"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Sign Contract & Start Focus ({activeDuration}m)
                </Button>
              </form>
            )}
          </Card>
        </div>

        {/* Distraction Guard & Info */}
        <div className="lg:col-span-5 space-y-6">
          <DistractionGuardCard
            key={user?.id}
            userId={user?.id}
            isActive={Boolean(activeCommitment)}
          />

          <Card className="p-6 bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-0 shadow-md">
            <h3 className="text-base font-bold flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-amber-400" />
              The Anti-Procrastination Loop
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Focus Contract doesn&rsquo;t just give you a to-do list. It creates a psychological commitment contract to bridge the gap between <em>&ldquo;I should do this&rdquo;</em> and <em>&ldquo;I actually did it.&rdquo;</em>
            </p>
            <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                  1
                </span>
                <span>Select a single academic task to prevent context-switching.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                  2
                </span>
                <span>Set a realistic timebox (25 or 45 mins work best for deep work).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                  3
                </span>
                <span>Keep the timer in view and complete your goal to build your streak.</span>
              </div>
            </div>
          </Card>

          {/* Quick link to reflection */}
          <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Need to plan your day first?
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Speak or type your daily reflection to generate task ideas.
              </p>
            </div>
            <Link href="/reflection">
              <Button variant="outline" size="sm" className="shrink-0">
                Reflection
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* Past Commitments History */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Focus Commitment History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit log of past focus sessions, completed goals, and reschedules.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {history.length} {history.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        <CommitmentHistoryTable
          commitments={history}
          onCommitmentDeleted={reloadData}
        />
      </div>
    </div>
  );
}

export default function FocusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <FocusContent />
    </Suspense>
  );
}
