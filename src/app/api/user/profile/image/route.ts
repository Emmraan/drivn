import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import connectDB from '@/utils/database';
import User from '@/auth/models/User';

/**
 * PUT /api/user/profile/image
 * Update user profile image using base64 encoded image data
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();
    const { imageData } = body;

    if (!imageData) {
      return NextResponse.json(
        { success: false, message: 'Image data is required' },
        { status: 400 }
      );
    }

    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, message: 'Invalid image data format' },
        { status: 400 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { image: imageData },
      { new: true }
    ).select('-password');

    return NextResponse.json({
      success: true,
      message: 'Profile image updated successfully',
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
        emailVerified: updatedUser.emailVerified,
      },
    });
  } catch (error) {
    console.error('Update profile image API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}