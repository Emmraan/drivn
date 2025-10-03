import { Redis } from "@upstash/redis";
import { logger } from "@/utils/logger";

interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
  tokensPerInterval: number;
  intervalMs: number;
  highUsageThreshold: number;
  adaptiveMultiplier: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  isAdaptive: boolean;
  sustainedUsage: number;
}

interface TokenBucketState {
  tokens: number;
  lastRefill: number;
  refillRate: number;
  isAdaptive: boolean;
}

export const rateLimitPolicies: Record<string, RateLimitPolicy> = {
  auth: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    tokensPerInterval: 5,
    intervalMs: 60 * 60 * 1000,
    highUsageThreshold: 0.8,
    adaptiveMultiplier: 0.5,
  },
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    tokensPerInterval: 100,
    intervalMs: 60 * 1000,
    highUsageThreshold: 0.9,
    adaptiveMultiplier: 0.7,
  },
  admin: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
    tokensPerInterval: 20,
    intervalMs: 60 * 60 * 1000,
    highUsageThreshold: 0.85,
    adaptiveMultiplier: 0.6,
  },
  s3: {
    windowMs: 60 * 1000,
    maxRequests: 50,
    tokensPerInterval: 50,
    intervalMs: 60 * 1000,
    highUsageThreshold: 0.9,
    adaptiveMultiplier: 0.7,
  },
};

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function checkRateLimit(
  identifier: string,
  policy: RateLimitPolicy
): Promise<RateLimitResult> {
  const now = Date.now();

  const tokenKey = `ratelimit:tokens:${identifier}`;
  const windowKey = `ratelimit:window:${identifier}`;
  const metricsKey = `ratelimit:metrics:${identifier}`;

  try {
    const [tokenData, windowData] = await Promise.all([
      redis.hgetall(tokenKey) as Promise<Record<string, string> | null>,
      redis.zcount(windowKey, now - policy.windowMs, now) as Promise<number>,
    ]);

    const tokenState: TokenBucketState = {
      tokens: tokenData
        ? parseFloat(tokenData.tokens || policy.tokensPerInterval.toString())
        : policy.tokensPerInterval,
      lastRefill: tokenData
        ? parseInt(tokenData.lastRefill || now.toString())
        : now,
      refillRate: tokenData
        ? parseFloat(
            tokenData.refillRate ||
              (policy.tokensPerInterval / policy.intervalMs).toString()
          )
        : policy.tokensPerInterval / policy.intervalMs,
      isAdaptive: tokenData ? tokenData.isAdaptive === "true" : false,
    };

    const timePassed = now - tokenState.lastRefill;
    const tokensToAdd = Math.floor(timePassed * tokenState.refillRate);
    tokenState.tokens = Math.min(
      policy.tokensPerInterval,
      tokenState.tokens + tokensToAdd
    );
    tokenState.lastRefill = now;

    const sustainedUsage = parseInt(windowData.toString());
    const highUsage =
      sustainedUsage >= policy.maxRequests * policy.highUsageThreshold;

    if (highUsage && !tokenState.isAdaptive) {
      tokenState.refillRate *= policy.adaptiveMultiplier;
      tokenState.isAdaptive = true;
      logger.warn(`Rate limit adaptive mode enabled for ${identifier}`, {
        sustainedUsage,
        threshold: policy.maxRequests * policy.highUsageThreshold,
        newRefillRate: tokenState.refillRate,
      });
    } else if (!highUsage && tokenState.isAdaptive) {
      tokenState.refillRate = policy.tokensPerInterval / policy.intervalMs;
      tokenState.isAdaptive = false;
      logger.info(`Rate limit adaptive mode disabled for ${identifier}`);
    }

    const allowed = tokenState.tokens >= 1;

    if (allowed) {
      tokenState.tokens -= 1;

      await redis.zadd(windowKey, { score: now, member: now.toString() });
      await redis.zremrangebyscore(windowKey, 0, now - policy.windowMs);

      await redis.hincrby(metricsKey, "hits", 1);
    } else {
      await redis.hincrby(metricsKey, "blocks", 1);
    }

    await redis.hset(tokenKey, {
      tokens: tokenState.tokens.toString(),
      lastRefill: tokenState.lastRefill.toString(),
      refillRate: tokenState.refillRate.toString(),
      isAdaptive: tokenState.isAdaptive.toString(),
    });

    await redis.expire(tokenKey, Math.ceil(policy.windowMs / 1000) + 60);
    await redis.expire(windowKey, Math.ceil(policy.windowMs / 1000) + 60);
    await redis.expire(metricsKey, 24 * 60 * 60); // 24 hours for metrics

    const resetTime = Math.ceil((now + policy.intervalMs) / 1000);

    const retryAfter = allowed
      ? undefined
      : Math.ceil(policy.intervalMs / 1000);

    return {
      allowed,
      remaining: Math.max(0, Math.floor(tokenState.tokens)),
      resetTime,
      retryAfter,
      isAdaptive: tokenState.isAdaptive,
      sustainedUsage,
    };
  } catch (error) {
    logger.error("Rate limit check failed:", error);
    return {
      allowed: true,
      remaining: policy.maxRequests - 1,
      resetTime: Math.ceil((now + policy.intervalMs) / 1000),
      isAdaptive: false,
      sustainedUsage: 0,
    };
  }
}

export function getPolicyForPath(pathname: string): RateLimitPolicy {
  if (pathname.startsWith("/api/auth/")) return rateLimitPolicies.auth;
  if (pathname.startsWith("/api/admin/")) return rateLimitPolicies.admin;
  if (pathname.startsWith("/api/s3-")) return rateLimitPolicies.s3;
  if (pathname.startsWith("/api/")) return rateLimitPolicies.api;
  return rateLimitPolicies.api;
}

export async function getRateLimitMetrics(identifier: string) {
  const metricsKey = `ratelimit:metrics:${identifier}`;
  const data = (await redis.hgetall(metricsKey)) as Record<
    string,
    string
  > | null;
  return {
    hits: data ? parseInt(data.hits || "0") : 0,
    blocks: data ? parseInt(data.blocks || "0") : 0,
    total: data ? parseInt(data.hits || "0") + parseInt(data.blocks || "0") : 0,
  };
}

export async function resetRateLimitMetrics(identifier: string) {
  const metricsKey = `ratelimit:metrics:${identifier}`;
  await redis.del(metricsKey);
}
