import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { logger } from "@/utils/logger";
import { checkRateLimit, getPolicyForPath } from "@/utils/rateLimitEdge";

const JWT_SECRET = process.env.JWT_SECRET
  ? new TextEncoder().encode(process.env.JWT_SECRET)
  : null;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    let userId = clientIP;
    let isAuthenticated = false;
    const token = request.cookies.get("auth-token")?.value;
    if (token) {
      try {
        const verified = await jwtVerify(token, JWT_SECRET!, {
          algorithms: ["HS256"],
        });
        userId =
          (verified.payload as { email?: string; id?: string }).id ||
          (verified.payload as { email?: string }).email ||
          clientIP;
        isAuthenticated = true;
      } catch (err) {
        logger.warn("JWT verification failed in rate limit:", err);
      }
    }

    let policy = getPolicyForPath(pathname);
    if (pathname.startsWith("/api/auth/") && isAuthenticated) {
      policy = getPolicyForPath("/api/user/profile");
    }

    const rateLimitResult = await checkRateLimit(userId, policy);

    if (!rateLimitResult.allowed) {
      logger.warn("Rate limit exceeded:", {
        userId,
        pathname,
        clientIP,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
        isAdaptive: rateLimitResult.isAdaptive,
        sustainedUsage: rateLimitResult.sustainedUsage,
      });

      const response = NextResponse.json(
        {
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 }
      );

      response.headers.set("X-RateLimit-Limit", policy.maxRequests.toString());
      response.headers.set(
        "X-RateLimit-Remaining",
        rateLimitResult.remaining.toString()
      );
      response.headers.set(
        "X-RateLimit-Reset",
        rateLimitResult.resetTime.toString()
      );
      if (rateLimitResult.retryAfter) {
        response.headers.set(
          "Retry-After",
          rateLimitResult.retryAfter.toString()
        );
      }

      return response;
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", policy.maxRequests.toString());
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimitResult.remaining.toString()
    );
    response.headers.set(
      "X-RateLimit-Reset",
      rateLimitResult.resetTime.toString()
    );

    return response;
  }

  const publicRoutes = ["/auth/verify"];
  const authRoutes = ["/login", "/signup"];
  const protectedRoutes = ["/dashboard"];
  const adminRoutes = ["/admin-dashboard"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.includes(pathname);
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));
  const isHomeRoute = pathname === "/";

  const token = request.cookies.get("auth-token")?.value;
  let isTokenValid = false;
  let userEmail = "";

  if (token && JWT_SECRET) {
    try {
      const verified = await jwtVerify(token, JWT_SECRET!, {
        algorithms: ["HS256"],
      });
      isTokenValid = !!verified;
      userEmail = (verified.payload as { email?: string }).email || "";
    } catch (err) {
      logger.warn("JWT verification failed:", err);
    }
  }

  if (isPublicRoute) return NextResponse.next();

  if (isTokenValid) {
    if (isAdminRoute) {
      const adminEmail = process.env.ADMIN_EMAIL;
      logger.info("Admin check:", {
        adminEmail,
        userEmail,
        isMatch:
          adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase(),
      });

      if (!adminEmail || userEmail.toLowerCase() !== adminEmail.toLowerCase()) {
        logger.info("Admin access denied, redirecting to dashboard");
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      logger.info("Admin access granted");
    }

    if (isAuthRoute || isHomeRoute) {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase()) {
        return NextResponse.redirect(new URL("/admin-dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isProtectedRoute || isAdminRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     *
     * API routes are now included for rate limiting.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
