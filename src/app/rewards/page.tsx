'use client';

import React from 'react';
import { RoadmapPlaceholder } from '@/components/common/RoadmapPlaceholder';
import { Coins } from 'lucide-react';

export default function RewardsPage() {
  return (
    <RoadmapPlaceholder
      version="Version 5"
      badge="FocusCoins & Virtual Shop"
      title="Reward System & FocusCoin Shop"
      description="Earn FocusCoins by fulfilling commitments and maintaining consistency. Redeem coins for virtual power-ups, break passes, and custom themes."
      icon={<Coins className="w-10 h-10" />}
      features={[
        'Deterministic FocusCoins awarded on commitment completion',
        'Anti-farming controls: daily caps, minimum duration thresholds, single-reward rules',
        'Study streak tracking and streak recovery passes',
        'Virtual reward shop (10m Break Pass, Dashboard Themes, Cosmic Badges)',
        'Full immutable transaction history ledger',
      ]}
    />
  );
}
