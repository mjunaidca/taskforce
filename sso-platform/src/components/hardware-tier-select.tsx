"use client";

import type { HardwareTier } from "@/types/profile";

interface HardwareTierSelectProps {
  value: HardwareTier | "";
  onChange: (value: HardwareTier) => void;
  error?: string;
}

// Repurposed: Hardware Tier → Primary Use Case
// Maps to existing DB field without schema changes:
// tier1 → personal, tier2 → work, tier3 → both, tier4 → exploring
const hardwareTiers: { value: HardwareTier; label: string; shortLabel: string; description: string }[] = [
  {
    value: "tier1",
    label: "Personal Projects",
    shortLabel: "Personal",
    description: "Side projects & learning",
  },
  {
    value: "tier2",
    label: "Work / Business",
    shortLabel: "Work",
    description: "Professional use",
  },
  {
    value: "tier3",
    label: "Both",
    shortLabel: "Both",
    description: "Personal and work",
  },
  {
    value: "tier4",
    label: "Just Exploring",
    shortLabel: "Exploring",
    description: "Checking things out",
  },
];

export function HardwareTierSelect({ value, onChange, error }: HardwareTierSelectProps) {
  return (
    <div className="space-y-3">
      <label className="block mt-6 px-4 py-3 bg-primary/10 border-l-4 border-primary rounded-r-lg text-sm font-bold text-foreground">
        How do you plan to use Taskflow?
      </label>
      <div className="grid grid-cols-2 gap-3">
        {hardwareTiers.map((tier) => (
          <button
            key={tier.value}
            type="button"
            onClick={() => onChange(tier.value)}
            className={`group relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 text-left ${
              value === tier.value
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border hover:border-primary/50 hover:bg-muted/50 bg-card"
            }`}
          >
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  value === tier.value
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/50 group-hover:border-primary/70"
                }`}>
                  {value === tier.value && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground animate-scale-in" />
                  )}
                </div>
                {value === tier.value && (
                  <svg className="w-4 h-4 text-primary animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`block text-sm font-semibold transition-colors ${
                value === tier.value ? "text-primary" : "text-foreground"
              }`}>
                {tier.shortLabel}
              </span>
              <span className={`block text-xs transition-colors leading-tight ${
                value === tier.value ? "text-primary/80" : "text-muted-foreground"
              }`}>
                {tier.description}
              </span>
            </div>
          </button>
        ))}
      </div>
      {error && (
        <p className="text-sm text-destructive animate-fade-in">{error}</p>
      )}
    </div>
  );
}
