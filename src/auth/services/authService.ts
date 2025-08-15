import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import connectDB from '@/utils/database';
import User, { IUser } from '@/auth/models/User';
import VerificationToken from '@/auth/models/VerificationToken';
import { emailService } from './emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface SignupData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  static async signup(data: SignupData): Promise<{ success: boolean; message: string; user?: Partial<IUser> }> {
    try {
      await connectDB();

      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return { success: false, message: 'User already exists with this email' };
      }

      const hashedPassword = await bcrypt.hash(data.password, 12);

      const user = new User({
        email: data.email,
        password: hashedPassword,
        name: data.name,
        provider: 'credentials',
      });

      await user.save();

      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      await VerificationToken.create({
        email: data.email,
        token: verificationToken,
      });

      await emailService.sendVerificationEmail(data.email, verificationToken);

      return {
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, message: 'An error occurred during signup' };
    }
  }

  static async login(data: LoginData): Promise<{ success: boolean; message: string; user?: Partial<IUser>; token?: string; requiresVerification?: boolean }> {
    try {
      await connectDB();

      const user = await User.findOne({ email: data.email, provider: 'credentials' });
      if (!user || !user.password) {
        return { success: false, message: 'Invalid email or password' };
      }

      const isValidPassword = await bcrypt.compare(data.password, user.password);
      if (!isValidPassword) {
        return { success: false, message: 'Invalid email or password' };
      }

      if (!user.emailVerified) {
        return {
          success: false,
          message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
          requiresVerification: true
        };
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        message: 'Login successful',
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
        token,
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'An error occurred during login' };
    }
  }

  static async verifyEmail(token: string): Promise<{ success: boolean; message: string; user?: Partial<IUser>; token?: string }> {
    try {
      await connectDB();

      const verificationToken = await VerificationToken.findOne({ token });
      if (!verificationToken || verificationToken.expires < new Date()) {
        return { success: false, message: 'Invalid or expired verification token' };
      }

      const user = await User.findOneAndUpdate(
        { email: verificationToken.email },
        { emailVerified: new Date() },
        { new: true }
      );

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      await VerificationToken.deleteOne({ token });

      const authToken = jwt.sign(
        { userId: user._id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return { 
        success: true, 
        message: 'Email verified successfully',
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
        token: authToken
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, message: 'An error occurred during email verification' };
    }
  }

  static async getUserFromToken(token: string): Promise<IUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      await connectDB();
      return await User.findById(decoded.userId).select('-password');
    } catch (error) {
      console.error('Get user from token error:', error);
      return null;
    }
  }

  static async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      if (user.emailVerified) {
        return { success: false, message: 'Email is already verified' };
      }

      await VerificationToken.deleteMany({ email: email.toLowerCase().trim() });

      const verificationToken = crypto.randomBytes(32).toString('hex');

      await VerificationToken.create({
        email: email.toLowerCase().trim(),
        token: verificationToken,
      });

      await emailService.sendVerificationEmail(email.toLowerCase().trim(), verificationToken);

      return {
        success: true,
        message: 'Verification email sent successfully. Please check your inbox.',
      };
    } catch (error) {
      console.error('Resend verification error:', error);
      return { success: false, message: 'An error occurred while sending verification email' };
    }
  }
}
