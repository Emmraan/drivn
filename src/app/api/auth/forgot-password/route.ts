import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/auth/services/authService";
import { validateEmail } from "@/utils/validation";
import { logger } from "@/utils/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
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

    const result = await AuthService.forgotPassword(email.toLowerCase().trim());

    if (result.success) {
      return NextResponse.json({
        success: result.success,
        message: result.message,
      });
    } else {
      if (result.existingRequest) {
        return NextResponse.json(
          {
            success: result.success,
            message: result.message,
            existingRequest: result.existingRequest,
          },
          { status: 429 }
        );
      } else {
        return NextResponse.json(
          {
            success: result.success,
            message: result.message,
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    logger.error("Forgot password API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
