import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/utils/database';
import User from '@/auth/models/User';
import VerificationToken from '@/auth/models/VerificationToken';
import { emailService } from '@/auth/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, message: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Delete any existing verification tokens for this email
    await VerificationToken.deleteMany({ email: email.toLowerCase().trim() });

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    await VerificationToken.create({
      email: email.toLowerCase().trim(),
      token: verificationToken,
    });

    // Send verification email
    await emailService.sendVerificationEmail(email.toLowerCase().trim(), verificationToken);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Verification email sent successfully. Please check your inbox.' 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Resend verification API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
