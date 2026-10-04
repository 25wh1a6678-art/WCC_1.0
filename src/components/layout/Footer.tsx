import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-4 text-xs text-slate-500 dark:text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Focus Contract
          </span>
          <span>• AI-Powered Anti-Procrastination System for Students</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/tasks" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            Tasks (V0)
          </Link>
          <Link href="/reflection" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            Reflection (V2)
          </Link>
          <Link href="/focus" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            Focus Mode (V3)
          </Link>
          <Link href="/rewards" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            Rewards (V5)
          </Link>
        </div>
      </div>
    </footer>
  );
}
