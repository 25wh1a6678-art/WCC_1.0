import { NextResponse } from 'next/server';
import { planTasksFromReflection } from '@/lib/ai/taskPlanner';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    // 1. Enforce Server-Side Authentication Verification
    let authenticatedUserId: string | null = null;

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized: You must be logged in to use AI planning.' },
          { status: 401 }
        );
      }
      authenticatedUserId = user.id;
    } else {
      // Local demo mode: verify client passed demo user identity header
      const demoUserId =
        request.headers.get('x-user-id') ||
        request.headers.get('x-demo-user-id');

      if (!demoUserId) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required to use AI planning.' },
          { status: 401 }
        );
      }
      authenticatedUserId = demoUserId;
    }

    // 2. Validate Request Body
    const body = await request.json().catch(() => ({}));
    const { input, currentTime } = body;

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please enter a description of what you need to do.' },
        { status: 400 }
      );
    }

    if (input.trim().length > 5000) {
      return NextResponse.json(
        { error: 'Input is too long. Please keep your reflection under 5000 characters.' },
        { status: 400 }
      );
    }

    // 3. Process AI Task Extraction
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
      userId: authenticatedUserId,
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
