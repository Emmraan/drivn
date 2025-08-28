import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/auth/middleware/adminMiddleware";
import connectDB from "@/utils/database";
import User from "@/auth/models/User";
import FileMetadata from "@/models/FileMetadata";
import { Types } from "mongoose";
import { logger } from "@/utils/logger";

/**
 * GET /api/admin/users
 * Get all users with their statistics
 */
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";

    const searchQuery = search
      ? {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const skip = (page - 1) * limit;
    const users = await User.find(searchQuery)
      .select("-password -s3Config.secretAccessKey")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments(searchQuery);

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const fileStats = await FileMetadata.aggregate([
          { $match: { userId: new Types.ObjectId(user._id) } },
          {
            $group: {
              _id: null,
              totalFiles: { $sum: 1 },
              totalSize: { $sum: "$fileSize" },
              bucketTypes: { $addToSet: "$bucketType" },
            },
          },
        ]);

        const stats = fileStats[0] || { totalFiles: 0, totalSize: 0 };

        return {
          _id: user._id,
          email: user.email,
          name: user.name,
          provider: user.provider,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          stats: {
            totalFiles: stats.totalFiles,
            totalSize: stats.totalSize,
            bucketType: "user" as const,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          page,
          limit,
          total: totalUsers,
          pages: Math.ceil(totalUsers / limit),
        },
      },
    });
  } catch (error) {
    logger.error("Admin users API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
});
