import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/auth/middleware/adminMiddleware";
import connectDB from "@/utils/database";
import User from "@/auth/models/User";
import ActivityLog from "@/models/ActivityLog";
import FileMetadata from "@/models/FileMetadata";
import { logger } from "@/utils/logger";

const MODEL_MAP = {
  User,
  ActivityLog,
  FileMetadata,
};

/**
 * GET /api/admin/schema/[model]
 * Get current schema for a model
 */
export const GET = requireAdmin(
  async (
    _request: NextRequest,
    context: { params: Promise<{ model: string }> }
  ) => {
    try {
      await connectDB();

      const { model } = await context.params;
      const ModelClass = MODEL_MAP[model as keyof typeof MODEL_MAP];

      if (!ModelClass) {
        return NextResponse.json(
          { success: false, message: "Model not found" },
          { status: 404 }
        );
      }

      const schema = ModelClass.schema;
      const paths = schema.paths;

      const fields = Object.keys(paths)
        .filter((path) => !path.startsWith("_") && path !== "__v")
        .map((path) => {
          const schemaType = paths[path];
          return {
            name: path,
            type: getSchemaType(schemaType),
            required: schemaType.isRequired || false,
            unique: schemaType.options?.unique || false,
            index: schemaType.options?.index || false,
            default: schemaType.options?.default,
            description: schemaType.options?.description || "",
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
      logger.error("Schema GET error:", error);
      return NextResponse.json(
        { success: false, message: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

/**
 * PUT /api/admin/schema/[model]
 * Update schema for a model (WARNING: This is a dangerous operation)
 */
export const PUT = requireAdmin(
  async (
    request: NextRequest,
    context: { params: Promise<{ model: string }> }
  ) => {
    try {
      await connectDB();

      const { model } = await context.params;
      const body = await request.json();
      // Note: fields and timestamps would be used in a real implementation
      logger.info("Schema update request received:", body);

      // Validate model exists
      const ModelClass = MODEL_MAP[model as keyof typeof MODEL_MAP];
      if (!ModelClass) {
        return NextResponse.json(
          { success: false, message: "Model not found" },
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
        message:
          "Schema updates require manual migration and application restart. This feature is for viewing schemas only.",
        warning:
          "Direct schema modification is not supported in this demo. In production, this would require careful migration planning.",
      });
    } catch (error) {
      logger.error("Schema PUT error:", error);
      return NextResponse.json(
        { success: false, message: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

/**
 * Helper function to determine schema type from Mongoose schema type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSchemaType(schemaType: any): string {
  if (schemaType.instance) {
    switch (schemaType.instance) {
      case "String":
        return "String";
      case "Number":
        return "Number";
      case "Boolean":
        return "Boolean";
      case "Date":
        return "Date";
      case "ObjectID":
        return "ObjectId";
      case "Array":
        return "Array";
      case "Mixed":
        return "Mixed";
      default:
        return "Mixed";
    }
  }

  if (schemaType.schema) {
    return "Object";
  }

  return "Mixed";
}
