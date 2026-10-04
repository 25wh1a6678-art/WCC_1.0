import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  completeCommitment,
  rescheduleCommitment,
  abandonCommitment,
  deleteCommitment,
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
      // Fallback
    }
  }

  return (
    request.headers.get('x-user-id') ||
    request.headers.get('x-demo-user-id') ||
    null
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    const { action, durationMinutes, autoCompleteTask } = body;

    if (action === 'complete') {
      const { data, error } = await completeCommitment(
        id,
        autoCompleteTask !== false
      );
      if (error) return NextResponse.json({ error }, { status: 400 });
      return NextResponse.json({ commitment: data });
    }

    if (action === 'reschedule') {
      const { data, error } = await rescheduleCommitment(
        id,
        durationMinutes ? Number(durationMinutes) : undefined
      );
      if (error) return NextResponse.json({ error }, { status: 400 });
      return NextResponse.json({ commitment: data });
    }

    if (action === 'abandon') {
      const { data, error } = await abandonCommitment(id);
      if (error) return NextResponse.json({ error }, { status: 400 });
      return NextResponse.json({ commitment: data });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: complete, reschedule, abandon.' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { success, error } = await deleteCommitment(id);
    if (error) return NextResponse.json({ error }, { status: 400 });

    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
