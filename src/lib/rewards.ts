import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Commitment } from '@/types/commitment';
import {
  CoinTransaction,
  REWARD_CATALOG,
  RewardInventoryItem,
  RewardOverview,
} from '@/types/rewards';

const LOCAL_REWARDS_PREFIX = 'focus_contract_rewards_';
const DAILY_COIN_CAP = 200;
const localRewardStates = new Map<string, LocalRewardState>();

interface LocalRewardState extends RewardOverview {
  references: string[];
}

function emptyOverview(): LocalRewardState {
  return {
    balance: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastSuccessDate: null,
    recoveryPasses: 0,
    transactions: [],
    inventory: [],
    references: [],
  };
}

function readLocalState(userId: string): LocalRewardState {
  if (typeof window === 'undefined') {
    return localRewardStates.get(userId) || emptyOverview();
  }

  try {
    const raw = window.localStorage.getItem(`${LOCAL_REWARDS_PREFIX}${userId}`);
    if (!raw) return emptyOverview();
    const saved = JSON.parse(raw) as Partial<LocalRewardState>;
    return {
      ...emptyOverview(),
      ...saved,
      transactions: Array.isArray(saved.transactions) ? saved.transactions : [],
      inventory: Array.isArray(saved.inventory) ? saved.inventory : [],
      references: Array.isArray(saved.references) ? saved.references : [],
    };
  } catch {
    return localRewardStates.get(userId) || emptyOverview();
  }
}

function writeLocalState(userId: string, state: LocalRewardState): void {
  localRewardStates.set(userId, state);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${LOCAL_REWARDS_PREFIX}${userId}`, JSON.stringify(state));
    } catch (error) {
      console.warn('[Rewards] Could not persist local reward state:', error);
    }
  }
}

function currentUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateDifferenceInDays(previous: string, current: string): number {
  const previousMs = Date.parse(`${previous}T00:00:00.000Z`);
  const currentMs = Date.parse(`${current}T00:00:00.000Z`);
  return Math.round((currentMs - previousMs) / 86_400_000);
}

export function calculateStreakProgress(
  currentStreak: number,
  lastSuccessDate: string | null,
  today: string,
  recoveryPasses: number
): { currentStreak: number; recoveryPasses: number; usedRecovery: boolean } {
  if (!lastSuccessDate) {
    return { currentStreak: 1, recoveryPasses, usedRecovery: false };
  }

  const gap = dateDifferenceInDays(lastSuccessDate, today);
  if (gap === 0) {
    return { currentStreak, recoveryPasses, usedRecovery: false };
  }
  if (gap === 1) {
    return { currentStreak: currentStreak + 1, recoveryPasses, usedRecovery: false };
  }
  if (gap === 2 && recoveryPasses > 0) {
    return {
      currentStreak: currentStreak + 1,
      recoveryPasses: recoveryPasses - 1,
      usedRecovery: true,
    };
  }
  return { currentStreak: 1, recoveryPasses, usedRecovery: false };
}

function getEffectiveCurrentStreak(
  currentStreak: number,
  lastSuccessDate: string | null,
  recoveryPasses: number
): number {
  if (!lastSuccessDate) return 0;
  const gap = dateDifferenceInDays(lastSuccessDate, currentUtcDate());
  if (gap <= 1 || (gap === 2 && recoveryPasses > 0)) return currentStreak;
  return 0;
}

function coinRewardForDuration(minutes: number): number {
  if (minutes < 5) return 0;
  if (minutes < 15) return 10;
  if (minutes < 30) return 20;
  if (minutes < 60) return 35;
  return 50;
}

function earnedToday(state: LocalRewardState, date: string): number {
  return state.transactions.reduce((sum, transaction) => {
    return transaction.created_at.slice(0, 10) === date && transaction.amount > 0
      ? sum + transaction.amount
      : sum;
  }, 0);
}

function appendTransaction(
  state: LocalRewardState,
  amount: number,
  transactionType: CoinTransaction['transaction_type'],
  sourceReference: string,
  description: string,
  date: string
): number {
  if (amount <= 0 || state.references.includes(sourceReference)) return 0;
  const allowedAmount = Math.min(amount, Math.max(0, DAILY_COIN_CAP - earnedToday(state, date)));
  if (allowedAmount <= 0) return 0;

  state.balance += allowedAmount;
  state.references.push(sourceReference);
  state.transactions.unshift({
    id: `coin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    amount: allowedAmount,
    transaction_type: transactionType,
    source_reference: sourceReference,
    description,
    balance_after: state.balance,
    created_at: new Date().toISOString(),
  });
  return allowedAmount;
}

