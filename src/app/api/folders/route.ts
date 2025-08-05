import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import { FileService } from '@/services/fileService';

/**
 * POST /api/folders
 * Create a new folder
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
    const { name, parentId, color, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Folder name is required' },
        { status: 400 }
      );
    }

    // Validate folder name
    const trimmedName = name.trim();
    if (trimmedName.length > 255) {
      return NextResponse.json(
        { success: false, message: 'Folder name must be less than 255 characters' },
        { status: 400 }
      );
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      return NextResponse.json(
        { success: false, message: 'Folder name contains invalid characters' },
        { status: 400 }
      );
    }

    // Validate color if provided
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json(
        { success: false, message: 'Invalid color format. Use hex format (#RRGGBB)' },
        { status: 400 }
      );
    }

    const result = await FileService.createFolder(user._id, {
      name: trimmedName,
      parentId: parentId || undefined,
      color: color || undefined,
      description: description || undefined,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        folder: result.folder,
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Folder creation API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/folders?parentId=xxx
 * Get folder contents (files and subfolders)
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

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');

    const contents = await FileService.getFolderContents(
      user._id,
      parentId || undefined
    );

    return NextResponse.json({
      success: true,
      data: contents,
    });
  } catch (error) {
    console.error('Folder contents API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
