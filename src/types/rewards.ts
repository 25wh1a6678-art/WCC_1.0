export type CoinTransactionType =
  | 'task_completion'
  | 'daily_bonus'
  | 'streak_bonus'
  | 'reward_purchase'
  | 'recovery_used';

export type RewardType =
  | 'break_pass'
  | 'theme'
  | 'streak_recovery_pass'
  | 'badge';

export interface RewardCatalogItem {
  key: string;
  name: string;
  description: string;
  type: RewardType;
  coinCost: number;
  icon: string;
}

export interface CoinTransaction {
  id: string;
  amount: number;
  transaction_type: CoinTransactionType;
  source_reference: string;
  description: string;
  balance_after: number;
  created_at: string;
}

export interface RewardInventoryItem {
  id: string;
  reward_key: string;
  reward_name: string;
  reward_type: RewardType;
  purchased_at: string;
}

export interface RewardOverview {
  balance: number;
  currentStreak: number;
  longestStreak: number;
  lastSuccessDate: string | null;
  recoveryPasses: number;
  transactions: CoinTransaction[];
  inventory: RewardInventoryItem[];
}

export const REWARD_CATALOG: RewardCatalogItem[] = [
  {
    key: 'break-pass',
    name: '10-Minute Break Pass',
    description: 'A guilt-free short break after a focus session.',
    type: 'break_pass',
    coinCost: 100,
    icon: '☕',
  },
  {
    key: 'dashboard-theme',
    name: 'Dashboard Theme',
    description: 'Unlock a new look for your student workspace.',
    type: 'theme',
    coinCost: 100,
    icon: '🎨',
  },
  {
    key: 'streak-recovery',
    name: 'Streak Recovery Pass',
    description: 'Automatically protects one missed day in a future streak.',
    type: 'streak_recovery_pass',
    coinCost: 250,
    icon: '🛟',
  },
  {
    key: 'focus-badge',
    name: 'Focus Badge',
    description: 'A cosmetic badge for your reward collection.',
    type: 'badge',
    coinCost: 150,
    icon: '🏅',
  },
];
