'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getStoredBlockedDomains, saveStoredBlockedDomains, sanitizeBlockedDomains } from '@/lib/distractionGuard';
import { AlertTriangle, CheckCircle2, Plus, Shield, Trash2 } from 'lucide-react';

interface DistractionGuardCardProps {
  userId?: string;
  isActive?: boolean;
}

export function DistractionGuardCard({ userId, isActive = false }: DistractionGuardCardProps) {
  const [domains, setDomains] = useState<string[]>(() => getStoredBlockedDomains(userId));
  const [draft, setDraft] = useState('');

  const updateDomains = (next: string[]) => {
    const cleaned = sanitizeBlockedDomains(next);
    saveStoredBlockedDomains(cleaned, userId);
    setDomains(cleaned);
  };

  const handleAdd = () => {
    const input = draft.trim();
    if (!input) return;
    updateDomains([...domains, input]);
    setDraft('');
  };

  const handleRemove = (domain: string) => {
    updateDomains(domains.filter((item) => item !== domain));
  };

  return (
    <Card className="p-5 sm:p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Browser Distraction Guard</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">V4 — Demo blocker setup</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${
            isActive
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {isActive ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          {isActive ? 'Guard active' : 'Standby'}
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
        During a live focus contract, the app can target these distraction domains and block them in the extension demo or during a browser-assisted session.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="e.g. youtube.com"
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <Button type="button" variant="primary" size="sm" onClick={handleAdd} className="shrink-0">
          <Plus className="w-3.5 h-3.5" />
          Add Domain
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {domains.length === 0 ? (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            No domains configured yet.
          </div>
        ) : (
          domains.map((domain) => (
            <span
              key={domain}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-200"
            >
              {domain}
              <button
                type="button"
                aria-label={`Remove ${domain}`}
                onClick={() => handleRemove(domain)}
                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 p-3 text-[11px] text-indigo-800 dark:text-indigo-200">
        {isActive
          ? 'Guard is active for this focus session. Keep the timer current and stay on task to avoid automatic redirect warnings.'
          : 'No live focus session is running. The blocker list is still saved locally and becomes active the next time you start a commitment.'}
      </div>
    </Card>
  );
}
