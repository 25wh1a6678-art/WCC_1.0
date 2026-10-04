'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react';

interface RoadmapPlaceholderProps {
  version: string;
  title: string;
  badge: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
}

export function RoadmapPlaceholder({
  version,
  title,
  badge,
  description,
  features,
  icon,
}: RoadmapPlaceholderProps) {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600 dark:text-slate-300">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card className="text-center p-8 sm:p-12 relative overflow-hidden border-dashed border-2 border-indigo-200 dark:border-indigo-900/50">
        <div className="inline-flex p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-5">
          {icon}
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <Badge variant="info">{version}</Badge>
          <Badge variant="neutral">{badge}</Badge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
          {title}
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-8">
          {description}
        </p>

        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-6 text-left max-w-lg mx-auto mb-8 border border-slate-200 dark:border-slate-700">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            Planned for this milestone:
          </h4>
          <ul className="space-y-2.5">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/tasks">
            <Button variant="primary">Manage V0 Tasks</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">View Dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
