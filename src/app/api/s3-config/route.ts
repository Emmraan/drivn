import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import { S3ConfigService } from '@/services/s3ConfigService';
import { validateS3Config } from '@/utils/encryption';

/**
 * GET /api/s3-config
 * Retrieve user's S3 configuration (returns sanitized version without credentials)
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

    const hasConfig = await S3ConfigService.hasS3Config(user._id);
    
    if (!hasConfig) {
      return NextResponse.json({
        success: true,
        hasConfig: false,
        message: 'No S3 configuration found'
      });
    }

    const config = await S3ConfigService.getS3Config(user._id);
    
    if (!config) {
      return NextResponse.json({
        success: true,
        hasConfig: false,
        message: 'No S3 configuration found'
      });
    }

    // Return sanitized config (without sensitive credentials)
    return NextResponse.json({
      success: true,
      hasConfig: true,
      config: {
        region: config.region,
        bucketName: config.bucketName,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
      }
    });
  } catch (error) {
    console.error('Error retrieving S3 configuration:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/s3-config
 * Save or update user's S3 configuration
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { accessKeyId, secretAccessKey, region, bucketName, endpoint, forcePathStyle } = body;

    // Validate required fields
    if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Access Key ID, Secret Access Key, Region, and Bucket are required' 
        },
        { status: 400 }
      );
    }

    const s3Config = {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      region: region.trim(),
      bucketName: bucketName.trim(),
      endpoint: endpoint?.trim() || undefined,
      forcePathStyle: forcePathStyle || false,
    };

    // Validate configuration format
    const validation = validateS3Config(s3Config);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Configuration validation failed: ${validation.errors.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Save configuration (includes connection test)
    const result = await S3ConfigService.saveS3Config(user._id, s3Config);
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error saving S3 configuration:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/s3-config
 * Delete user's S3 configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const result = await S3ConfigService.deleteS3Config(user._id);
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error deleting S3 configuration:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
