import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return false;
  if (url.includes('placeholder-project') || url.includes('your-project-id')) return false;
  if (key.includes('placeholder-anon-key') || key.includes('your-anon-key')) return false;

  return true;
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  return createBrowserClient<Database>(url, key);
}