function applyLocalCompletionReward(
  userId: string,
  commitment: Commitment,
  taskRewardEligible: boolean
): void {
  const state = readLocalState(userId);
  const date = currentUtcDate();
  const commitmentReference = `commitment:${commitment.id}`;
  if (state.references.includes(commitmentReference)) return;
  state.references.push(commitmentReference);

  const progress = calculateStreakProgress(
    state.currentStreak,
    state.lastSuccessDate,
    date,
    state.recoveryPasses
  );
  state.currentStreak = progress.currentStreak;
  state.recoveryPasses = progress.recoveryPasses;
  if (progress.usedRecovery) {
    const recoveryReference = `recovery-used:${date}`;
    if (!state.references.includes(recoveryReference)) {
      state.references.push(recoveryReference);
      state.transactions.unshift({
        id: `coin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        amount: 0,
        transaction_type: 'recovery_used',
        source_reference: recoveryReference,
        description: 'Streak Recovery Pass used',
        balance_after: state.balance,
        created_at: new Date().toISOString(),
      });
    }
  }
  state.lastSuccessDate = date;
  state.longestStreak = Math.max(state.currentStreak, state.longestStreak);

  const taskCompletionReference = `task-completion:${commitment.task_id}`;
  const hasEarnedTaskReward =
    state.references.includes(taskCompletionReference) || !taskRewardEligible;
  if (!hasEarnedTaskReward) {
    const taskReward = coinRewardForDuration(commitment.duration_minutes);
    let taskRewardEarned = 0;
    if (taskReward > 0) {
      taskRewardEarned = appendTransaction(
        state,
        taskReward,
        'task_completion',
        taskCompletionReference,
        `Completed focus contract (${commitment.duration_minutes} min)`,
        date
      );
    }
    if (taskRewardEarned === 0) {
      state.references.push(taskCompletionReference);
      state.transactions.unshift({
        id: `coin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        amount: 0,
        transaction_type: 'task_completion',
        source_reference: taskCompletionReference,
        description: commitment.duration_minutes < 5
          ? 'Task completion below minimum reward duration'
          : 'Task completion reward capped for today',
        balance_after: state.balance,
        created_at: new Date().toISOString(),
      });
    }
  } else if (!state.references.includes(taskCompletionReference)) {
    state.references.push(taskCompletionReference);
    state.transactions.unshift({
      id: `coin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      amount: 0,
      transaction_type: 'task_completion',
      source_reference: taskCompletionReference,
      description: 'Task completed before focus contract started',
      balance_after: state.balance,
      created_at: new Date().toISOString(),
    });
  }

  if (
    !hasEarnedTaskReward &&
    commitment.duration_minutes >= 5 &&
    !state.references.includes(`daily:${date}`)
  ) {
    appendTransaction(
      state,
      25,
      'daily_bonus',
      `daily:${date}`,
      'First completed focus contract today',
      date
    );
  }

  const streakBonus = new Map([
    [3, 20],
    [7, 30],
    [14, 40],
    [30, 50],
  ]).get(state.currentStreak);
  if (!hasEarnedTaskReward && commitment.duration_minutes >= 5 && streakBonus) {
    appendTransaction(
      state,
      streakBonus,
      'streak_bonus',
      `streak:${date}:${state.currentStreak}`,
      `${state.currentStreak}-day streak milestone`,
      date
    );
  }

  writeLocalState(userId, state);
}

export async function grantLocalCommitmentReward(
  userId: string,
  commitment: Commitment,
  taskRewardEligible = true
): Promise<void> {
  if (!userId) throw new Error('User ID is required to award FocusCoins.');
  if (commitment.user_id !== userId || commitment.status !== 'completed') {
    throw new Error('Only the authenticated owner can earn rewards for a completed commitment.');
  }
  applyLocalCompletionReward(userId, commitment, taskRewardEligible);
}

function publicOverview(state: LocalRewardState): RewardOverview {
  return {
    balance: state.balance,
    currentStreak: getEffectiveCurrentStreak(
      state.currentStreak,
      state.lastSuccessDate,
      state.recoveryPasses
    ),
    longestStreak: state.longestStreak,
    lastSuccessDate: state.lastSuccessDate,
    recoveryPasses: state.recoveryPasses,
    transactions: state.transactions.slice(0, 30),
    inventory: state.inventory,
  };
}

export async function getRewardOverview(
  userId: string
): Promise<{ data: RewardOverview; error: string | null }> {
  if (!userId) return { data: publicOverview(emptyOverview()), error: 'User ID is required.' };

  if (!isSupabaseConfigured()) {
    return { data: publicOverview(readLocalState(userId)), error: null };
  }

  try {
    const supabase = createClient();
    const [wallet, streak, transactions, inventory] = await Promise.all([
      supabase.from('focuscoin_wallets').select('balance').eq('user_id', userId).maybeSingle(),
      supabase
        .from('streaks')
        .select('current_streak, longest_streak, last_success_date, recovery_passes')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('coin_transactions')
        .select('id, amount, transaction_type, source_reference, description, balance_after, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('reward_inventory')
        .select('id, reward_key, reward_name, reward_type, purchased_at')
        .eq('user_id', userId)
        .order('purchased_at', { ascending: false }),
    ]);
    const failed = [wallet.error, streak.error, transactions.error, inventory.error].find(Boolean);
    if (failed) return { data: publicOverview(emptyOverview()), error: failed.message };

    return {
      data: {
        balance: wallet.data?.balance || 0,
        currentStreak: getEffectiveCurrentStreak(
          streak.data?.current_streak || 0,
          streak.data?.last_success_date || null,
          streak.data?.recovery_passes || 0
        ),
        longestStreak: streak.data?.longest_streak || 0,
        lastSuccessDate: streak.data?.last_success_date || null,
        recoveryPasses: streak.data?.recovery_passes || 0,
        transactions: (transactions.data || []) as CoinTransaction[],
        inventory: (inventory.data || []) as RewardInventoryItem[],
      },
      error: null,
    };
  } catch (error) {
    return {
      data: publicOverview(emptyOverview()),
      error: error instanceof Error ? error.message : 'Failed to load rewards.',
    };
  }
}

export async function purchaseReward(
  userId: string,
  rewardKey: string
): Promise<{ data: RewardOverview | null; error: string | null }> {
  if (!userId) return { data: null, error: 'User ID is required.' };
  const reward = REWARD_CATALOG.find((item) => item.key === rewardKey);
  if (!reward) return { data: null, error: 'This reward is not available.' };

  if (!isSupabaseConfigured()) {
    const state = readLocalState(userId);
    if (state.balance < reward.coinCost) {
      return { data: null, error: 'You do not have enough FocusCoins for this reward.' };
    }

    state.balance -= reward.coinCost;
    const now = new Date().toISOString();
    const reference = `purchase:${reward.key}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    state.references.push(reference);
    state.transactions.unshift({
      id: reference,
      amount: -reward.coinCost,
      transaction_type: 'reward_purchase',
      source_reference: reference,
      description: `Purchased ${reward.name}`,
      balance_after: state.balance,
      created_at: now,
    });
    state.inventory.unshift({
      id: `inventory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      reward_key: reward.key,
      reward_name: reward.name,
      reward_type: reward.type,
      purchased_at: now,
    });
    if (reward.type === 'streak_recovery_pass') state.recoveryPasses += 1;
    writeLocalState(userId, state);
    return { data: publicOverview(state), error: null };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.rpc('purchase_focus_reward', {
      p_reward_key: reward.key,
    });
    if (error) return { data: null, error: error.message };
    const refreshed = await getRewardOverview(userId);
    return { data: refreshed.data, error: refreshed.error };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to purchase reward.',
    };
  }
}
