import { createClient, isSupabaseConfigured } from './supabase/client';
import { Task, TaskFilterOptions, TaskFormData, TaskInsert, TaskStatus, TaskUpdate } from '@/types/task';

const LOCAL_TASKS_PREFIX = 'fc_tasks_user_';
const memoryTasks = new Map<string, Task[]>();

function getLocalTasks(userId: string): Task[] {
  if (typeof window === 'undefined') {
    return memoryTasks.get(userId) || [];
  }
  try {
    const raw = localStorage.getItem(`${LOCAL_TASKS_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return memoryTasks.get(userId) || [];
  }
}

function saveLocalTasks(userId: string, tasks: Task[]): void {
  if (typeof window === 'undefined') {
    memoryTasks.set(userId, tasks);
    return;
  }
  try {
    localStorage.setItem(`${LOCAL_TASKS_PREFIX}${userId}`, JSON.stringify(tasks));
  } catch {
    memoryTasks.set(userId, tasks);
  }
}

/**
 * Fetch a single task by ID
 */
export async function getTaskById(
  taskId: string
): Promise<{ data: Task | null; error: string | null }> {
  if (!taskId) return { data: null, error: 'Task ID is required' };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      if (!error && data) {
        return { data: data as Task, error: null };
      }
    } catch {
      // Fallback
    }
  }

  // Local fallback: search across memory / local storage
  if (typeof window === 'undefined') {
    for (const tasksList of memoryTasks.values()) {
      const found = tasksList.find((t) => t.id === taskId);
      if (found) return { data: found, error: null };
    }
  } else {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(LOCAL_TASKS_PREFIX)) {
          const list: Task[] = JSON.parse(localStorage.getItem(key) || '[]');
          const found = list.find((t) => t.id === taskId);
          if (found) return { data: found, error: null };
        }
      }
    } catch {
      // ignore
    }
  }

  return { data: null, error: 'Task not found' };
}

/**
 * Fetch tasks for an authenticated user with filtering and sorting
 */
export async function getTasks(
  userId: string,
  options?: Partial<TaskFilterOptions>
): Promise<{ data: Task[]; error: string | null }> {
  if (!userId) {
    return { data: [], error: 'User is not authenticated' };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      }

      if (options?.priority && options.priority !== 'all') {
        query = query.eq('priority', options.priority);
      }

      const sortBy = options?.sortBy || 'created_at';
      const ascending = options?.sortOrder === 'asc';
      query = query.order(sortBy, { ascending });

      const { data, error } = await query;
      if (error) {
        return { data: [], error: error.message };
      }

      let filtered = (data || []) as Task[];
      if (options?.searchQuery) {
        const q = options.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q))
        );
      }

      return { data: filtered, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tasks';
      return { data: [], error: message };
    }
  } else {
    // Local storage fallback
    let tasks = getLocalTasks(userId);

    if (options?.status && options.status !== 'all') {
      tasks = tasks.filter((t) => t.status === options.status);
    }

    if (options?.priority && options.priority !== 'all') {
      tasks = tasks.filter((t) => t.priority === options.priority);
    }

    if (options?.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    const sortBy = options?.sortBy || 'created_at';
    const isAsc = options?.sortOrder === 'asc';

    tasks.sort((a, b) => {
      if (sortBy === 'deadline') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return isAsc
          ? new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          : new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
      }
      if (sortBy === 'estimated_minutes') {
        return isAsc
          ? a.estimated_minutes - b.estimated_minutes
          : b.estimated_minutes - a.estimated_minutes;
      }
      return isAsc
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return { data: tasks, error: null };
  }
}

/**
 * Create a new task
 */
export async function createTask(
  userId: string,
  formData: TaskFormData
): Promise<{ data: Task | null; error: string | null }> {
  if (!userId) {
    return { data: null, error: 'User is not authenticated' };
  }

  // Basic validation
  if (!formData.title || formData.title.trim().length === 0) {
    return { data: null, error: 'Task title is required.' };
  }

  if (formData.estimated_minutes <= 0) {
    return { data: null, error: 'Estimated duration must be at least 1 minute.' };
  }

  const payload: TaskInsert = {
    user_id: userId,
    title: formData.title.trim(),
    description: formData.description?.trim() || null,
    priority: formData.priority,
    estimated_minutes: Number(formData.estimated_minutes),
    deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
    status: formData.status || 'pending',
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }
      return { data: data as Task, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      return { data: null, error: message };
    }
  } else {
    // Local fallback
    const tasks = getLocalTasks(userId);
    const newTask: Task = {
      id: 'task-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now(),
      user_id: userId,
      title: payload.title,
      description: payload.description || null,
      priority: payload.priority || 'medium',
      estimated_minutes: payload.estimated_minutes || 25,
      deadline: payload.deadline || null,
      status: payload.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: payload.status === 'completed' ? new Date().toISOString() : null,
    };

    tasks.unshift(newTask);
    saveLocalTasks(userId, tasks);
    return { data: newTask, error: null };
  }
}

/**
 * Update an existing task
 */
export async function updateTask(
  taskId: string,
  userId: string,
  updates: Partial<TaskFormData>
): Promise<{ data: Task | null; error: string | null }> {
  if (!userId) {
    return { data: null, error: 'User is not authenticated' };
  }

  if (updates.title !== undefined && updates.title.trim().length === 0) {
    return { data: null, error: 'Task title cannot be empty.' };
  }

  if (updates.estimated_minutes !== undefined && updates.estimated_minutes <= 0) {
    return { data: null, error: 'Estimated duration must be greater than 0.' };
  }

  const payload: TaskUpdate = {};
  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.description !== undefined) payload.description = updates.description.trim() || null;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.estimated_minutes !== undefined) payload.estimated_minutes = Number(updates.estimated_minutes);
  if (updates.deadline !== undefined) {
    payload.deadline = updates.deadline ? new Date(updates.deadline).toISOString() : null;
  }
  if (updates.status !== undefined) {
    payload.status = updates.status;
    payload.completed_at = updates.status === 'completed' ? new Date().toISOString() : null;
  }
  payload.updated_at = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }
      return { data: data as Task, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update task';
      return { data: null, error: message };
    }
  } else {
    // Local fallback
    const tasks = getLocalTasks(userId);
    const index = tasks.findIndex((t) => t.id === taskId && t.user_id === userId);
    if (index === -1) {
      return { data: null, error: 'Task not found or access denied.' };
    }

    const updatedTask: Task = {
      ...tasks[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };

    tasks[index] = updatedTask;
    saveLocalTasks(userId, tasks);
    return { data: updatedTask, error: null };
  }
}

/**
 * Toggle task completion status
 */
export async function toggleTaskComplete(
  taskId: string,
  userId: string,
  currentStatus: TaskStatus
): Promise<{ data: Task | null; error: string | null }> {
  const newStatus: TaskStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  return updateTask(taskId, userId, { status: newStatus });
}

/**
 * Delete a task
 */
export async function deleteTask(
  taskId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!userId) {
    return { success: false, error: 'User is not authenticated' };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      return { success: false, error: message };
    }
  } else {
    // Local fallback
    const tasks = getLocalTasks(userId);
    const filtered = tasks.filter((t) => !(t.id === taskId && t.user_id === userId));
    saveLocalTasks(userId, filtered);
    return { success: true, error: null };
  }
}
