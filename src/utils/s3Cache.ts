import { logger } from "@/utils/logger";

/**
 * Simple in-memory cache for S3 operations
 */
export class S3Cache {
  private cache = new Map<
    string,
    { data: unknown; timestamp: number; ttl: number }
  >();
  private readonly DEFAULT_TTL = 5 * 60 * 1000;

  set(key: string, data: unknown, ttl: number = this.DEFAULT_TTL) {
    logger.info("💾 Cache SET:", key);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): unknown | null {
    const item = this.cache.get(key);
    if (!item) {
      logger.info("💾 Cache MISS:", key);
      return null;
    }

    if (Date.now() - item.timestamp > item.ttl) {
      logger.info("💾 Cache EXPIRED:", key);
      this.cache.delete(key);
      return null;
    }

    logger.info("💾 Cache HIT:", key);
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
    logger.info(
      "💾 Cache INVALIDATED:",
      keysToDelete.length,
      "keys for pattern:",
      pattern
    );
  }

  clear() {
    logger.info("💾 Cache CLEARED");
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  keys() {
    return Array.from(this.cache.keys());
  }
}

export const s3Cache = new S3Cache();
