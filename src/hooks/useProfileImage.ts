import { useState, useEffect, useCallback } from "react";
import {
  isPresignedUrlExpired,
  refreshProfileImageUrl,
} from "@/utils/imageUtils";
import { logger } from "@/utils/logger";

/**
 * Custom hook for managing profile images with automatic URL refresh
 * @param initialImageUrl - The initial profile image URL
 * @param updateUserProfile - Function to update user profile (optional)
 * @returns Object containing imageUrl, isRefreshing, and error handler
 */
export function useProfileImage(
  initialImageUrl: string | null,
  updateUserProfile?: (updates: { image: string }) => void
) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshAttempts, setRefreshAttempts] = useState(0);

  useEffect(() => {
    setImageUrl(initialImageUrl);
  }, [initialImageUrl]);

  const handleImageError = useCallback(async () => {
    if (isRefreshing || refreshAttempts >= 3) {
      logger.info(
        "Maximum image refresh attempts reached or already refreshing"
      );
      return;
    }

    const currentImageUrl = imageUrl;
    if (!currentImageUrl || !currentImageUrl.startsWith("http")) {
      return;
    }

    if (!isPresignedUrlExpired(currentImageUrl)) {
      return;
    }

    logger.info(
      "Detected potentially expired profile image URL, attempting refresh..."
    );
    setIsRefreshing(true);

    try {
      const newImageUrl = await refreshProfileImageUrl();

      if (newImageUrl && newImageUrl !== currentImageUrl) {
        logger.info("Successfully refreshed profile image URL");
        setImageUrl(newImageUrl);
        updateUserProfile?.({ image: newImageUrl });
        setRefreshAttempts((prev) => prev + 1);
      } else {
        logger.info("Failed to refresh profile image URL");
      }
    } catch (error) {
      logger.info("Error refreshing profile image:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [imageUrl, isRefreshing, refreshAttempts, updateUserProfile]);

  useEffect(() => {
    if (!imageUrl || !imageUrl.startsWith("http")) {
      return;
    }

    if (isPresignedUrlExpired(imageUrl)) {
      handleImageError();
    }

    const intervalId = setInterval(() => {
      if (isPresignedUrlExpired(imageUrl)) {
        handleImageError();
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [imageUrl, handleImageError]);

  return {
    imageUrl,
    isRefreshing,
    handleImageError,
    refreshAttempts,
  };
}
