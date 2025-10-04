import { Redis } from "@upstash/redis";
import { logger } from "@/utils/logger";

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly recoveryTime = 60000;

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess(): void {
    if (this.failures > 0) {
      this.failures = 0;
    }
  }

  shouldBlock(): boolean {
    if (this.failures >= this.failureThreshold) {
      if (Date.now() - this.lastFailureTime < this.recoveryTime) {
        return true;
      } else {
        this.failures = 0;
      }
    }
    return false;
  }
}

const circuitBreaker = new CircuitBreaker();

function validateIdentifier(identifier: string): boolean {
  if (!identifier || typeof identifier !== "string") return false;
  if (identifier.length === 0 || identifier.length > 255) return false;
  if (!/^[a-zA-Z0-9._@:-]+$/.test(identifier)) return false;
  if (identifier.includes("\n") || identifier.includes("\r")) return false;
  if (identifier.includes("/*") || identifier.includes("*/")) return false;
  return true;
}

const rateLimitScript = `
  local tokenKey = KEYS[1]
  local windowKey = KEYS[2]
  local metricsKey = KEYS[3]

  -- Arguments: now, oneSecondAgo, policy.maxRequests, policy.tokensPerInterval,
  -- policy.windowMs/1000, policy.intervalMs, policy.highUsageThreshold, policy.adaptiveMultiplier
  local now = tonumber(ARGV[1])
  local oneSecondAgo = tonumber(ARGV[2])
  local maxRequests = tonumber(ARGV[3])
  local tokensPerInterval = tonumber(ARGV[4])
  local windowSeconds = tonumber(ARGV[5])
  local intervalMs = tonumber(ARGV[6])
  local highUsageThreshold = tonumber(ARGV[7])
  local adaptiveMultiplier = tonumber(ARGV[8])

  -- Get server time for consistency
  local serverTime = redis.call('TIME')
  local serverNow = serverTime[1] * 1000 + math.floor(serverTime[2] / 1000)

  -- Read current token state
  local tokenData = redis.call('HGETALL', tokenKey)
  local tokens = tokensPerInterval
  local lastRefill = serverNow
  local refillRate = tokensPerInterval / intervalMs
  local isAdaptive = false

  if #tokenData > 0 then
    for i = 1, #tokenData, 2 do
      if tokenData[i] == 'tokens' then
        tokens = tonumber(tokenData[i+1]) or tokensPerInterval
      elseif tokenData[i] == 'lastRefill' then
        lastRefill = tonumber(tokenData[i+1]) or serverNow
      elseif tokenData[i] == 'refillRate' then
        refillRate = tonumber(tokenData[i+1]) or refillRate
      elseif tokenData[i] == 'isAdaptive' then
        isAdaptive = tokenData[i+1] == 'true'
      end
    end
  end

  -- Calculate token refill
  local timePassed = math.max(0, serverNow - lastRefill)
  local tokensToAdd = math.floor(timePassed * refillRate)
  tokens = math.min(tokensPerInterval, tokens + tokensToAdd)
  lastRefill = serverNow

  -- Get sustained usage (full window)
  local sustainedUsage = redis.call('ZCOUNT', windowKey, serverNow - (windowSeconds * 1000), serverNow)

  -- Get recent requests (1 second window)
  local recentRequests = redis.call('ZCOUNT', windowKey, oneSecondAgo, serverNow)

  -- Calculate max per second
  local maxRequestsPerSecond = math.ceil(maxRequests / windowSeconds)

  -- Check sustained usage for adaptive behavior
  local highUsage = sustainedUsage >= (maxRequests * highUsageThreshold)

  if highUsage and not isAdaptive then
    refillRate = refillRate * adaptiveMultiplier
    isAdaptive = true
  elseif not highUsage and isAdaptive then
    refillRate = tokensPerInterval / intervalMs
    isAdaptive = false
  end

  -- Check limits
  local tokenBucketAllows = tokens >= 1
  local slidingWindowAllows = recentRequests < maxRequestsPerSecond
  local allowed = tokenBucketAllows and slidingWindowAllows and 1 or 0

  -- Update state if allowed
  if allowed == 1 then
    tokens = tokens - 1
    redis.call('ZADD', windowKey, serverNow, tostring(serverNow))
    redis.call('ZREMRANGEBYSCORE', windowKey, 0, serverNow - (windowSeconds * 1000))
    redis.call('HINCRBY', metricsKey, 'hits', 1)
  else
    redis.call('HINCRBY', metricsKey, 'blocks', 1)
  end

  -- Save updated token state
  redis.call('HSET', tokenKey,
    'tokens', tostring(tokens),
    'lastRefill', tostring(lastRefill),
    'refillRate', tostring(refillRate),
    'isAdaptive', tostring(isAdaptive)
  )

  -- Set expirations
  redis.call('EXPIRE', tokenKey, windowSeconds + 60)
  redis.call('EXPIRE', windowKey, windowSeconds + 60)
  redis.call('EXPIRE', metricsKey, 86400)  -- 24 hours

  -- Return results
  return {
    allowed,                    -- 1: allowed (0/1)
    math.max(0, math.floor(tokens)), -- 2: remaining tokens
    sustainedUsage,             -- 3: sustained usage count
    isAdaptive and 1 or 0,      -- 4: is adaptive (0/1)
    refillRate                  -- 5: current refill rate
  }
`;

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

