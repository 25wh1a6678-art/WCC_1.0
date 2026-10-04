import { z } from 'zod';

export const TaskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

export const TaskSuggestionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Task title cannot be empty')
    .max(255, 'Task title is too long'),
  description: z.string().trim().nullable().optional(),
  priority: TaskPriorityEnum.default('medium'),
  estimated_minutes: z
    .number()
    .int('Estimated duration must be an integer')
    .positive('Estimated duration must be greater than 0')
    .max(480, 'Estimated duration cannot exceed 480 minutes (8 hours)')
    .default(25),
  deadline: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime());
      },
      { message: 'Invalid ISO date string for deadline' }
    ),
  reasoning: z
    .string()
    .trim()
    .max(500, 'Reasoning text too long')
    .optional()
    .default('Extracted from student reflection'),
});

export const AIPlanResponseSchema = z.object({
  tasks: z
    .array(TaskSuggestionSchema)
    .max(20, 'Maximum of 20 tasks per planning session allowed'),
});

export type TaskSuggestion = z.infer<typeof TaskSuggestionSchema>;
export type AIPlanResponse = z.infer<typeof AIPlanResponseSchema>;

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Validates untrusted raw output (string or parsed object) against AIPlanResponseSchema
 */
export function validateAIPlanResponse(rawInput: unknown): ValidationResult<AIPlanResponse> {
  try {
    let parsed: unknown = rawInput;

    if (typeof rawInput === 'string') {
      const trimmed = rawInput.trim();
      if (!trimmed) {
        return { success: false, error: 'Empty AI response received' };
      }
      // Strip markdown code fences if model returned ```json ... ```
      let cleaned = trimmed;
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      try {
        parsed = JSON.parse(cleaned);
      } catch (jsonErr) {
        return {
          success: false,
          error: `Invalid JSON format: ${jsonErr instanceof Error ? jsonErr.message : 'Syntax error'}`,
        };
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Response must be a valid JSON object' };
    }

    const result = AIPlanResponseSchema.safeParse(parsed);
    if (!result.success) {
      const flat = result.error.flatten();
      const firstError =
        result.error.issues?.[0]?.message || 'Schema validation failed';
      return {
        success: false,
        error: `Validation error: ${firstError}`,
        fieldErrors: flat.fieldErrors as Record<string, string[]>,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected validation error';
    return { success: false, error: message };
  }
}
