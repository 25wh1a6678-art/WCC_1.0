import { GoogleGenAI } from '@google/genai';

export interface GeminiClientConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
}

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return false;
  if (key.includes('placeholder') || key.includes('your-gemini')) return false;
  return key.trim().length > 10;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured in server environment');
  }
  return new GoogleGenAI({ apiKey });
}

export async function callGeminiGenerate(
  prompt: string,
  systemInstruction?: string,
  config?: GeminiClientConfig
): Promise<string> {
  const client = getGeminiClient();
  const modelName = config?.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  console.log(`[AI] Request started: model=${modelName}, promptLength=${prompt.length}`);

  try {
    const response = await client.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: config?.temperature ?? 0.2,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini API returned an empty response text');
    }

    console.log(`[AI] Response received: length=${text.length}`);
    return text;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[AI] Gemini call failed: ${errorMsg}`);

    // Map common errors without exposing keys or raw stack traces
    if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('invalid api key')) {
      throw new Error('Invalid Gemini API key provided.');
    }
    if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429')) {
      throw new Error('Gemini API rate limit exceeded. Please wait a moment and try again.');
    }
    if (errorMsg.includes('DEADLINE_EXCEEDED') || errorMsg.includes('timeout')) {
      throw new Error('AI request timed out. Please try with shorter input.');
    }

    throw new Error('AI planning is temporarily unavailable. You can still add tasks manually.');
  }
}
