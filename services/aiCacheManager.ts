import { MindoSettings } from '../types';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class AICacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

  // Generate cache key from skill id, inputs, and model
  generateKey(skillId: string, inputs: any, model: string): string {
    const inputStr = JSON.stringify(inputs);
    return `${skillId}|${inputStr}|${model}`;
  }

  // Get from cache
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  // Set to cache
  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs
    };
    this.memoryCache.set(key, entry);
  }

  // Clear cache
  clear(): void {
    this.memoryCache.clear();
  }

  // Get cache size (for debugging)
  size(): number {
    return this.memoryCache.size;
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Global singleton
export const cacheManager = new AICacheManager();
