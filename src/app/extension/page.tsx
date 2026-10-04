import Link from 'next/link';
import { Shield, ArrowRight, MonitorSmartphone, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ExtensionPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">V4</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Browser Distraction Guard</h1>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          During a live focus contract, the app marks high-distraction domains such as YouTube, Reddit, and Instagram as blocked. The demo extension in this repo enforces that list in Chrome/Chromium by redirecting blocked sites to a local focus-guard page.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
            <MonitorSmartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2" />
            <h2 className="font-semibold text-slate-900 dark:text-white">1. Load extension</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Open Chrome and visit chrome://extensions, then enable Developer Mode and load the ./extension folder.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
            <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2" />
            <h2 className="font-semibold text-slate-900 dark:text-white">2. Configure domains</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Use the extension popup to define domains you want blocked during the session.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2" />
            <h2 className="font-semibold text-slate-900 dark:text-white">3. Stay on task</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">When a focus commitment is active, all matching distraction domains redirect to an educational blocker screen.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/focus">
            <Button variant="primary" size="md">
              Return to Focus Mode
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="md">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
