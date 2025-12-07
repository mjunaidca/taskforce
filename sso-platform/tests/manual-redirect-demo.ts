/**
 * Manual Test Demonstration: Profile Redirect Flow
 * 
 * This script demonstrates the redirect flow when a user comes from an external app
 * (like RoboLearn or AI Native) and updates their profile.
 */

import { isValidRedirectUrl, getTrustedOrigins } from "../src/lib/redirect-utils";

console.log("=".repeat(80));
console.log("Profile Redirect Flow - Manual Test Demonstration");
console.log("=".repeat(80));
console.log();

// Mock window.location for testing
(global as any).window = {
  location: {
    origin: "http://localhost:3001"
  }
};

// Display trusted origins
console.log("📋 Trusted Origins (from TRUSTED_CLIENTS):");
const origins = getTrustedOrigins();
origins.forEach((origin, index) => {
  console.log(`   ${index + 1}. ${origin}`);
});
console.log();

// Simulate real-world scenarios
console.log("🧪 Testing Real-World Scenarios:");
console.log("-".repeat(80));

const scenarios = [
  {
    name: "User comes from RoboLearn",
    redirectUrl: "https://mjunaidca.github.io/robolearn",
    expected: true,
    description: "User was reading RoboLearn book, clicked profile link"
  },
  {
    name: "User comes from RoboLearn with deep link",
    redirectUrl: "https://mjunaidca.github.io/robolearn/chapter/3/lesson/5",
    expected: true,
    description: "User was on specific lesson, clicked profile link"
  },
  {
    name: "User comes from AI Native dashboard",
    redirectUrl: "https://ai-native.taskflow.org/dashboard",
    expected: true,
    description: "User was on AI Native dashboard, clicked profile link"
  },
  {
    name: "User comes from local development",
    redirectUrl: "http://localhost:3000/app",
    expected: true,
    description: "Developer testing locally"
  },
  {
    name: "Malicious redirect attempt",
    redirectUrl: "https://evil-phishing-site.com/steal-data",
    expected: false,
    description: "Attacker tries to redirect to malicious site"
  },
  {
    name: "Profile page internal navigation",
    redirectUrl: "/account/settings",
    expected: true,
    description: "Internal navigation within SSO"
  },
  // OAuth callback URL blocking (prevents PKCE errors)
  {
    name: "OAuth callback URL (BLOCKED - prevents PKCE error)",
    redirectUrl: "https://mjunaidca.github.io/robolearn/auth/callback",
    expected: false,
    description: "OAuth callback URLs must not be used as profile redirects"
  },
  {
    name: "OAuth callback URL with localhost",
    redirectUrl: "http://localhost:3000/auth/callback",
    expected: false,
    description: "Localhost OAuth callbacks also blocked"
  }
];

scenarios.forEach((scenario, index) => {
  console.log();
  console.log(`Scenario ${index + 1}: ${scenario.name}`);
  console.log(`Description: ${scenario.description}`);
  console.log(`Redirect URL: ${scenario.redirectUrl}`);

  const isValid = isValidRedirectUrl(scenario.redirectUrl);
  const result = isValid === scenario.expected ? "✅ PASS" : "❌ FAIL";

  console.log(`Expected: ${scenario.expected ? "ALLOW" : "BLOCK"}`);
  console.log(`Actual: ${isValid ? "ALLOW" : "BLOCK"}`);
  console.log(`Result: ${result}`);

  if (isValid === scenario.expected) {
    if (isValid) {
      console.log(`🔓 User will be redirected to: ${scenario.redirectUrl}`);
    } else {
      console.log(`🔒 Redirect blocked for security - user stays on profile page`);
    }
  }
});

console.log();
console.log("=".repeat(80));
console.log("✅ Demonstration Complete!");
console.log();
console.log("Summary:");
console.log("  • Users from trusted apps (RoboLearn, AI Native) can return to their app");
console.log("  • Security is maintained by blocking untrusted redirect URLs");
console.log("  • OAuth callback URLs (/auth/callback) are BLOCKED to prevent PKCE errors");
console.log("  • Internal navigation continues to work as expected");
console.log();
console.log("IMPORTANT: Client apps should use non-callback URLs for profile redirects!");
console.log("  ✓ Good: https://example.com/settings (after profile update)");
console.log("  ✗ Bad:  https://example.com/auth/callback (causes PKCE error)");
console.log("=".repeat(80));
