'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import { createReflection, getReflections, DailyReflection } from '@/lib/reflections';
import { createTask } from '@/lib/tasks';
import { TaskSuggestion, TaskPriority } from '@/lib/ai/schemas';
import { PRIORITY_CONFIG } from '@/types/task';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatMinutes, formatDate } from '@/lib/utils';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  History,
  RotateCcw,
  Check,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface EditableSuggestion extends TaskSuggestion {
  id: string;
  selected: boolean;
  isEditing?: boolean;
}

const GUIDED_PROMPTS = [
  'What assignments or lectures did you work on today?',
  'What academic deadlines are coming up in the next 48 hours?',
  'What is one task you have been postponing that we can break down?',
];

export default function ReflectionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Reflection text state
  const [reflectionText, setReflectionText] = useState('');

  // AI Generation & Suggestions state
  const [isGenerating, setIsGenerating] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<EditableSuggestion[]>([]);
  const [isSavingTasks, setIsSavingTasks] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Reflection history state
  const [reflectionsHistory, setReflectionsHistory] = useState<DailyReflection[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<DailyReflection | null>(null);

  // Speech Recognition hook with direct transcript callback
  const {
    isSupported: isSpeechSupported,
    state: speechState,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    clearTranscript,
    setTranscript,
  } = useSpeechRecognition({
    onTranscriptChange: (newText) => {
      setReflectionText(newText);
    },
  });

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/reflection');
    }
  }, [user, authLoading, router]);

  // Load reflection history
  useEffect(() => {
    let ignore = false;
    if (!user) return;

    const fetchReflections = async () => {
      try {
        const res = await getReflections(user.id);
        if (!ignore && res.data) {
          setReflectionsHistory(res.data);
        }
      } catch {
        console.error('Failed to load reflection history');
      } finally {
        if (!ignore) {
          setHistoryLoading(false);
        }
      }
    };

    fetchReflections();

    return () => {
      ignore = true;
    };
  }, [user]);

  // Voice toggle handler
  const handleToggleVoice = () => {
    if (speechState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  // Clear text and transcript
  const handleClear = () => {
    setReflectionText('');
    clearTranscript();
    setPlanError(null);
    setSaveSuccessMessage(null);
  };

  // Generate Plan: Saves reflection to daily_reflections and calls V1 AI plan API
  const handleGeneratePlan = async () => {
    if (!user) return;
    const trimmed = reflectionText.trim();
    if (!trimmed) {
      setPlanError('Please speak or type your reflection before generating a plan.');
      return;
    }

    if (speechState === 'listening') {
      stopListening();
    }

    setIsGenerating(true);
    setPlanError(null);
    setSaveSuccessMessage(null);

    try {
      // 1. Save reflection to database
      const refRes = await createReflection(user.id, trimmed);
      if (refRes.data) {
        setReflectionsHistory((prev) => [refRes.data as DailyReflection, ...prev]);
      }

      // 2. Call existing V1 /api/ai/plan route
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ input: trimmed }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setPlanError(data.error || 'Failed to generate plan from your reflection.');
      } else if (data.tasks && data.tasks.length > 0) {
        const mapped: EditableSuggestion[] = data.tasks.map(
          (t: TaskSuggestion, idx: number) => ({
            ...t,
            id: `sug-${Date.now()}-${idx}`,
            selected: true,
            isEditing: false,
          })
        );
        setSuggestions(mapped);
      } else {
        setPlanError(
          'No unfinished tasks were found in your reflection. If you have upcoming assignments, mention them specifically!'
        );
      }
    } catch {
      setPlanError('Error communicating with the AI service. You can still add tasks manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Suggestion actions
  const handleToggleSelect = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleRemoveSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleToggleEdit = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEditing: !s.isEditing } : s))
    );
  };

  const handleUpdateField = (
    id: string,
    field: keyof TaskSuggestion,
    value: unknown
  ) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleAddCustomSuggestion = () => {
    const newSug: EditableSuggestion = {
      id: `sug-${Date.now()}-custom`,
      title: 'New Study Task',
      description: '',
      priority: 'medium',
      estimated_minutes: 25,
      deadline: null,
      reasoning: 'Added during reflection review',
      selected: true,
      isEditing: true,
    };
    setSuggestions((prev) => [...prev, newSug]);
  };

  // Accept selected suggestions into task service
  const handleAcceptSelected = async () => {
    if (!user) return;
    const selected = suggestions.filter((s) => s.selected);
    if (selected.length === 0) {
      setPlanError('Please select at least one task to accept.');
      return;
    }

    setIsSavingTasks(true);
    setPlanError(null);
    let savedCount = 0;

    for (const sug of selected) {
      const res = await createTask(user.id, {
        title: sug.title,
        description: sug.description || '',
        priority: sug.priority,
        estimated_minutes: sug.estimated_minutes,
        deadline: sug.deadline || '',
        status: 'pending',
      });
      if (res.data) savedCount++;
    }

    setIsSavingTasks(false);

    if (savedCount > 0) {
      setSaveSuccessMessage(`Successfully added ${savedCount} tasks to your board!`);
      setTimeout(() => {
        router.push('/tasks');
      }, 1200);
    }
  };

  const selectedCount = suggestions.filter((s) => s.selected).length;

  if (authLoading || (!user && historyLoading)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-slate-500">Loading your reflection journal...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Guided Student Reflection
            </span>
            <Badge variant="default">V2 Feature</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Daily Reflection & Voice Input
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Speak or write how your study day went. We&apos;ll turn your thoughts into prioritized tasks.
          </p>
        </div>

        <Link href="/tasks">
          <Button variant="outline" size="sm" className="gap-1.5">
            View All Tasks
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Reflection & Voice Area (2 columns on lg) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                How was your day?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tell us what you completed, what&apos;s still pending, and what deadlines are coming up.
              </p>
            </div>

            {/* Guided Prompt Tips */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/40">
              <span className="text-xs font-medium text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Helpful prompts to consider:
              </span>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {GUIDED_PROMPTS.map((prompt, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{prompt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Voice Input Status / Compatibility Alert */}
            {!isSpeechSupported ? (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Voice input is not available in this browser. You can type your reflection instead. (Google Chrome recommended for speech).
                </span>
              </div>
            ) : speechError ? (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{speechError}</span>
              </div>
            ) : null}

            {/* Voice Recording Controls */}
            {isSpeechSupported && (
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                      speechState === 'listening'
                        ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200 dark:ring-rose-900'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105'
                    }`}
                    aria-label={speechState === 'listening' ? 'Stop recording' : 'Start speaking'}
                  >
                    {speechState === 'listening' ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>

                  <div>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                      {speechState === 'listening'
                        ? 'Listening to you speak...'
                        : speechState === 'stopped'
                        ? 'Recording stopped'
                        : 'Tell me about your day'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {speechState === 'listening'
                        ? 'Speak naturally at your own pace.'
                        : 'Click the mic or type your reflection below.'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {speechState === 'listening' && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={stopListening}
                    >
                      Stop
                    </Button>
                  )}
                  {reflectionText && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="text-slate-500"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Reflection Text Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {speechState === 'listening' ? 'Live Transcription' : 'Reflection Text'}
                </label>
                {reflectionText && (
                  <span className="text-xs text-slate-400">
                    {reflectionText.length} characters
                  </span>
                )}
              </div>

              <textarea
                rows={6}
                value={reflectionText}
                onChange={(e) => {
                  setReflectionText(e.target.value);
                  setTranscript(e.target.value);
                }}
                placeholder="Today I finished my Java lab, but I still haven't completed the DBMS normalization assignment. I have a DLD test tomorrow and I need to submit the DBMS assignment by tomorrow evening..."
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                disabled={isGenerating}
              />

              {interimTranscript && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 italic">
                  Hearing: &ldquo;{interimTranscript}&rdquo;...
                </p>
              )}
            </div>

            {/* Error & Success Messages */}
            {planError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{planError}</span>
              </div>
            )}

            {saveSuccessMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Your reflection is saved to your history and processed through Gemini AI.
              </span>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleGeneratePlan}
                isLoading={isGenerating}
                disabled={isGenerating || !reflectionText.trim()}
                className="gap-2 shadow-sm shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                Generate My Plan
              </Button>
            </div>
          </Card>

          {/* AI Plan Review Section (Appears after generation) */}
          {suggestions.length > 0 && (
            <Card className="p-6 sm:p-8 space-y-6 border-indigo-200 dark:border-indigo-900/60 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Generated Action Plan ({suggestions.length} tasks)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review and customize before saving. Only checked tasks will be added to your board.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomSuggestion}
                  className="gap-1.5 text-xs text-indigo-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Another Task
                </Button>
              </div>

              {/* Suggestions Cards List */}
              <div className="space-y-3">
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
                        /* Inline Edit */
                        <div className="space-y-3">
                          <Input
                            label="Task Title"
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
                                onChange={(e) =>
                                  handleUpdateField(sug.id, 'priority', e.target.value as TaskPriority)
                                }
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
                              onClick={() => handleRemoveSuggestion(sug.id)}
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

              {/* Accept & Confirm */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSuggestions([])}
                  className="text-slate-500"
                >
                  Discard All
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleAcceptSelected}
                  isLoading={isSavingTasks}
                  disabled={selectedCount === 0 || isSavingTasks}
                  className="gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Accept & Save Selected ({selectedCount})
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Reflection History Sidebar (1 column on lg) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              Reflection History
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {reflectionsHistory.length} saved
            </span>
          </div>

          {historyLoading ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : reflectionsHistory.length === 0 ? (
            <Card className="p-5 text-center text-xs text-slate-500 border-dashed">
              No saved reflections yet. Record or type your first reflection to start your journal!
            </Card>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {reflectionsHistory.map((item) => {
                const dateObj = new Date(item.created_at);
                const isSelected = selectedHistoryItem?.id === item.id;
                return (
                  <Card
                    key={item.id}
                    hoverEffect
                    onClick={() => {
                      setSelectedHistoryItem(item);
                      setReflectionText(item.reflection_text);
                    }}
                    className={`p-4 cursor-pointer text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {dateObj.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span>
                        {dateObj.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      &ldquo;{item.reflection_text}&rdquo;
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">
                        Load into Editor →
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
