'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseFocusTimerProps {
  durationMinutes: number;
  startedAt: string;
  taskTitle?: string;
  onFinish?: () => void;
}

export interface FocusTimerState {
  remainingSeconds: number;
  totalSeconds: number;
  progressPercent: number;
  isPaused: boolean;
  isFinished: boolean;
  formattedTime: string;
  togglePause: () => void;
  resetTimer: (newDurationMinutes?: number) => void;
}

/**
 * Synthesizes a celebratory completion chime using Web Audio API
 */
export function playFocusCompletionSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Harmonic chord (C5 - E5 - G5 - C6)
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const noteStart = now + idx * 0.12;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 1.0);
    });
  } catch (e) {
    console.warn('AudioContext playback error:', e);
  }
}

/**
 * Requests and sends native browser notifications
 */
export async function sendFocusNotification(title: string, body: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  try {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      }
    }
  } catch {
    // Ignore notification errors
  }
}

export function useFocusTimer({
  durationMinutes,
  startedAt,
  taskTitle,
  onFinish,
}: UseFocusTimerProps): FocusTimerState {
  const totalSeconds = Math.max(1, durationMinutes * 60);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    return Math.max(0, totalSeconds - (elapsed > 0 ? elapsed : 0));
  });

  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(() => remainingSeconds <= 0);

  const pausedAtRef = useRef<number | null>(null);
  const accumulatedPauseTimeRef = useRef<number>(0);
  const onFinishCalledRef = useRef(false);

  // Format MM:SS
  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const formattedTime = formatTime(remainingSeconds);

  // Update browser document title with countdown
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const originalTitle = document.title;

    if (!isFinished) {
      const label = taskTitle ? `Focus: ${taskTitle}` : 'Focus Mode';
      document.title = `(${formattedTime}) ${label} - Focus Contract`;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [formattedTime, isFinished, taskTitle]);

  // Main countdown loop with drift correction
  useEffect(() => {
    if (isPaused || isFinished) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const startTime = new Date(startedAt).getTime();
      const totalElapsedMs = now - startTime - accumulatedPauseTimeRef.current;
      const elapsedSec = Math.floor(totalElapsedMs / 1000);
      const remaining = Math.max(0, totalSeconds - elapsedSec);

      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        setIsFinished(true);
        clearInterval(interval);

        if (!onFinishCalledRef.current) {
          onFinishCalledRef.current = true;
          playFocusCompletionSound();
          sendFocusNotification(
            'Focus Contract Completed! 🎉',
            taskTitle ? `You stayed focused on "${taskTitle}"!` : 'Great job completing your focus session!'
          );
          onFinish?.();
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPaused, isFinished, startedAt, totalSeconds, onFinish, taskTitle]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      if (!prev) {
        pausedAtRef.current = Date.now();
        return true;
      } else {
        if (pausedAtRef.current) {
          accumulatedPauseTimeRef.current += Date.now() - pausedAtRef.current;
          pausedAtRef.current = null;
        }
        return false;
      }
    });
  }, []);

  const resetTimer = useCallback(
    (newMinutes?: number) => {
      const mins = newMinutes || durationMinutes;
      const newTotal = mins * 60;
      setRemainingSeconds(newTotal);
      setIsPaused(false);
      setIsFinished(false);
      onFinishCalledRef.current = false;
      accumulatedPauseTimeRef.current = 0;
      pausedAtRef.current = null;
    },
    [durationMinutes]
  );

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((totalSeconds - remainingSeconds) / totalSeconds) * 100))
  );

  return {
    remainingSeconds,
    totalSeconds,
    progressPercent,
    isPaused,
    isFinished,
    formattedTime,
    togglePause,
    resetTimer,
  };
}
