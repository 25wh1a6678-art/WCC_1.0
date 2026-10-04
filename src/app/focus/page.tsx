'use client';

import React from 'react';
import { RoadmapPlaceholder } from '@/components/common/RoadmapPlaceholder';
import { Timer } from 'lucide-react';

export default function FocusPage() {
  return (
    <RoadmapPlaceholder
      version="Version 3"
      badge="Commitment & Focus Engine"
      title="Focus Mode & Digital Commitments"
      description="Select an academic task, sign a binding focus commitment contract, start the countdown timer, and enter a distraction-free study zone."
      icon={<Timer className="w-10 h-10" />}
      features={[
        'Binding commitment contract setup (duration, task selection)',
        'Live countdown focus timer with pause/abort states',
        'Integration with Chrome Extension to restrict distracting websites (V4)',
        'State management ensuring verifiable focus completion before coin reward (V5)',
      ]}
    />
  );
}
