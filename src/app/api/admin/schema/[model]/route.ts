import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/auth/middleware/adminMiddleware';
import { connectDB } from '@/lib/mongodb';
import User from '@/auth/models/User';
import File from '@/models/File';
import Folder from '@/models/Folder';
import Admin from '@/auth/models/Admin';

// Model mapping
const MODEL_MAP = {
  User,
  File,
  Folder,
  Admin,
};

/**
 * GET /api/admin/schema/[model]
 * Get current schema for a model
 */
export const GET = requireAdmin(async (
  request: NextRequest,
  { params }: { params: { model: string } }
) => {
  try {
    await connectDB();

    const { model } = params;
    const ModelClass = MODEL_MAP[model as keyof typeof MODEL_MAP];

    if (!ModelClass) {
      return NextResponse.json(
        { success: false, message: 'Model not found' },
        { status: 404 }
      );
    }

    // Get the schema from the model
    const schema = ModelClass.schema;
    const paths = schema.paths;
    
    const fields = Object.keys(paths)
      .filter(path => !path.startsWith('_') && path !== '__v')
      .map(path => {
        const schemaType = paths[path];
        return {
          name: path,
          type: getSchemaType(schemaType),
          required: schemaType.isRequired || false,
          unique: schemaType.options?.unique || false,
          index: schemaType.options?.index || false,
          default: schemaType.options?.default,
          description: schemaType.options?.description || '',
        };
      });

    const modelSchema = {
      modelName: model,
      fields,
      timestamps: schema.options?.timestamps || false,
    };

    return NextResponse.json({
      success: true,
      schema: modelSchema,
    });
  } catch (error) {
    console.error('Schema GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/schema/[model]
 * Update schema for a model (WARNING: This is a dangerous operation)
 */
export const PUT = requireAdmin(async (
  request: NextRequest,
  { params }: { params: { model: string } }
) => {
  try {
    await connectDB();

    const { model } = params;
    const body = await request.json();
    const { fields, timestamps } = body;

    // Validate model exists
    const ModelClass = MODEL_MAP[model as keyof typeof MODEL_MAP];
    if (!ModelClass) {
      return NextResponse.json(
        { success: false, message: 'Model not found' },
        { status: 404 }
      );
    }

    // For now, we'll return a warning that this is a dangerous operation
    // In a real implementation, you would need to:
    // 1. Create database migrations
    // 2. Handle data transformation
    // 3. Update model files
    // 4. Restart the application

    return NextResponse.json({
      success: false,
      message: 'Schema updates require manual migration and application restart. This feature is for viewing schemas only.',
      warning: 'Direct schema modification is not supported in this demo. In production, this would require careful migration planning.',
    });

  } catch (error) {
    console.error('Schema PUT error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * Helper function to determine schema type from Mongoose schema type
 */
function getSchemaType(schemaType: any): string {
  if (schemaType.instance) {
    switch (schemaType.instance) {
      case 'String':
        return 'String';
      case 'Number':
        return 'Number';
      case 'Boolean':
        return 'Boolean';
      case 'Date':
        return 'Date';
      case 'ObjectID':
        return 'ObjectId';
      case 'Array':
        return 'Array';
      case 'Mixed':
        return 'Mixed';
      default:
        return 'Mixed';
    }
  }
  
  // Handle nested schemas and special cases
  if (schemaType.schema) {
    return 'Object';
  }
  
  return 'Mixed';
}
