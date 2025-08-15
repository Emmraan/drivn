import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/auth/middleware/authMiddleware";
import { isAdminEmail } from "@/auth/middleware/adminMiddleware";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const isAdmin = isAdminEmail(user.email);

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image,
        role: isAdmin ? "Admin" : "User",
        isAdmin,
      },
    });
  } catch (error) {
    console.error("Get user API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
