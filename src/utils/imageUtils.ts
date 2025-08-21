/**
 * Utility functions for handling profile images and URL management
 */

/**
 * Check if a presigned URL is expired or likely to be expired
 * @param url - The presigned URL to check
 * @param bufferMinutes - Buffer time in minutes before actual expiration (default: 60 minutes)
 * @returns true if expired or about to expire
 */
export function isPresignedUrlExpired(
  url: string,
  bufferMinutes: number = 60
): boolean {
  try {
    if (!url || !url.includes("X-Amz-Algorithm")) {
      return false;
    }

    const urlObj = new URL(url);
    const expiresParam = urlObj.searchParams.get("X-Amz-Expires");
    const dateParam = urlObj.searchParams.get("X-Amz-Date");

    if (!expiresParam || !dateParam) {
      return false;
    }

    // Parse the date when the URL was created
    // Format: YYYYMMDDTHHMMSSZ (ISO 8601 without separators)
    const dateMatch = dateParam.match(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/
    );
    if (!dateMatch) {
      return false;
    }

    const [, year, month, day, hour, minute, second] = dateMatch;
    const createdDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );

    const expiresSeconds = parseInt(expiresParam);
    const expirationDate = new Date(
      createdDate.getTime() + expiresSeconds * 1000
    );

    const bufferTime = new Date(
      expirationDate.getTime() - bufferMinutes * 60 * 1000
    );

    return new Date() >= bufferTime;
  } catch (error) {
    console.error("Error checking presigned URL expiration:", error);
    return false;
  }
}

/**
 * Check if an image URL is accessible by attempting to load it
 * @param url - The image URL to check
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns Promise<boolean> - true if image loads successfully
 */
export function checkImageAccessibility(
  url: string,
  timeout: number = 5000
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }

    const img = new Image();

    const timeoutId = setTimeout(() => {
      img.src = "";
      resolve(false);
    }, timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(false);
    };

    img.src = url;
  });
}

/**
 * Extract S3 key from a presigned URL
 * @param url - The presigned URL
 * @returns The S3 key or null if extraction fails
 */
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    if (!url.includes("X-Amz-Algorithm")) {
      return null;
    }

    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");

    const profileImagesIndex = pathParts.findIndex(
      (part) => part === "profile-images"
    );
    if (profileImagesIndex !== -1) {
      return pathParts.slice(profileImagesIndex).join("/");
    }

    return null;
  } catch (error) {
    console.error("Error extracting S3 key from URL:", error);
    return null;
  }
}

/**
 * Refresh a profile image URL using the API
 * @returns Promise with new image URL or null if failed
 */
export async function refreshProfileImageUrl(): Promise<string | null> {
  try {
    const response = await fetch("/api/user/profile/image/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success && data.user?.image) {
      return data.user.image;
    }

    return null;
  } catch (error) {
    console.error("Error refreshing profile image URL:", error);
    return null;
  }
}
