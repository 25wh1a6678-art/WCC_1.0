import { callGeminiGenerate, isGeminiConfigured } from './gemini';
import { validateAIPlanResponse, TaskSuggestion } from './schemas';

export interface PlanTasksOptions {
  currentTime?: string;
  existingTasks?: Array<{ title: string; status: string }>;
}

export interface PlanTasksResult {
  tasks: TaskSuggestion[];
  source: 'gemini' | 'demo_fallback';
  error: string | null;
}

const SYSTEM_INSTRUCTION = `You are the AI Task Extraction Engine for "Focus Contract", an anti-procrastination system for students.
Your job is to read a student's unstructured reflection or thoughts and extract concrete, actionable tasks that still need to be completed.

CORE RULES:
1. EXTRACT ONLY UNFINISHED WORK: If a student mentions something they already finished or completed (e.g. "I finished Java lab today"), DO NOT create a task for it. Only extract tasks that are pending, incomplete, or upcoming.
2. ACTIONABLE & SPECIFIC TITLES: Prefer titles like "Complete DBMS normalization exercises" over vague titles like "DBMS" or "Study".
3. AVOID INVENTING TASKS: Do not fabricate tasks that were not explicitly mentioned or clearly implied.
4. AVOID INVENTING EXACT DEADLINES:
   - If the student specifies a clear deadline (e.g., "submit by 6 PM today", "due tomorrow evening"), compute an appropriate ISO 8601 string based on CURRENT_TIME.
   - If no specific time or day is stated, set "deadline": null. DO NOT invent arbitrary deadlines like 9:00 AM.
5. REALISTIC DURATIONS: Estimate conservative, manageable duration in minutes (typically 15 to 90 minutes). estimated_minutes MUST be a positive integer.
6. PRIORITIES: Allowed values are "low", "medium", "high", "urgent".
   - Assign "urgent" if due within 24 hours or an exam is tomorrow.
   - Assign "high" if important coursework with an approaching deadline.
   - Assign "medium" for standard assignments.
   - Assign "low" for optional or long-horizon reading.
7. REASONING: Provide a brief 1-sentence justification for the priority and duration.
8. STABLE JSON: Output valid JSON only, matching the required schema with a "tasks" array.`;

/**
 * Fallback demo parser used when GEMINI_API_KEY is not configured
 * Allows students and judges to test the complete review and accept workflow immediately
 */
function generateDemoPlan(input: string, currentTime: string): TaskSuggestion[] {
  const text = input.trim();
  const tasks: TaskSuggestion[] = [];
  const now = new Date(currentTime);

  // Check common student subject keywords
  const subjectMatches = [
    { regex: /dbms|database/i, title: 'Complete DBMS Assignment & Practice Queries', mins: 45, prio: 'high' as const },
    { regex: /dld|digital logic/i, title: 'Study DLD Sequential Logic & Flip-Flops', mins: 40, prio: 'urgent' as const },
    { regex: /java|programming|code|lab/i, title: 'Finish Java Programming Lab exercises', mins: 30, prio: 'medium' as const },
    { regex: /math|calculus|algebra/i, title: 'Review Mathematics problem set', mins: 50, prio: 'medium' as const },
    { regex: /web|frontend|backend/i, title: 'Work on Web Development project modules', mins: 45, prio: 'medium' as const },
  ];

  // Split into clauses to evaluate what is finished vs what is pending
  const clauses = text.split(/(?:[.,;\n]+|\s+but\s+|\s+however\s+|\s+yet\s+)/i);

  for (const item of subjectMatches) {
    let mentionedAsPending = false;
    let mentionedAsFinished = false;

    for (const rawClause of clauses) {
      const clause = rawClause.trim();
      if (item.regex.test(clause)) {
        const isFinished = /(?:finished|completed|done\s+with|submitted|already\s+did)/i.test(clause);
        if (isFinished) {
          mentionedAsFinished = true;
        } else {
          mentionedAsPending = true;
        }
      }
    }

    if (mentionedAsPending && !mentionedAsFinished) {
      tasks.push({
        title: item.title,
        description: `Extracted from reflection: "${text.substring(0, 100)}..."`,
        priority: item.prio,
        estimated_minutes: item.mins,
        deadline: item.prio === 'urgent' ? new Date(now.getTime() + 86400000).toISOString() : null,
        reasoning: 'Extracted by demo parser based on academic subject references.',
      });
    }
  }

  // If no specific subject matched, create a clean parsed task from the text
  if (tasks.length === 0) {
    tasks.push({
      title: text.length > 50 ? `${text.substring(0, 45)}...` : text,
      description: `Student input: "${text}"`,
      priority: 'high',
      estimated_minutes: 30,
      deadline: null,
      reasoning: 'Extracted task suggestion ready for review and commitment.',
    });
  }

  return tasks;
}

/**
 * Extracts structured tasks from student's unstructured text using Gemini with schema validation
 */
export async function planTasksFromReflection(
  input: string,
  options?: PlanTasksOptions
): Promise<PlanTasksResult> {
  const trimmed = input?.trim();
  if (!trimmed) {
    return {
      tasks: [],
      source: 'gemini',
      error: 'Please enter a description of what you need to do.',
    };
  }

  if (trimmed.length > 3000) {
    return {
      tasks: [],
      source: 'gemini',
      error: 'Input text is too long. Please keep your reflection under 3000 characters.',
    };
  }

  const nowIso = options?.currentTime || new Date().toISOString();

  // If Gemini is not configured, gracefully use the demo planner
  if (!isGeminiConfigured()) {
    console.log('[AI] GEMINI_API_KEY not configured. Generating plan via demo engine.');
    const demoTasks = generateDemoPlan(trimmed, nowIso);
    console.log(`[AI] Demo plan generated with ${demoTasks.length} suggestions.`);
    return {
      tasks: demoTasks,
      source: 'demo_fallback',
      error: null,
    };
  }

  // Prompt construction
  const prompt = `CURRENT_TIME: ${nowIso}

STUDENT INPUT:
"""
${trimmed}
"""

Extract all incomplete or pending academic tasks as structured JSON with the schema:
{
  "tasks": [
    {
      "title": string,
      "description": string | null,
      "priority": "low" | "medium" | "high" | "urgent",
      "estimated_minutes": number,
      "deadline": ISO string | null,
      "reasoning": string
    }
  ]
}`;

  try {
    const rawResponse = await callGeminiGenerate(prompt, SYSTEM_INSTRUCTION);

    // Validate raw response with Zod schema
    const validation = validateAIPlanResponse(rawResponse);
    if (!validation.success || !validation.data) {
      console.error(`[AI] Validation failed: ${validation.error}`);
      return {
        tasks: [],
        source: 'gemini',
        error: `AI generated an invalid plan format. You can still add tasks manually. (${validation.error})`,
      };
    }

    console.log(`[AI] Validation passed! Extracted ${validation.data.tasks.length} tasks.`);
    return {
      tasks: validation.data.tasks,
      source: 'gemini',
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI planning is temporarily unavailable.';
    console.warn(`[AI] Gemini request error: ${message}. Using fallback planner.`);
    
    // Provide automatic fallback so the student workflow is never halted
    const fallbackTasks = generateDemoPlan(trimmed, nowIso);
    if (fallbackTasks.length > 0) {
      return {
        tasks: fallbackTasks,
        source: 'demo_fallback',
        error: null,
      };
    }

    return {
      tasks: [],
      source: 'gemini',
      error: message,
    };
  }
}
