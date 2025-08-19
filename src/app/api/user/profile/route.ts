import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import connectDB from '@/utils/database';
import User from '@/auth/models/User';
import bcrypt from 'bcryptjs';

/**
 * GET /api/user/profile
 * Get user profile information
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('Get user profile API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/profile
 * Update user profile information
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
    const { name, email, currentPassword, newPassword } = body;

    const updateData: { name?: string; email?: string; password?: string } = {};

    if (name && name.trim() !== user.name) {
      updateData.name = name.trim();
    }

    if (email && email.trim() !== user.email) {
      const existingUser = await User.findOne({ email: email.trim() });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return NextResponse.json(
          { success: false, message: 'Email is already in use' },
          { status: 400 }
        );
      }
      updateData.email = email.trim();
    }

    if (currentPassword && newPassword) {
      if (!user.password) {
        return NextResponse.json(
          { success: false, message: 'No password set. Please use the reset password flow' },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, message: 'New password must be at least 8 characters long' },
          { status: 400 }
        );
      }

      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No changes to update',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true }
    ).select('-password');

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
        emailVerified: updatedUser.emailVerified,
      },
    });
  } catch (error) {
    console.error('Update user profile API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}