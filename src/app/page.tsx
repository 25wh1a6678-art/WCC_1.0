'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Timer,
  CheckCircle,
  Coins,
  Flame,
  BrainCircuit,
  Lock,
} from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();

  const loopSteps = [
    { title: 'Reflect', desc: 'Speak or write what you did & what you need to do', icon: BrainCircuit, version: 'V2' },
    { title: 'AI Plan', desc: 'Extracts priorities, durations, and suggested subtasks', icon: Sparkles, version: 'V1' },
    { title: 'Commit', desc: 'Select one task and sign a binding focus commitment', icon: Lock, version: 'V3' },
    { title: 'Focus Mode', desc: 'Active timer protects your attention from browser distractions', icon: Timer, version: 'V4' },
    { title: 'Reward & Streak', desc: 'Earn FocusCoins and keep your daily consistency alive', icon: Coins, version: 'V5' },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-medium mb-6 border border-indigo-200/60 dark:border-indigo-800/60">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>V0 Foundation Live • Task Management & Supabase Auth</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight sm:leading-tight">
          Stop postponing what matters.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
            Make the contract.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Focus Contract is an anti-procrastination system designed for college students. Turn your daily intentions into manageable commitments, control distractions, and earn real momentum.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {!isLoading && user ? (
            <Link href="/dashboard">
              <Button size="lg" className="gap-2 shadow-md">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signup">
                <Button size="lg" className="gap-2 shadow-md">
                  Create Free Student Account
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Log in
                </Button>
              </Link>
            </>
          )}
          <Link href="/tasks">
            <Button variant="ghost" size="lg" className="gap-2">
              View Tasks Demo
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <Card className="p-6">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 mb-4">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Deterministic Task Management
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Full CRUD with priorities, estimated duration, deadlines, and status tracking stored securely per student.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Supabase Auth & PostgreSQL
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Row-Level Security ensures no student can view, edit, or tamper with another student&apos;s tasks.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 mb-4">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Commitment-First Architecture
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Modular structure ready for AI extraction (V1), Voice reflection (V2), Focus mode (V3), and Browser blocking (V4).
            </p>
          </Card>
        </div>
      </section>

      {/* MVP Execution Loop */}
      <section className="py-16 bg-white dark:bg-slate-900/60 border-t border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="default" className="mb-2">Core MVP Loop</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              From Overwhelm to Follow-Through
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Focus Contract bridges the gap between &ldquo;I should do this&rdquo; and &ldquo;I actually did it.&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {loopSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {step.version}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
