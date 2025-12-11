"use client";

import type { SoftwareBackground } from "@/types/profile";

interface BackgroundSelectProps {
  value: SoftwareBackground;
  onChange: (value: SoftwareBackground) => void;
  error?: string;
}

// Repurposed: Software Background → Primary Role
// Maps to existing DB field without schema changes:
// beginner → individual, intermediate → team_member, advanced → leader
const backgrounds: { value: SoftwareBackground; label: string; description: string }[] = [
  {
    value: "beginner",
    label: "Individual",
    description: "Working independently on projects",
  },
  {
    value: "intermediate",
    label: "Team Member",
    description: "Collaborating with a team",
  },
  {
    value: "advanced",
    label: "Team Lead",
    description: "Managing projects or teams",
  },
];

export function BackgroundSelect({ value, onChange, error }: BackgroundSelectProps) {
  return (
    <div className="space-y-3">
      <label className="block mt-6 px-4 py-3 bg-primary/10 border-l-4 border-primary rounded-r-lg text-sm font-bold text-foreground">
        What best describes your role?
      </label>
      <div className="grid grid-cols-3 gap-3">
        {backgrounds.map((bg) => (
          <button
            key={bg.value}
            type="button"
            onClick={() => onChange(bg.value)}
            className={`group relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 text-left ${
              value === bg.value
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border hover:border-primary/50 hover:bg-muted/50 bg-card"
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                value === bg.value
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/50 group-hover:border-primary/70"
              }`}>
                {value === bg.value && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground animate-scale-in" />
                )}
              </div>
              <span className={`block text-sm font-semibold transition-colors ${
                value === bg.value ? "text-primary" : "text-foreground"
              }`}>
                {bg.label}
              </span>
              <span className={`block text-xs transition-colors leading-tight ${
                value === bg.value ? "text-primary/80" : "text-muted-foreground"
              }`}>
                {bg.description}
              </span>
            </div>
            {value === bg.value && (
              <div className="absolute top-2 right-2">
                <svg className="w-4 h-4 text-primary animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-sm text-destructive animate-fade-in">{error}</p>
      )}
    </div>
  );
}
