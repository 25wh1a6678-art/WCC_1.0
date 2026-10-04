'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getRewardOverview, purchaseReward } from '@/lib/rewards';
import { REWARD_CATALOG, RewardOverview } from '@/types/rewards';
import { AlertCircle, Flame, History, PackageCheck, ShoppingBag, Sparkles, Wallet } from 'lucide-react';

const EMPTY_OVERVIEW: RewardOverview = {
  balance: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastSuccessDate: null,
  recoveryPasses: 0,
  transactions: [],
  inventory: [],
};

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function RewardsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<RewardOverview>(EMPTY_OVERVIEW);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?redirect=/rewards');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    getRewardOverview(user.id).then((result) => {
      if (ignore) return;
      setOverview(result.data);
      setError(result.error);
      setLoadedUserId(user.id);
    });
    return () => {
      ignore = true;
    };
  }, [user]);

  const handlePurchase = async (rewardKey: string) => {
    if (!user) return;
    setError(null);
    setNotice(null);
    setIsPurchasing(rewardKey);
    const result = await purchaseReward(user.id, rewardKey);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setOverview(result.data);
      const reward = REWARD_CATALOG.find((item) => item.key === rewardKey);
      setNotice(`${reward?.name || 'Reward'} added to your inventory.`);
    }
    setIsPurchasing(null);
  };

  if (authLoading || !user || loadedUserId !== user.id) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-xs text-slate-500">Loading your rewards...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <header className="space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          <Sparkles className="w-3.5 h-3.5" /> V5 Reward System
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          FocusCoins & Rewards
        </h1>
        <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Earn virtual FocusCoins by completing focus contracts, build a daily study streak, and redeem coins for virtual items.
        </p>
      </header>

      {(error || notice) && (
        <div className={`rounded-xl border p-3 text-sm flex items-center gap-2 ${
          error
            ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
        }`}>
          {error && <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{error || notice}</span>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Reward summary">
        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Available balance</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{overview.balance} <span className="text-sm font-semibold text-amber-600">FC</span></p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-300 flex items-center justify-center">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Current study streak</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{overview.currentStreak} <span className="text-sm font-semibold text-slate-500">days</span></p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Recovery passes</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{overview.recoveryPasses}</p>
          </div>
        </Card>
      </section>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Virtual Reward Shop</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REWARD_CATALOG.map((reward) => (
            <div key={reward.key} className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
              <div className="text-3xl mb-3" aria-hidden="true">{reward.icon}</div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{reward.name}</h3>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{reward.description}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{reward.coinCost} FC</span>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={overview.balance < reward.coinCost}
                  isLoading={isPurchasing === reward.key}
                  onClick={() => void handlePurchase(reward.key)}
                >
                  Redeem
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">
          FocusCoins are virtual only and have no cash value. Recover one missed day automatically with an available pass.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Coin Activity</h2>
          </div>
          {overview.transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Complete an eligible focus contract to earn your first FocusCoins.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {overview.transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{transaction.description}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{formatTimestamp(transaction.created_at)}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-bold ${
                    transaction.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} FC
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <PackageCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Inventory</h2>
          </div>
          {overview.inventory.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Redeemed items will show up here.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {overview.inventory.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.reward_name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">Purchased {formatTimestamp(item.purchased_at)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
