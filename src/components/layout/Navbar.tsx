'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import {
  ShieldCheck,
  CheckSquare,
  LayoutDashboard,
  Timer,
  MessageSquare,
  Coins,
  LogOut,
  User,
  Database,
} from 'lucide-react';

export function Navbar() {
  const { user, signOut, isConfigured } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/focus', label: 'Focus Mode', icon: Timer, milestone: 'V3' },
    { href: '/reflection', label: 'Reflection', icon: MessageSquare, milestone: 'V2' },
    { href: '/rewards', label: 'Rewards', icon: Coins, milestone: 'V5' },
  ];

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      {!isConfigured && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800/60 px-4 py-1.5 text-center text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
          <Database className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Local Demo Mode:</strong> Add Supabase credentials to <code>.env.local</code> to enable live PostgreSQL sync. All V0 tasks and auth work locally!
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:bg-indigo-700 transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base leading-none">
                Focus<span className="text-indigo-600 dark:text-indigo-400">Contract</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                Anti-Procrastination System
              </span>
            </div>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                    {link.milestone && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                        {link.milestone}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-medium max-w-[120px] truncate">{user.name}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-slate-600 dark:text-slate-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </div>
          ) : !isAuthPage ? (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
