import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/utils/database";
import User from "@/auth/models/User";
import VerificationToken from "@/auth/models/VerificationToken";
import { emailService } from "@/auth/services/emailService";
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

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, message: "Email is already verified" },
        { status: 400 }
      );
    }

    await VerificationToken.deleteMany({ email: email.toLowerCase().trim() });

    const verificationToken = crypto.randomBytes(32).toString("hex");

    await VerificationToken.create({
      email: email.toLowerCase().trim(),
      token: verificationToken,
    });

    await emailService.sendVerificationEmail(
      email.toLowerCase().trim(),
      verificationToken
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Verification email sent successfully. Please check your inbox.",
      },
      { status: 200 }
    );
  } catch (error) {
    logger.info("Resend verification API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
