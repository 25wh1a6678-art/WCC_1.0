import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  Commitment,
  CreateCommitmentData,
  CommitmentStats,
} from '@/types/commitment';
import { Task } from '@/types/task';
import { getTaskById, updateTask } from '@/lib/tasks';
import { grantLocalCommitmentReward } from '@/lib/rewards';

const DEMO_COMMITMENTS_KEY = 'focus_contract_demo_commitments';

// In-memory fallback for SSR/testing
let memoryCommitments: Commitment[] = [];

function getStoredCommitments(): Commitment[] {
  if (typeof window === 'undefined') {
    return memoryCommitments;
  }
  try {
    const raw = localStorage.getItem(DEMO_COMMITMENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return memoryCommitments;
  }
}

function saveStoredCommitments(commitments: Commitment[]): void {
  if (typeof window === 'undefined') {
    memoryCommitments = commitments;
    return;
  }
  try {
    localStorage.setItem(DEMO_COMMITMENTS_KEY, JSON.stringify(commitments));
  } catch {
    memoryCommitments = commitments;
  }
}

/**
 * Creates a new commitment binding a task to a focus session
 */
export async function createCommitment(
  userId: string,
  data: CreateCommitmentData
): Promise<{ data: Commitment | null; error: string | null }> {
  if (!userId) {
    return { data: null, error: 'User must be authenticated to create a commitment.' };
  }

  if (!data.taskId) {
    return { data: null, error: 'A task must be selected for the focus commitment.' };
  }

  if (
    !Number.isInteger(data.durationMinutes) ||
    !data.durationMinutes ||
    data.durationMinutes <= 0
  ) {
    return { data: null, error: 'Commitment duration must be at least 1 minute.' };
  }

  // First, verify the task exists and belongs to the user
  const taskRes = await getTaskById(data.taskId);
  if (!taskRes.data || taskRes.data.user_id !== userId) {
    return { data: null, error: 'The selected task was not found.' };
  }

  const now = new Date().toISOString();

  // If Supabase is configured and not running in fallback test mode
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();

      // Automatically abandon any currently active commitment for this user
      await supabase
        .from('commitments')
        .update({ status: 'abandoned', updated_at: now })
        .eq('user_id', userId)
        .eq('status', 'active');

      const { data: newCommitment, error } = await supabase
        .from('commitments')
        .insert({
          user_id: userId,
          task_id: data.taskId,
          duration_minutes: data.durationMinutes,
          status: data.status || 'active',
          started_at: now,
          created_at: now,
          updated_at: now,
        })
        .select('*, tasks(*)')
        .single();

      if (error) {
        console.warn('[Commitments] Supabase insert failed, using demo fallback:', error.message);
      } else if (newCommitment) {
        const joinedTask = (newCommitment as unknown as { tasks?: Task }).tasks;
        return {
          data: {
            ...newCommitment,
            task: joinedTask || taskRes.data,
          } as Commitment,
          error: null,
        };
      }
    } catch (err) {
      console.warn('[Commitments] Error communicating with Supabase:', err);
    }
  }

  // Local / Demo Fallback
  const existing = getStoredCommitments();

  // Mark any previous active commitments as abandoned
  const updated = existing.map((c) =>
    c.user_id === userId && c.status === 'active'
      ? { ...c, status: 'abandoned' as const, updated_at: now }
      : c
  );

  const newCommitment: Commitment = {
    id: `demo-commit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    user_id: userId,
    task_id: data.taskId,
    duration_minutes: data.durationMinutes,
    status: data.status || 'active',
    started_at: now,
    completed_at: null,
    created_at: now,
    updated_at: now,
    task: taskRes.data,
  };

  saveStoredCommitments([newCommitment, ...updated]);
  return { data: newCommitment, error: null };
}

/**
 * Retrieves the currently active focus commitment for a user
 */
export async function getActiveCommitment(
  userId: string
): Promise<{ data: Commitment | null; error: string | null }> {
  if (!userId) {
    return { data: null, error: 'User ID is required.' };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('commitments')
        .select('*, tasks(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const joinedTask = (data as unknown as { tasks?: Task }).tasks;
        return {
          data: {
            ...data,
            task: joinedTask,
          } as Commitment,
          error: null,
        };
      }
    } catch (err) {
      console.warn('[Commitments] Error fetching active commitment from Supabase:', err);
    }
  }

  // Local Fallback
  const stored = getStoredCommitments();
  const active = stored.find((c) => c.user_id === userId && c.status === 'active');
  if (active && !active.task) {
    const taskRes = await getTaskById(active.task_id);
    if (taskRes.data) active.task = taskRes.data;
  }
  return { data: active || null, error: null };
}

/**
 * Retrieves all commitments for a user, sorted newest first
 */
export async function getCommitments(
  userId: string
): Promise<{ data: Commitment[]; error: string | null }> {
  if (!userId) {
    return { data: [], error: 'User ID is required.' };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('commitments')
        .select('*, tasks(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((item) => {
          const joinedTask = (item as unknown as { tasks?: Task }).tasks;
          return {
            ...item,
            task: joinedTask,
          } as Commitment;
        });
        return { data: mapped, error: null };
      }
    } catch (err) {
      console.warn('[Commitments] Error fetching commitments from Supabase:', err);
    }
  }

  // Local Fallback
  const stored = getStoredCommitments();
  const userCommitments = stored.filter((c) => c.user_id === userId);

  // Attach task data if missing
  for (const c of userCommitments) {
    if (!c.task) {
      const taskRes = await getTaskById(c.task_id);
      if (taskRes.data) c.task = taskRes.data;
    }
  }

  return { data: userCommitments, error: null };
}

/**
 * Completes an active commitment and optionally completes the associated task
 */
export async function completeCommitment(
  commitmentId: string,
  autoCompleteTask = true
): Promise<{ data: Commitment | null; error: string | null }> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('complete_commitment_with_rewards', {
        p_commitment_id: commitmentId,
        p_auto_complete_task: autoCompleteTask,
      });
      if (error) return { data: null, error: error.message };
      if (!data || typeof data !== 'object' || Array.isArray(data) || !('commitment' in data)) {
        return { data: null, error: 'The reward service returned an invalid completion response.' };
      }

      const updated = data.commitment as unknown as Commitment;
      const { data: task } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', updated.task_id)
        .eq('user_id', updated.user_id)
        .maybeSingle();
      return {
        data: {
          ...updated,
          task: (task as Task | null) || undefined,
        },
        error: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete commitment.';
      return { data: null, error: message };
    }
  }

  // Local Fallback
  const stored = getStoredCommitments();
  let completedItem: Commitment | null = null;

  const next = stored.map((c) => {
    if (c.id === commitmentId) {
      completedItem = {
        ...c,
        status: 'completed' as const,
        completed_at: now,
        updated_at: now,
      };
      return completedItem;
    }
    return c;
  });

  if (!completedItem) {
    return { data: null, error: 'Commitment not found.' };
  }

  saveStoredCommitments(next);

  let taskRewardEligible = true;
  if ((completedItem as Commitment).task_id && (completedItem as Commitment).user_id) {
    const taskBeforeCompletion = await getTaskById((completedItem as Commitment).task_id);
    const task = taskBeforeCompletion.data;
    taskRewardEligible = Boolean(
      task &&
      (task.status !== 'completed' ||
        !task.completed_at ||
        new Date(task.completed_at).getTime() >=
          new Date((completedItem as Commitment).started_at).getTime())
    );
  }

  if (autoCompleteTask && (completedItem as Commitment).task_id && (completedItem as Commitment).user_id) {
    const taskResult = await updateTask(
      (completedItem as Commitment).task_id,
      (completedItem as Commitment).user_id,
      {
        status: 'completed',
      }
    );
    if (taskResult.error) {
      return { data: completedItem, error: taskResult.error };
    }
  }

  await grantLocalCommitmentReward(
    (completedItem as Commitment).user_id,
    completedItem as Commitment,
    taskRewardEligible
  );

  return { data: completedItem, error: null };
}

/**
 * Reschedules an active commitment
 */
export async function rescheduleCommitment(
  commitmentId: string,
  newDurationMinutes?: number
): Promise<{ data: Commitment | null; error: string | null }> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const payload: { status: 'rescheduled'; updated_at: string; duration_minutes?: number } = {
        status: 'rescheduled',
        updated_at: now,
      };
      if (newDurationMinutes && newDurationMinutes > 0) {
        payload.duration_minutes = newDurationMinutes;
      }

      const { data: updated, error } = await supabase
        .from('commitments')
        .update(payload)
        .eq('id', commitmentId)
        .select('*, tasks(*)')
        .single();

      if (!error && updated) {
        const joinedTask = (updated as unknown as { tasks?: Task }).tasks;
        return {
          data: {
            ...updated,
            task: joinedTask,
          } as Commitment,
          error: null,
        };
      }
    } catch (err) {
      console.warn('[Commitments] Error rescheduling commitment in Supabase:', err);
    }
  }

  // Local Fallback
  const stored = getStoredCommitments();
  let updatedItem: Commitment | null = null;

  const next = stored.map((c) => {
    if (c.id === commitmentId) {
      updatedItem = {
        ...c,
        status: 'rescheduled' as const,
        duration_minutes: newDurationMinutes || c.duration_minutes,
        updated_at: now,
      };
      return updatedItem;
    }
    return c;
  });

  if (!updatedItem) {
    return { data: null, error: 'Commitment not found.' };
  }

  saveStoredCommitments(next);
  return { data: updatedItem, error: null };
}

/**
 * Abandons an active commitment
 */
export async function abandonCommitment(
  commitmentId: string
): Promise<{ data: Commitment | null; error: string | null }> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data: updated, error } = await supabase
        .from('commitments')
        .update({
          status: 'abandoned',
          updated_at: now,
        })
        .eq('id', commitmentId)
        .select('*, tasks(*)')
        .single();

      if (!error && updated) {
        const joinedTask = (updated as unknown as { tasks?: Task }).tasks;
        return {
          data: {
            ...updated,
            task: joinedTask,
          } as Commitment,
          error: null,
        };
      }
    } catch (err) {
      console.warn('[Commitments] Error abandoning commitment in Supabase:', err);
    }
  }

  // Local Fallback
  const stored = getStoredCommitments();
  let updatedItem: Commitment | null = null;

  const next = stored.map((c) => {
    if (c.id === commitmentId) {
      updatedItem = {
        ...c,
        status: 'abandoned' as const,
        updated_at: now,
      };
      return updatedItem;
    }
    return c;
  });

  if (!updatedItem) {
    return { data: null, error: 'Commitment not found.' };
  }

  saveStoredCommitments(next);
  return { data: updatedItem, error: null };
}

/**
 * Calculates focus statistics for a student
 */
export async function getCommitmentStats(userId: string): Promise<CommitmentStats> {
  const res = await getCommitments(userId);
  const commitments = res.data || [];

  const completed = commitments.filter((c) => c.status === 'completed');
  const active = commitments.find((c) => c.status === 'active') || null;
  const totalMinutes = completed.reduce((acc, c) => acc + c.duration_minutes, 0);

  return {
    totalCommitments: commitments.length,
    completedCommitments: completed.length,
    totalFocusedMinutes: totalMinutes,
    activeCommitment: active,
  };
}

/**
 * Deletes a commitment
 */
export async function deleteCommitment(
  commitmentId: string
): Promise<{ success: boolean; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('commitments').delete().eq('id', commitmentId);
      if (!error) return { success: true, error: null };
    } catch (err) {
      console.warn('[Commitments] Error deleting commitment from Supabase:', err);
    }
  }

  const stored = getStoredCommitments();
  const next = stored.filter((c) => c.id !== commitmentId);
  saveStoredCommitments(next);
  return { success: true, error: null };
}
