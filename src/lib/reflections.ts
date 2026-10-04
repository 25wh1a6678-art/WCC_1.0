import { createClient, isSupabaseConfigured } from './supabase/client';
import { Database } from '@/types/database.types';

export type DailyReflection = Database['public']['Tables']['daily_reflections']['Row'];
export type DailyReflectionInsert = Database['public']['Tables']['daily_reflections']['Insert'];

const LOCAL_REFLECTIONS_PREFIX = 'fc_reflections_user_';

function getLocalReflections(userId: string): DailyReflection[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_REFLECTIONS_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read local reflections', e);
    return [];
  }
}

function saveLocalReflections(userId: string, reflections: DailyReflection[]): void {
  try {
    localStorage.setItem(`${LOCAL_REFLECTIONS_PREFIX}${userId}`, JSON.stringify(reflections));
  } catch (e) {
    console.error('Failed to save local reflections', e);
  }
}

/**
 * Fetch all reflections for an authenticated user, newest first
 */
export async function getReflections(
  userId: string
): Promise<{ data: DailyReflection[]; error: string | null }> {
  if (!userId) {
    return { data: [], error: 'User is not authenticated' };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('daily_reflections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: [], error: error.message };
      }
      return { data: (data || []) as DailyReflection[], error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reflections';
      return { data: [], error: message };
    }
  } else {
    const reflections = getLocalReflections(userId);
    reflections.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return { data: reflections, error: null };
  }
}

/**
 * Save a new daily reflection
 */
export async function createReflection(
  userId: string,
  text: string
): Promise<{ data: DailyReflection | null; error: string | null }> {
  if (!userId) {
    return { data: null, error: 'User is not authenticated' };
  }

  const trimmed = text?.trim();
  if (!trimmed || trimmed.length === 0) {
    return { data: null, error: 'Reflection text cannot be empty.' };
  }

  if (trimmed.length > 5000) {
    return { data: null, error: 'Reflection text cannot exceed 5000 characters.' };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('daily_reflections')
        .insert({
          user_id: userId,
          reflection_text: trimmed,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }
      return { data: data as DailyReflection, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save reflection';
      return { data: null, error: message };
    }
  } else {
    const reflections = getLocalReflections(userId);
    const newReflection: DailyReflection = {
      id: 'ref-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now(),
      user_id: userId,
      reflection_text: trimmed,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    reflections.unshift(newReflection);
    saveLocalReflections(userId, reflections);
    return { data: newReflection, error: null };
  }
}

/**
 * Delete a reflection
 */
export async function deleteReflection(
  reflectionId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!userId) {
    return { success: false, error: 'User is not authenticated' };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('daily_reflections')
        .delete()
        .eq('id', reflectionId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete reflection';
      return { success: false, error: message };
    }
  } else {
    const reflections = getLocalReflections(userId);
    const filtered = reflections.filter(
      (r) => !(r.id === reflectionId && r.user_id === userId)
    );
    saveLocalReflections(userId, filtered);
    return { success: true, error: null };
  }
}
