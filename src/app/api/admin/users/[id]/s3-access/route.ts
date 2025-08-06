import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/auth/middleware/adminMiddleware';
import connectDB from '@/utils/database';
import User from '@/auth/models/User';

/**
 * PATCH /api/admin/users/[id]/s3-access
 * Toggle user's access to DRIVN S3 bucket
 */
export const PATCH = requireAdmin(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();

    const { id } = await context.params;
    const body = await request.json();
    const { canUseDrivnS3 } = body;

    if (typeof canUseDrivnS3 !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'canUseDrivnS3 must be a boolean value' },
        { status: 400 }
      );
    }

    // Find and update user
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Update user's DRIVN S3 access
    user.canUseDrivnS3 = canUseDrivnS3;
    await user.save();

    return NextResponse.json({
      success: true,
      message: `DRIVN S3 access ${canUseDrivnS3 ? 'granted' : 'revoked'} for user ${user.email}`,
      data: {
        userId: user._id,
        email: user.email,
        canUseDrivnS3: user.canUseDrivnS3,
      },
    });
  } catch (error) {
    console.error('Admin S3 access toggle error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});
