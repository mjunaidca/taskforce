/**
 * Validation Utility Functions
 * Input validation for organization forms
 */

/**
 * Validate email format (RFC 5322 simplified)
 *
 * @param email - Email address to validate
 * @returns true if valid email format
 *
 * @example
 * validateEmail("user@example.com") // true
 * validateEmail("invalid.email") // false
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate organization name
 *
 * @param name - Organization name
 * @returns Error message if invalid, null if valid
 */
export function validateOrgName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Organization name is required";
  }
  if (name.length < 2) {
    return "Organization name must be at least 2 characters";
  }
  if (name.length > 100) {
    return "Organization name must be less than 100 characters";
  }
  return null;
}

/**
 * Sanitize slug to URL-safe format
 * Same as slugify but as validation helper
 *
 * @param input - Raw slug input
 * @returns Sanitized slug
 */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Validate image file for upload
 *
 * @param file - File object
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File): string | null {
  // Check file type
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return "Only PNG, JPG, and GIF images are allowed";
  }

  // Check file size (2MB limit)
  const maxSize = 2 * 1024 * 1024; // 2MB in bytes
  if (file.size > maxSize) {
    return "Image must be less than 2MB";
  }

  return null;
}

/**
 * Validate slug format
 *
 * @param slug - Slug to validate
 * @returns Error message if invalid, null if valid
 */
export function validateSlug(slug: string): string | null {
  if (!slug || slug.trim().length === 0) {
    return "Slug is required";
  }
  if (slug.length < 2) {
    return "Slug must be at least 2 characters";
  }
  if (slug.length > 50) {
    return "Slug must be less than 50 characters";
  }
  // Must be lowercase alphanumeric with hyphens only
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return "Slug must contain only lowercase letters, numbers, and hyphens";
  }
  return null;
}

/**
 * Convert file to base64 string (for database storage)
 *
 * @param file - File object
 * @returns Promise resolving to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
