import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/auth/middleware/adminMiddleware';

/**
 * GET /api/admin/settings
 * Get admin settings
 */
export const GET = requireAdmin(async () => {
  try {
    // For now, return default settings
    // In a real implementation, these would be stored in a database
    const settings = {
      platformSettings: {
        siteName: process.env.SITE_NAME || 'DRIVN',
        siteDescription: process.env.SITE_DESCRIPTION || 'Cloud Storage Platform',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'),
        allowedFileTypes: ['*'],
        enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',
        requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
      },
      storageSettings: {
        enableUserStorage: process.env.ENABLE_USER_STORAGE !== 'false',
      },
      securitySettings: {
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1440'),
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        enableTwoFactor: process.env.ENABLE_TWO_FACTOR === 'true',
        passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
      },
    };

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/settings
 * Update admin settings
 */
export const PUT = requireAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { platformSettings, storageSettings, securitySettings } = body;

    // In a real implementation, you would:
    // 1. Validate the settings
    // 2. Store them in a database or configuration file
    // 3. Apply them to the running application
    // 4. Possibly restart certain services

    // For now, we'll just return a success response
    // indicating that the settings would be saved
    console.log('Settings update request:', {
      platformSettings,
      storageSettings,
      securitySettings,
    });

    if (!platformSettings?.siteName) {
      return NextResponse.json(
        { success: false, message: 'Site name is required' },
        { status: 400 }
      );
    }



    if (securitySettings?.passwordMinLength < 6) {
      return NextResponse.json(
        { success: false, message: 'Password minimum length must be at least 6 characters' },
        { status: 400 }
      );
    }

    // In a production environment, you would save these settings
    // For this demo, we'll just return success
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      note: 'In production, these settings would be persisted and applied to the system',
    });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});
