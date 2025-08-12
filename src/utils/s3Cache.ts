/**
 * Simple in-memory cache for S3 operations
 */
export class S3Cache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: unknown, ttl: number = this.DEFAULT_TTL) {
    console.log('💾 Cache SET:', key);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): unknown | null {
    const item = this.cache.get(key);
    if (!item) {
      console.log('💾 Cache MISS:', key);
      return null;
    }

    if (Date.now() - item.timestamp > item.ttl) {
      console.log('💾 Cache EXPIRED:', key);
      this.cache.delete(key);
      return null;
    }

    console.log('💾 Cache HIT:', key);
    return item.data;
  }

  invalidate(pattern: string) {
    const keysToDelete: string[] = [];
    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
        this.cache.delete(key);
      }
    }
    console.log('💾 Cache INVALIDATED:', keysToDelete.length, 'keys for pattern:', pattern);
  }

  clear() {
    console.log('💾 Cache CLEARED');
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  keys() {
    return Array.from(this.cache.keys());
  }
}

// Global cache instance
export const s3Cache = new S3Cache();
