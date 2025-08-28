import nodemailer from "nodemailer";
import { logger } from "@/utils/logger";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const APP_NAME = process.env.APP_NAME || "DRIVN";

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const currentYear = new Date().getFullYear();
    const verificationUrl = `${APP_URL}/auth/verify?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Verify your ${APP_NAME} account`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">${APP_NAME}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Secure Cloud Storage</p>
          </div>

          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email Address</h2>

            <p>Thank you for signing up for ${APP_NAME}! To complete your registration and start using our secure cloud storage platform, please verify your email address.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      padding: 15px 30px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: bold;
                      display: inline-block;
                      transition: transform 0.2s;">
                Verify Email Address
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="background: #f8f9fa; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px;">
              ${verificationUrl}
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #666; font-size: 14px; margin-bottom: 0;">
              This verification link will expire in 24 hours. If you didn't create an account with ${APP_NAME}, you can safely ignore this email.
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>&copy; ${currentYear} ${APP_NAME}. All rights reserved.</p>
            <p>100% Open Source • S3-Compatible Storage</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to ${APP_NAME}!

        Please verify your email address by clicking the following link:
        ${verificationUrl}

        This link will expire in 24 hours.

        If you didn't create an account with ${APP_NAME}, you can safely ignore this email.

        Best regards,
        The ${APP_NAME} Team
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info("Verification email sent to:", email);
    } catch (error) {
      logger.error("Error sending verification email:", error);
      throw new Error("Failed to send verification email");
    }
  }

  async sendForgotPasswordEmail(email: string, token: string): Promise<void> {
    const currentYear = new Date().getFullYear();
    const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Reset your ${APP_NAME} password`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">${APP_NAME}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Secure Cloud Storage</p>
          </div>

          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>

            <p>We received a request to reset your password for your ${APP_NAME} account. If you made this request, click the button below to reset your password:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      padding: 15px 30px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: bold;
                      display: inline-block;
                      transition: transform 0.2s;">
                Reset Password
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="background: #f8f9fa; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px;">
              ${resetUrl}
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #666; font-size: 14px; margin-bottom: 0;">
              This password reset link will expire in 1 hour for security reasons. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>&copy; ${currentYear} ${APP_NAME}. All rights reserved.</p>
            <p>100% Open Source • S3-Compatible Storage</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Reset your ${APP_NAME} password

        We received a request to reset your password for your ${APP_NAME} account.

        If you made this request, click the following link to reset your password:
        ${resetUrl}

        This link will expire in 1 hour for security reasons.

        If you didn't request a password reset, you can safely ignore this email.

        Best regards,
        The ${APP_NAME} Team
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info("Forgot password email sent to:", email);
    } catch (error) {
      logger.error("Error sending forgot password email:", error);
      throw new Error("Failed to send forgot password email");
    }
  }
}

export const emailService = new EmailService();
