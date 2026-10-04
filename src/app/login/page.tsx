'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ShieldCheck, LogIn, ArrowRight, MailCheck } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signInWithGoogle, isConfigured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        router.push(redirect);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await signInWithGoogle(redirect);
      if (result.error) setError(result.error);
    } catch {
      setError('Google sign-in could not be started. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo-600 text-white items-center justify-center shadow-md mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back to Focus Contract
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Log in to manage your commitments and study tasks
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" className="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                {error.toLowerCase().includes('rate limit') || error.toLowerCase().includes('email rate')
                  ? 'Supabase has temporarily reached its email sending limit. Password login does not require another email, but account confirmation/reset emails may be delayed. Configure custom SMTP in Supabase Auth settings.'
                  : error}
              </div>
            )}

            {searchParams.get('error') === 'auth-callback-failed' && (
              <div role="alert" className="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                Google sign-in did not complete. Confirm Google OAuth and the callback URL are configured in Supabase.
              </div>
            )}

            {searchParams.get('message') === 'check-email' && (
              <div role="status" className="p-3 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-start gap-2">
                <MailCheck className="w-4 h-4 shrink-0" />
                <span>Check your inbox for a confirmation link before logging in. If no email arrives, the Supabase sender may be rate-limited.</span>
              </div>
            )}

            <Input
              label="Student Email"
              type="email"
              required
              placeholder="alex@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />

            <Input
              label="Password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full gap-2 mt-2"
              isLoading={isLoading}
            >
              <LogIn className="w-4 h-4" />
              Log In
            </Button>

            {isConfigured && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">or continue with</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  isLoading={isLoading}
                  onClick={handleGoogleSignIn}
                >
                  <span aria-hidden="true" className="font-bold text-base">G</span>
                  Continue with Google
                </Button>
              </>
            )}
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Don&apos;t have an account yet?{' '}
              <Link
                href="/signup"
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 inline-flex items-center gap-1"
              >
                Sign up
                <ArrowRight className="w-3 h-3" />
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
