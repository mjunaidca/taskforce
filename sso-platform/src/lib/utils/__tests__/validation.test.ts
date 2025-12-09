import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validateOrgName,
  sanitizeSlug,
  validateImageFile,
  validateSlug,
} from "../validation";

describe("validation utilities", () => {
  describe("validateEmail", () => {
    it("accepts valid email addresses", () => {
      expect(validateEmail("user@example.com")).toBe(true);
      expect(validateEmail("test.user@domain.co.uk")).toBe(true);
      expect(validateEmail("name+tag@company.org")).toBe(true);
    });

    it("rejects invalid email addresses", () => {
      expect(validateEmail("invalid.email")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
      expect(validateEmail("user @example.com")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("validateOrgName", () => {
    it("accepts valid organization names", () => {
      expect(validateOrgName("AI Lab")).toBeNull();
      expect(validateOrgName("Panaversity 2024")).toBeNull();
      expect(validateOrgName("Company Inc.")).toBeNull();
    });

    it("rejects empty names", () => {
      expect(validateOrgName("")).toBe("Organization name is required");
      expect(validateOrgName("  ")).toBe("Organization name is required");
    });

    it("rejects names shorter than 2 characters", () => {
      expect(validateOrgName("A")).toBe(
        "Organization name must be at least 2 characters"
      );
    });

    it("rejects names longer than 100 characters", () => {
      const longName = "A".repeat(101);
      expect(validateOrgName(longName)).toBe(
        "Organization name must be less than 100 characters"
      );
    });
  });

  describe("sanitizeSlug", () => {
    it("sanitizes strings to URL-safe slugs", () => {
      expect(sanitizeSlug("AI Lab")).toBe("ai-lab");
      expect(sanitizeSlug("Test@Org#123")).toBe("test-org-123");
      expect(sanitizeSlug("  spaces  ")).toBe("spaces");
    });

    it("collapses multiple hyphens", () => {
      expect(sanitizeSlug("test---org")).toBe("test-org");
    });

    it("removes leading and trailing hyphens", () => {
      expect(sanitizeSlug("-test-")).toBe("test");
    });
  });

  describe("validateSlug", () => {
    it("accepts valid slugs", () => {
      expect(validateSlug("ai-lab")).toBeNull();
      expect(validateSlug("test-123")).toBeNull();
      expect(validateSlug("organization")).toBeNull();
    });

    it("rejects empty slugs", () => {
      expect(validateSlug("")).toBe("Slug is required");
      expect(validateSlug("  ")).toBe("Slug is required");
    });

    it("rejects slugs shorter than 2 characters", () => {
      expect(validateSlug("a")).toBe("Slug must be at least 2 characters");
    });

    it("rejects slugs longer than 50 characters", () => {
      const longSlug = "a".repeat(51);
      expect(validateSlug(longSlug)).toBe("Slug must be less than 50 characters");
    });

    it("rejects slugs with uppercase letters", () => {
      expect(validateSlug("AI-Lab")).toBe(
        "Slug must contain only lowercase letters, numbers, and hyphens"
      );
    });

    it("rejects slugs with special characters", () => {
      expect(validateSlug("test_org")).toBe(
        "Slug must contain only lowercase letters, numbers, and hyphens"
      );
      expect(validateSlug("test@org")).toBe(
        "Slug must contain only lowercase letters, numbers, and hyphens"
      );
    });
  });

  describe("validateImageFile", () => {
    it("accepts valid image files", () => {
      const pngFile = new File(["content"], "test.png", { type: "image/png" });
      expect(validateImageFile(pngFile)).toBeNull();

      const jpgFile = new File(["content"], "test.jpg", { type: "image/jpeg" });
      expect(validateImageFile(jpgFile)).toBeNull();

      const gifFile = new File(["content"], "test.gif", { type: "image/gif" });
      expect(validateImageFile(gifFile)).toBeNull();
    });

    it("rejects non-image files", () => {
      const pdfFile = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });
      expect(validateImageFile(pdfFile)).toBe(
        "Only PNG, JPG, and GIF images are allowed"
      );
    });

    it("rejects files larger than 2MB", () => {
      // Create a 3MB file
      const largeContent = new Array(3 * 1024 * 1024).fill("a").join("");
      const largeFile = new File([largeContent], "large.png", {
        type: "image/png",
      });
      expect(validateImageFile(largeFile)).toBe("Image must be less than 2MB");
    });

    it("accepts files smaller than 2MB", () => {
      // Create a 1MB file
      const content = new Array(1024 * 1024).fill("a").join("");
      const file = new File([content], "small.png", { type: "image/png" });
      expect(validateImageFile(file)).toBeNull();
    });
  });
});
