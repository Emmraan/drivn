import { NextRequest } from "next/server";
import { AuthService } from "@/auth/services/authService";
import { logger } from "@/utils/logger";

export async function getAuthenticatedUser(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return null;
    }

    const user = await AuthService.getUserFromToken(token);
    return user;
  } catch (error) {
    logger.error("Auth middleware error:", error);
    return null;
  }
}

export function requireAuth(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<Response>
) {
  return async (request: NextRequest, ...args: unknown[]) => {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return Response.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    (request as NextRequest & { user: typeof user }).user = user;

    return handler(request, ...args);
  };
}
