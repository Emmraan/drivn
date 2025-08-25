import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/auth/services/authService";
import { validatePassword } from "@/utils/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Token and new password are required" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(newPassword);
    if (passwordValidation) {
      return NextResponse.json(
        { success: false, message: passwordValidation },
        { status: 400 }
      );
    }

    const result = await AuthService.resetPassword(token, newPassword);

    if (result.success) {
      return NextResponse.json({
        success: result.success,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        {
          success: result.success,
          message: result.message,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Reset password API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
