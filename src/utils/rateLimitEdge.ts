import { Redis } from "@upstash/redis";
import { logger } from "@/utils/logger";

/* -----------------------------
   🔌 Circuit Breaker
----------------------------- */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 10;
  private readonly recoveryTime = 30000;

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess(): void {
    if (this.failures > 0) this.failures = 0;
  }

  shouldBlock(): boolean {
    if (this.failures >= this.failureThreshold) {
      const withinRecovery =
        Date.now() - this.lastFailureTime < this.recoveryTime;
      if (withinRecovery) return true;
      this.failures = 0;
    }
    return false;
  }
}

const circuitBreaker = new CircuitBreaker();

/* -----------------------------
   🧠 Input Validator
----------------------------- */
function validateIdentifier(identifier: string): boolean {
  return (
    typeof identifier === "string" &&
    identifier.length > 0 &&
    identifier.length <= 255 &&
    /^[a-zA-Z0-9._@:-]+$/.test(identifier)
  );
}

/* -----------------------------
   ⚙️ Optimized Lua Script
----------------------------- */
const rateLimitScript = `
local tokenKey = KEYS[1]
local windowKey = KEYS[2]
local metricsKey = KEYS[3]

local now = tonumber(ARGV[1])
local oneSecondAgo = tonumber(ARGV[2])
local maxRequests = tonumber(ARGV[3])
local tokensPerInterval = tonumber(ARGV[4])
local windowSeconds = tonumber(ARGV[5])
local intervalMs = tonumber(ARGV[6])
local highUsageThreshold = tonumber(ARGV[7])
local adaptiveMultiplier = tonumber(ARGV[8])

local serverTime = redis.call("TIME")
local serverNow = serverTime[1] * 1000 + math.floor(serverTime[2] / 1000)

-- read token state
local data = redis.call("HGETALL", tokenKey)
local tokens = tokensPerInterval
local lastRefill = serverNow
local refillRate = tokensPerInterval / intervalMs
local isAdaptive = false

if #data > 0 then
  for i = 1, #data, 2 do
    local k, v = data[i], data[i + 1]
    if k == "tokens" then tokens = tonumber(v) or tokens
    elseif k == "lastRefill" then lastRefill = tonumber(v) or serverNow
    elseif k == "refillRate" then refillRate = tonumber(v) or refillRate
    elseif k == "isAdaptive" then isAdaptive = v == "true"
    end
  end
end

-- smooth refill (fractional)
local elapsed = math.max(0, serverNow - lastRefill)
tokens = math.min(tokensPerInterval, tokens + (elapsed * refillRate))
lastRefill = serverNow

-- sliding window cleanup & count
local windowStart = serverNow - (windowSeconds * 1000)
redis.call("ZREMRANGEBYSCORE", windowKey, 0, windowStart)
local sustainedUsage = redis.call("ZCOUNT", windowKey, windowStart, serverNow)
local recentRequests = redis.call("ZCOUNT", windowKey, oneSecondAgo, serverNow)
local maxPerSecond = math.ceil(maxRequests / windowSeconds)

-- adaptive adjustment
local highUsage = sustainedUsage >= (maxRequests * highUsageThreshold)
if highUsage and not isAdaptive then
  refillRate = refillRate * adaptiveMultiplier
  isAdaptive = true
elseif not highUsage and isAdaptive then
  refillRate = tokensPerInterval / intervalMs
  isAdaptive = false
end

-- check limits
local allowed = 0
if tokens >= 1 and recentRequests < maxPerSecond then
  allowed = 1
  tokens = tokens - 1
  redis.call("ZADD", windowKey, serverNow, tostring(serverNow))
  redis.call("HINCRBY", metricsKey, "hits", 1)
else
  redis.call("HINCRBY", metricsKey, "blocks", 1)
end

-- persist state
redis.call("HSET", tokenKey,
  "tokens", tostring(tokens),
  "lastRefill", tostring(lastRefill),
  "refillRate", tostring(refillRate),
  "isAdaptive", tostring(isAdaptive)
)

-- expirations
redis.call("EXPIRE", tokenKey, windowSeconds + 60)
redis.call("EXPIRE", windowKey, windowSeconds + 60)
redis.call("EXPIRE", metricsKey, 86400)

return {
  allowed,
  math.floor(tokens),
  sustainedUsage,
  isAdaptive and 1 or 0,
  refillRate
}
`;

