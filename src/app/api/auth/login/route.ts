import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/auth/services/authService";
import { validateEmail, validatePassword } from "@/utils/validation";
import { logger } from "@/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailValidation = validateEmail(email);
    if (emailValidation) {
      return NextResponse.json(
        { success: false, message: emailValidation },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      return NextResponse.json(
        { success: false, message: passwordValidation },
        { status: 400 }
      );
    }

    const result = await AuthService.login({
      email: email.toLowerCase().trim(),
      password,
    });

    if (result.success && result.token) {
      const response = NextResponse.json({
        success: result.success,
        message: result.message,
        user: result.user,
      });

      response.cookies.set("auth-token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    } else {
      return NextResponse.json(
        {
          success: result.success,
          message: result.message,
          requiresVerification:
            (result as { requiresVerification?: boolean })
              .requiresVerification || false,
        },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error("Login API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
