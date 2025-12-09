import { describe, it, expect } from "vitest";
import {
  slugify,
  validateSlug,
  formatMemberCount,
  getRoleDisplay,
  canManageOrganization,
  canDeleteOrganization,
  getOrgInitials,
  getDaysUntilExpiry,
  isInvitationExpired,
} from "../organization";

describe("organization utilities", () => {
  describe("slugify", () => {
    it("converts to lowercase", () => {
      expect(slugify("AI Lab")).toBe("ai-lab");
      expect(slugify("UPPERCASE")).toBe("uppercase");
    });

    it("replaces spaces with hyphens", () => {
      expect(slugify("multiple word slug")).toBe("multiple-word-slug");
    });

    it("removes special characters", () => {
      expect(slugify("Lab@123!")).toBe("lab-123");
      expect(slugify("test#$%org")).toBe("test-org");
    });

    it("collapses multiple hyphens", () => {
      expect(slugify("test---org")).toBe("test-org");
      expect(slugify("test--org")).toBe("test-org");
    });

    it("removes leading and trailing hyphens", () => {
      expect(slugify("-test-")).toBe("test");
      expect(slugify("--test--org--")).toBe("test-org");
    });

    it("handles empty input", () => {
      expect(slugify("")).toBe("");
    });

    it("trims whitespace", () => {
      expect(slugify("  test org  ")).toBe("test-org");
    });
  });

  describe("validateSlug", () => {
    it("accepts valid slugs", () => {
      expect(validateSlug("ai-lab")).toBe(true);
      expect(validateSlug("test123")).toBe(true);
      expect(validateSlug("org-123-test")).toBe(true);
    });

    it("rejects uppercase letters", () => {
      expect(validateSlug("AI-Lab")).toBe(false);
      expect(validateSlug("Test")).toBe(false);
    });

    it("rejects special characters", () => {
      expect(validateSlug("test_org")).toBe(false);
      expect(validateSlug("test@org")).toBe(false);
      expect(validateSlug("test org")).toBe(false);
    });

    it("rejects slugs shorter than 2 characters", () => {
      expect(validateSlug("a")).toBe(false);
      expect(validateSlug("")).toBe(false);
    });

    it("rejects slugs longer than 50 characters", () => {
      expect(validateSlug("a".repeat(51))).toBe(false);
    });

    it("accepts slugs between 2-50 characters", () => {
      expect(validateSlug("ab")).toBe(true);
      expect(validateSlug("a".repeat(50))).toBe(true);
    });
  });

  describe("formatMemberCount", () => {
    it("formats singular correctly", () => {
      expect(formatMemberCount(1)).toBe("1 member");
    });

    it("formats plural correctly", () => {
      expect(formatMemberCount(0)).toBe("0 members");
      expect(formatMemberCount(2)).toBe("2 members");
      expect(formatMemberCount(5)).toBe("5 members");
    });

    it("formats large numbers with commas", () => {
      expect(formatMemberCount(1234)).toBe("1,234 members");
      expect(formatMemberCount(1000000)).toBe("1,000,000 members");
    });
  });

  describe("getRoleDisplay", () => {
    it("returns correct display for owner", () => {
      const result = getRoleDisplay("owner");
      expect(result.label).toBe("Owner");
      expect(result.variant).toBe("default");
    });

    it("returns correct display for admin", () => {
      const result = getRoleDisplay("admin");
      expect(result.label).toBe("Admin");
      expect(result.variant).toBe("secondary");
    });

    it("returns correct display for member", () => {
      const result = getRoleDisplay("member");
      expect(result.label).toBe("Member");
      expect(result.variant).toBe("outline");
    });
  });

  describe("canManageOrganization", () => {
    it("returns true for owner", () => {
      expect(canManageOrganization("owner")).toBe(true);
    });

    it("returns true for admin", () => {
      expect(canManageOrganization("admin")).toBe(true);
    });

    it("returns false for member", () => {
      expect(canManageOrganization("member")).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(canManageOrganization(null)).toBe(false);
      expect(canManageOrganization(undefined)).toBe(false);
    });
  });

  describe("canDeleteOrganization", () => {
    it("returns true for owner only", () => {
      expect(canDeleteOrganization("owner")).toBe(true);
    });

    it("returns false for admin", () => {
      expect(canDeleteOrganization("admin")).toBe(false);
    });

    it("returns false for member", () => {
      expect(canDeleteOrganization("member")).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(canDeleteOrganization(null)).toBe(false);
      expect(canDeleteOrganization(undefined)).toBe(false);
    });
  });

  describe("getOrgInitials", () => {
    it("gets initials from two words", () => {
      expect(getOrgInitials("AI Lab")).toBe("AL");
      expect(getOrgInitials("Test Organization")).toBe("TO");
    });

    it("gets initials from single word", () => {
      expect(getOrgInitials("Panaversity")).toBe("P");
    });

    it("gets initials from multiple words (max 2)", () => {
      expect(getOrgInitials("The AI Lab Company")).toBe("TA");
    });

    it("handles empty strings", () => {
      expect(getOrgInitials("")).toBe("");
    });

    it("converts to uppercase", () => {
      expect(getOrgInitials("ai lab")).toBe("AL");
    });
  });

  describe("getDaysUntilExpiry", () => {
    it("returns positive days for future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      expect(getDaysUntilExpiry(futureDate)).toBeGreaterThanOrEqual(4);
    });

    it("returns negative days for past dates", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      expect(getDaysUntilExpiry(pastDate)).toBeLessThan(0);
    });

    it("returns 0 for dates within 24 hours", () => {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 12);
      expect(getDaysUntilExpiry(tomorrow)).toBe(0);
    });
  });

  describe("isInvitationExpired", () => {
    it("returns true for past dates", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(isInvitationExpired(pastDate)).toBe(true);
    });

    it("returns false for future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isInvitationExpired(futureDate)).toBe(false);
    });
  });
});