/* -----------------------------
   🧩 Rate Limit Policies
----------------------------- */
export interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
  tokensPerInterval: number;
  intervalMs: number;
  highUsageThreshold: number;
  adaptiveMultiplier: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  isAdaptive: boolean;
  sustainedUsage: number;
}

export const rateLimitPolicies: Record<string, RateLimitPolicy> = {
  auth: {
    windowMs: 15 * 1000,
    maxRequests: 50,
    tokensPerInterval: 50,
    intervalMs: 15 * 1000,
    highUsageThreshold: 0.8,
    adaptiveMultiplier: 0.7,
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
    windowMs: 10 * 60 * 1000,
    maxRequests: 100,
    tokensPerInterval: 100,
    intervalMs: 10 * 60 * 1000,
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

/* -----------------------------
   🧩 Redis Client
----------------------------- */
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/* -----------------------------
   ⚡ Rate Limit Check
----------------------------- */
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
      retryAfter: 1,
      isAdaptive: false,
      sustainedUsage: 0,
    };
  }

  try {
    const key = `ratelimit:guard:${identifier}`;
    const count = await redis.incr(key);
    await redis.expire(key, 2);
    if (count > 100) {
      logger.warn(`Rate limiter guard triggered for ${identifier}`);
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.ceil((Date.now() + 2000) / 1000),
        retryAfter: 2,
        isAdaptive: false,
        sustainedUsage: 0,
      };
    }
  } catch (err) {
    logger.error("Guard pre-check failed:", err);
  }

  if (circuitBreaker.shouldBlock()) {
    logger.error(`Rate limiter circuit open for ${identifier}`);
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.ceil((Date.now() + policy.intervalMs) / 1000),
      retryAfter: 30,
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
      logger.warn(`Rate limit BLOCKED: ${identifier}`, {
        sustainedUsage,
        remaining,
        isAdaptive,
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
  } catch (err) {
    circuitBreaker.recordFailure();
    logger.error(`Rate limit check failed for ${identifier}:`, err);

    const block = circuitBreaker.shouldBlock();
    return {
      allowed: !block,
      remaining: block ? 0 : policy.maxRequests - 1,
      resetTime: Math.ceil((Date.now() + policy.intervalMs) / 1000),
      retryAfter: block ? 30 : undefined,
      isAdaptive: false,
      sustainedUsage: 0,
    };
  }
}

/* -----------------------------
   🧩 Policy Router
----------------------------- */
export function getPolicyForPath(pathname: string): RateLimitPolicy {
  if (pathname.startsWith("/api/auth/")) return rateLimitPolicies.auth;
  if (pathname.startsWith("/api/admin/")) return rateLimitPolicies.admin;
  if (pathname.startsWith("/api/s3-")) return rateLimitPolicies.s3;
  return rateLimitPolicies.api;
}

/* -----------------------------
   🧩 Metrics Helpers
----------------------------- */
export async function getRateLimitMetrics(identifier: string) {
  if (!validateIdentifier(identifier)) return { hits: 0, blocks: 0, total: 0 };

  try {
    const data = (await redis.hgetall(
      `ratelimit:metrics:${identifier}`
    )) as Record<string, string> | null;
    const hits = parseInt(data?.hits || "0");
    const blocks = parseInt(data?.blocks || "0");
    return { hits, blocks, total: hits + blocks };
  } catch (err) {
    logger.error(`Metrics fetch failed for ${identifier}:`, err);
    return { hits: 0, blocks: 0, total: 0 };
  }
}

export async function resetRateLimitMetrics(identifier: string) {
  if (!validateIdentifier(identifier)) return;
  try {
    await redis.del(`ratelimit:metrics:${identifier}`);
    logger.info(`Rate limit metrics reset for ${identifier}`);
  } catch (err) {
    logger.error(`Failed to reset metrics for ${identifier}:`, err);
  }
}
