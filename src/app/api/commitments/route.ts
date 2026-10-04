import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  createCommitment,
  getCommitments,
  getActiveCommitment,
  getCommitmentStats,
} from '@/lib/commitments';

async function getAuthUserId(request: Request): Promise<string | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) return user.id;
    } catch {
      // Fallback to headers below
    }
  }

  return (
    request.headers.get('x-user-id') ||
    request.headers.get('x-demo-user-id') ||
    null
  );
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const statsOnly = searchParams.get('stats') === 'true';

    if (statsOnly) {
      const stats = await getCommitmentStats(userId);
      return NextResponse.json({ stats });
    }

    if (activeOnly) {
      const { data, error } = await getActiveCommitment(userId);
      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }
      return NextResponse.json({ activeCommitment: data });
    }

    const { data, error } = await getCommitments(userId);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ commitments: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON object.' },
        { status: 400 }
      );
    }

    const { taskId, durationMinutes } = body;
    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required to start a focus commitment.' },
        { status: 400 }
      );
    }

    const duration = Number(durationMinutes);
    if (!duration || duration <= 0 || !Number.isInteger(duration)) {
      return NextResponse.json(
        { error: 'durationMinutes must be a positive integer.' },
        { status: 400 }
      );
    }

    const { data, error } = await createCommitment(userId, {
      taskId,
      durationMinutes: duration,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ commitment: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error creating commitment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
