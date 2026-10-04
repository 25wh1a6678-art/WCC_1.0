'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type SpeechState = 'idle' | 'listening' | 'processing' | 'stopped' | 'error';

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSpeechRecognitionOptions {
  onTranscriptChange?: (text: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  state: SpeechState;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
  setTranscript: (text: string) => void;
}

export function useSpeechRecognition(options?: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isSupported] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  });

  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const onTranscriptChangeRef = useRef(options?.onTranscriptChange);

  useEffect(() => {
    onTranscriptChangeRef.current = options?.onTranscriptChange;
  }, [options?.onTranscriptChange]);

  useEffect(() => {
    const SpeechRec =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setState('listening');
          setError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let currentInterim = '';
          let finalChunk = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              finalChunk += res[0].transcript + ' ';
            } else {
              currentInterim += res[0].transcript;
            }
          }

          if (finalChunk) {
            setTranscript((prev) => {
              const updated = prev
                ? `${prev.trim()} ${finalChunk.trim()}`
                : finalChunk.trim();
              if (onTranscriptChangeRef.current) {
                onTranscriptChangeRef.current(updated);
              }
              return updated;
            });
          }
          setInterimTranscript(currentInterim);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('[SpeechRecognition] Error:', event.error);
          setState('error');

          switch (event.error) {
            case 'not-allowed':
              setError('Microphone permission was denied. Please allow microphone access or type instead.');
              break;
            case 'no-speech':
              setError('No speech was detected. Please try speaking again.');
              break;
            case 'network':
              setError('Network error occurred during speech recognition. You can type instead.');
              break;
            case 'audio-capture':
              setError('No microphone was found. Ensure that your microphone is plugged in.');
              break;
            default:
              setError(`Speech recognition encountered an issue (${event.error}). You can type instead.`);
          }
        };

        recognition.onend = () => {
          setState((prev) => (prev === 'listening' ? 'stopped' : prev));
          setInterimTranscript('');
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.error('Failed to initialize SpeechRecognition:', err);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    if (!isSupported || !recognitionRef.current) {
      setError('Voice input is not available in this browser. You can type your reflection instead.');
      return;
    }

    try {
      recognitionRef.current.start();
    } catch {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 150);
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
        setError('Could not start microphone. You can type your reflection instead.');
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setState('stopped');
      } catch {
        // ignore
      }
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isSupported,
    state,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript,
    setTranscript,
  };
}
