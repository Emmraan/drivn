import Redis from "ioredis";
import { logger } from "@/utils/logger";

class RedisCache {
  private client: Redis;
  private readonly DEFAULT_TTL = 5 * 60 * 1000;
  private memoryCache = new Map<
    string,
    { data: unknown; timestamp: number; ttl: number }
  >();
  private redisEnabled = true;

  private readonly INPROC_MAX: number = 1000;
  private inprocCache = new Map<
    string,
    { data: unknown; timestamp: number; ttl: number }
  >();

  private STORAGE_INPROC_MAX: number = 1000;
  private storageInprocCache = new Map<
    string,
    { data: unknown; timestamp: number; ttl: number }
  >();

  private pruneInproc() {
    const STORAGE_MAX = this.INPROC_MAX;
    if (this.inprocCache.size <= STORAGE_MAX) return;
    const oldest: [string, number][] = [];
    for (const [k, v] of this.inprocCache.entries()) {
      oldest.push([k, v.timestamp]);
    }
    oldest.sort((a, b) => a[1] - b[1]);
    const toRemove = oldest.length - STORAGE_MAX;
    for (let i = 0; i < toRemove; i++) {
      this.inprocCache.delete(oldest[i][0]);
    }
  }

  private pruneStorageInproc() {
    if (this.storageInprocCache.size <= this.STORAGE_INPROC_MAX) return;
    const oldest: [string, number][] = [];
    for (const [k, v] of this.storageInprocCache.entries()) {
      oldest.push([k, v.timestamp]);
    }
    oldest.sort((a, b) => a[1] - b[1]);
    const toRemove = oldest.length - this.STORAGE_INPROC_MAX;
    for (let i = 0; i < toRemove; i++) {
      this.storageInprocCache.delete(oldest[i][0]);
    }
  }

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      tls: {},
      family: 4,
    });

    this.client.on("error", (err) => {
      logger.error("Redis Client Error", err);
      this.redisEnabled = false;
    });

    this.client.on("connect", () => {
      logger.info("Redis connected successfully");
    });
  }

  async set(key: string, data: unknown, ttl: number = this.DEFAULT_TTL) {
    try {
      if (this.redisEnabled) {
        await this.client.setex(
          key,
          Math.floor(ttl / 1000),
          JSON.stringify(data)
        );
        logger.info("💾 Redis SET:", key);
      }
    } catch (error) {
      logger.error("Redis set failed, using in-memory fallback:", error);
      this.redisEnabled = false;
    }

    try {
      if (key.startsWith("dashboard/")) {
        const entry = { data, timestamp: Date.now(), ttl };
        this.storageInprocCache.set(key, entry);
        this.pruneStorageInproc();
        logger.info("💾 Dashboard In-Memory SET (InProc):", key);
      } else {
        const entry = { data, timestamp: Date.now(), ttl };
        this.inprocCache.set(key, entry);
        this.pruneInproc();
        logger.info("💾 In-Memory SET (InProc):", key);
      }
    } catch {
      logger.info("💾 In-Memory SET (InProc) failed for key:", key);
    }

    if (!this.redisEnabled) {
      logger.info("💾 In-Memory SET (Fallback):", key);
      this.memoryCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
      });
    }
  }

  async get(key: string): Promise<unknown | null> {
    if (key.startsWith("dashboard/")) {
      const inproc = this.storageInprocCache.get(key);
      if (inproc) {
        if (Date.now() - inproc.timestamp <= inproc.ttl) {
          logger.info("💾 Dashboard In-Memory HIT (InProc):", key);
          return inproc.data;
        } else {
          logger.info("💾 Dashboard In-Memory EXPIRED (InProc):", key);
          this.storageInprocCache.delete(key);
        }
      }
    } else {
      const inproc = this.inprocCache.get(key);
      if (inproc) {
        if (Date.now() - inproc.timestamp <= inproc.ttl) {
          logger.info("💾 In-Memory HIT (InProc):", key);
          return inproc.data;
        } else {
          logger.info("💾 In-Memory EXPIRED (InProc):", key);
          this.inprocCache.delete(key);
        }
      }
    }

    try {
      if (this.redisEnabled) {
        const data = await this.client.get(key);
        if (data) {
          logger.info("💾 Redis HIT:", key);
          const parsed = JSON.parse(data);
          if (key.startsWith("dashboard/")) {
            this.storageInprocCache.set(key, {
              data: parsed,
              timestamp: Date.now(),
              ttl: this.DEFAULT_TTL,
            });
            this.pruneStorageInproc();
            logger.info("💾 Dashboard In-Memory SET (InProc):", key);
          } else {
            this.inprocCache.set(key, {
              data: parsed,
              timestamp: Date.now(),
              ttl: this.DEFAULT_TTL,
            });
            this.pruneInproc();
            logger.info("💾 In-Memory SET (InProc):", key);
          }
          return parsed;
        }
        logger.info("💾 Redis MISS:", key);
        return null;
      }
    } catch (error) {
      logger.error(
        "Redis get failed, checking in-memory fallback. Error:",
        error
      );
      this.redisEnabled = false;
    }

    const item = this.memoryCache.get(key);
    if (!item) {
      logger.info("💾 In-Memory MISS:", key);
      return null;
    }

    if (Date.now() - item.timestamp > item.ttl) {
      logger.info("💾 In-Memory EXPIRED:", key);
      this.memoryCache.delete(key);
      return null;
    }

    logger.info("💾 In-Memory HIT:", key);
    if (key.startsWith("dashboard/")) {
      this.storageInprocCache.set(key, {
        data: item.data,
        timestamp: Date.now(),
        ttl: item.ttl,
      });
      this.pruneStorageInproc();
    } else {
      this.inprocCache.set(key, {
        data: item.data,
        timestamp: Date.now(),
        ttl: item.ttl,
      });
      this.pruneInproc();
    }
    return item.data;
  }

  async invalidate(pattern: string) {
    try {
      if (this.redisEnabled) {
        const keys = await this.client.keys(`*${pattern}*`);
        if (keys.length > 0) {
          await this.client.del(...keys);
          logger.info(
            "💾 Redis INVALIDATED:",
            keys.length,
            "keys for pattern:",
            pattern
          );
        }
      }
    } catch (error) {
      logger.error(
        "Redis invalidate failed, falling back to in-memory:",
        error
      );
      this.redisEnabled = false;
    }
    const keysToDelete: string[] = [];
    for (const key of Array.from(this.memoryCache.keys())) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
        this.memoryCache.delete(key);
      }
    }
    logger.info(
      "💾 In-Memory INVALIDATED:",
      keysToDelete.length,
      "keys for pattern:",
      pattern
    );
    for (const k of keysToDelete) {
      this.inprocCache.delete(k);
      this.storageInprocCache.delete(k);
    }
  }

  async clear() {
    try {
      if (this.redisEnabled) {
        await this.client.flushall();
        logger.info("💾 Redis CLEARED");
      }
    } catch (error) {
      logger.error("Redis clear failed, falling back to in-memory:", error);
      this.redisEnabled = false;
    }
    // Fallback to in-memory
    logger.info("💾 In-Memory CLEARED");
    this.memoryCache.clear();
    this.inprocCache.clear();
    this.storageInprocCache.clear();
  }

  async disconnect() {
    if (this.redisEnabled) {
      try {
        await this.client.quit();
      } catch (error) {
        logger.error("Redis disconnect error:", error);
      }
    }
  }

  size() {
    return this.memoryCache.size;
  }

  keys() {
    return Array.from(this.memoryCache.keys());
  }
}

export const redisCache = new RedisCache();