export const rateLimitPolicies: Record<string, RateLimitPolicy> = {
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    tokensPerInterval: 10,
    intervalMs: 15 * 60 * 1000,
    highUsageThreshold: 0.7,
    adaptiveMultiplier: 0.5,
  },

  api: {
    windowMs: 60 * 1000,
    maxRequests: 500,
    tokensPerInterval: 500,
    intervalMs: 60 * 1000,
    highUsageThreshold: 0.8,
    adaptiveMultiplier: 0.6,
  },

  admin: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 100,
    tokensPerInterval: 100,
    intervalMs: 60 * 60 * 1000,
    highUsageThreshold: 0.8,
    adaptiveMultiplier: 0.6,
  },

  s3: {
    windowMs: 60 * 1000,
    maxRequests: 200,
    tokensPerInterval: 200,
    intervalMs: 60 * 1000,
    highUsageThreshold: 0.8,
    adaptiveMultiplier: 0.6,
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
  if (!validateIdentifier(identifier)) {
    logger.warn(`Invalid rate limit identifier: ${identifier}`);
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.ceil((Date.now() + policy.intervalMs) / 1000),
      retryAfter: 60,
      isAdaptive: false,
      sustainedUsage: 0,
    };
  }

  const limiterKey = `ratelimit:limiter:${identifier}`;
  try {
    const limiterCount = await redis.incr(limiterKey);
    await redis.expire(limiterKey, 1);

    if (limiterCount > 20) {
      logger.warn(`Rate limiter abuse detected for ${identifier}`);
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.ceil((Date.now() + 1000) / 1000),
        retryAfter: 1,
        isAdaptive: false,
        sustainedUsage: 0,
      };
    }
  } catch {}

  if (circuitBreaker.shouldBlock()) {
    logger.error(`Rate limiter circuit breaker open for ${identifier}`);
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.ceil((Date.now() + policy.intervalMs) / 1000),
      retryAfter: 60,
      isAdaptive: false,
      sustainedUsage: 0,
    };
  }

  const now = Date.now();
  const oneSecondAgo = now - 1000;

  const tokenKey = `ratelimit:tokens:${identifier}`;
  const windowKey = `ratelimit:window:${identifier}`;
  const metricsKey = `ratelimit:metrics:${identifier}`;

  try {
    const result = (await redis.eval(
      rateLimitScript,
      [tokenKey, windowKey, metricsKey],
      [
        now.toString(),
        oneSecondAgo.toString(),
        policy.maxRequests.toString(),
        policy.tokensPerInterval.toString(),
        (policy.windowMs / 1000).toString(),
        policy.intervalMs.toString(),
        policy.highUsageThreshold.toString(),
        policy.adaptiveMultiplier.toString(),
      ]
    )) as number[];

    circuitBreaker.recordSuccess();

    const allowed = result[0] === 1;
    const remaining = result[1];
    const sustainedUsage = result[2];
    const isAdaptive = result[3] === 1;

    if (!allowed) {
      logger.warn(`Rate limit blocked for ${identifier}`, {
        sustainedUsage,
        remaining,
        isAdaptive,
        policy: Object.keys(rateLimitPolicies).find(
          (key) =>
            rateLimitPolicies[key as keyof typeof rateLimitPolicies] === policy
        ),
      });
    }

    const resetTime = Math.ceil((now + policy.intervalMs) / 1000);
    const retryAfter = allowed
      ? undefined
      : Math.ceil(policy.intervalMs / 1000);

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter,
      isAdaptive,
      sustainedUsage,
    };
  } catch (error) {
    circuitBreaker.recordFailure();

    logger.error(`Rate limit check failed for ${identifier}:`, error);

    const shouldBlock = circuitBreaker.shouldBlock();

    return {
      allowed: !shouldBlock,
      remaining: shouldBlock ? 0 : policy.maxRequests - 1,
      resetTime: Math.ceil((now + policy.intervalMs) / 1000),
      retryAfter: shouldBlock ? 60 : undefined,
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
  if (!validateIdentifier(identifier)) {
    return { hits: 0, blocks: 0, total: 0 };
  }

  try {
    const metricsKey = `ratelimit:metrics:${identifier}`;
    const data = (await redis.hgetall(metricsKey)) as Record<
      string,
      string
    > | null;

    return {
      hits: data ? parseInt(data.hits || "0") : 0,
      blocks: data ? parseInt(data.blocks || "0") : 0,
      total: data
        ? parseInt(data.hits || "0") + parseInt(data.blocks || "0")
        : 0,
    };
  } catch (error) {
    logger.error(`Failed to get metrics for ${identifier}:`, error);
    return { hits: 0, blocks: 0, total: 0 };
  }
}

export async function resetRateLimitMetrics(identifier: string) {
  if (!validateIdentifier(identifier)) {
    return;
  }

  try {
    const metricsKey = `ratelimit:metrics:${identifier}`;
    await redis.del(metricsKey);
    logger.info(`Rate limit metrics reset for ${identifier}`);
  } catch {
    logger.error(`Failed to reset metrics for ${identifier}`);
  }
}
