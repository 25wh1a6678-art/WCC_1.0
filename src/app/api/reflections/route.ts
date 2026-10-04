import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { createReflection, getReflections } from '@/lib/reflections';

export async function GET(request: Request) {
  try {
    let userId: string | null = null;

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required.' },
          { status: 401 }
        );
      }
      userId = user.id;
    } else {
      userId =
        request.headers.get('x-user-id') ||
        request.headers.get('x-demo-user-id');
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required.' },
          { status: 401 }
        );
      }
    }

    const { data, error } = await getReflections(userId);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ reflections: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error fetching reflections';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let userId: string | null = null;

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required.' },
          { status: 401 }
        );
      }
      userId = user.id;
    } else {
      userId =
        request.headers.get('x-user-id') ||
        request.headers.get('x-demo-user-id');
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required.' },
          { status: 401 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reflection text cannot be empty.' },
        { status: 400 }
      );
    }

    const { data, error } = await createReflection(userId, text.trim());
    if (error || !data) {
      return NextResponse.json(
        { error: error || 'Failed to save reflection.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reflection: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error creating reflection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
