import { NextResponse } from 'next/server';
import { planTasksFromReflection } from '@/lib/ai/taskPlanner';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { input, currentTime } = body;

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please enter a description of what you need to do.' },
        { status: 400 }
      );
    }

    if (input.trim().length > 3000) {
      return NextResponse.json(
        { error: 'Input is too long. Please keep your reflection under 3000 characters.' },
        { status: 400 }
      );
    }

    const result = await planTasksFromReflection(input, {
      currentTime: currentTime || new Date().toISOString(),
    });

    if (result.error && result.tasks.length === 0) {
      return NextResponse.json(
        {
          error: result.error,
          tasks: [],
          source: result.source,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      tasks: result.tasks,
      source: result.source,
      error: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error processing AI plan';
    console.error('[API /api/ai/plan] Error:', message);
    return NextResponse.json(
      {
        error: 'AI planning is temporarily unavailable. You can still add tasks manually.',
        tasks: [],
      },
      { status: 500 }
    );
  }
}
