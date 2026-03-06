import { MindoSettings } from '../types';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2
};

// Exponential backoff retry wrapper
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delayMs = opts.initialDelayMs!;

  for (let attempt = 1; attempt <= opts.maxAttempts!; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if it's a client error (4xx) except 429 (rate limit)
      if (lastError.message.includes('(4') && !lastError.message.includes('(429')) {
        throw lastError;
      }

      if (attempt < opts.maxAttempts!) {
        console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * opts.backoffMultiplier!, opts.maxDelayMs!);
      }
    }
  }

  throw lastError || new Error('Max retry attempts exceeded');
}

// Robust JSON parser with fallbacks
export function parseJSON<T>(
  text: string,
  fallback?: T
): T | null {
  if (!text || text.trim().length === 0) {
    return fallback ?? null;
  }

  // Strategy 1: Direct parse
  try {
    return JSON.parse(text);
  } catch (e) {
    // console.debug('Direct JSON parse failed, trying cleanup...');
  }

  // Strategy 2: Remove markdown code blocks
  try {
    const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    // console.debug('Cleaned parse failed, trying regex extraction...');
  }

  // Strategy 3: Try to extract JSON object/array with regex
  try {
    const matches = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (matches && matches[1]) {
      return JSON.parse(matches[1]);
    }
  } catch (e) {
    // console.debug('Regex extraction failed');
  }

  // Strategy 4: Try JSON5 (lenient parsing) if available, otherwise fallback
  try {
    // Try a simple line-by-line JSON reconstruction for arrays
    if (text.trim().startsWith('[')) {
      // This is a simple attempt—a full JSON5 parser would be better
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const filtered = lines.filter(l => !l.trim().startsWith('//'));
      const rejoined = filtered.join('\n');
      return JSON.parse(rejoined);
    }
  } catch (e) {
    // console.debug('Line-based parse failed');
  }

  console.error('All JSON parse strategies failed. Raw text:', text);
  return fallback ?? null;
}

// Validate response against schema
export function validateSchema(data: any, schema: any): boolean {
  if (!schema) return true; // No schema = assume valid
  
  if (schema.type === 'array' && !Array.isArray(data)) return false;
  if (schema.type === 'object' && typeof data !== 'object') return false;
  
  // Simple validation: check required fields if defined
  if (schema.type === 'object' && schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) return false;
    }
  }

  return true;
}

// Sanitize error messages for user display
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('(429')) return 'AI 服务请求过于频繁，请稍候尝试';
    if (msg.includes('(401') || msg.includes('(403')) return 'AI API 密钥无效或已过期，请检查插件设置';
    if (msg.includes('(500')) return 'AI 服务暂时不可用，请稍后重试';
    if (msg.includes('无法解析')) return '无法解析 AI 返回的数据格式，请检查模型和提示词';
    return msg;
  }
  return String(error);
}
