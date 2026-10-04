'use client';

import React from 'react';
import { RoadmapPlaceholder } from '@/components/common/RoadmapPlaceholder';
import { MessageSquare } from 'lucide-react';

export default function ReflectionPage() {
  return (
    <RoadmapPlaceholder
      version="Version 2"
      badge="Speech & Reflection Interface"
      title="Daily Reflection & Voice Input"
      description="Speak or type how your study day went, what you finished, and what assignments remain unfinished. The system turns raw reflections into actionable steps."
      icon={<MessageSquare className="w-10 h-10" />}
      features={[
        'Voice-to-text recording with browser speech recognition',
        'Typed text fallback with instant editable transcription',
        'Daily reflection journaling history stored in Supabase',
        'Direct feed into Gemini AI task extraction & planning pipeline (V1)',
      ]}
    />
  );
}
