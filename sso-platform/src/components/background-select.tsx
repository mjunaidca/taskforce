"use client";

import type { SoftwareBackground } from "@/types/profile";

interface BackgroundSelectProps {
  value: SoftwareBackground;
  onChange: (value: SoftwareBackground) => void;
  error?: string;
}

const backgrounds: { value: SoftwareBackground; label: string; description: string }[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "New to programming or robotics",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Some experience with Python or similar languages",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Professional developer or robotics engineer",
  },
];

export function BackgroundSelect({ value, onChange, error }: BackgroundSelectProps) {
  return (
    <div className="space-y-3">
      <label className="block mt-6 px-4 py-3 bg-primary/10 border-l-4 border-primary rounded-r-lg text-sm font-bold text-foreground">
        What&apos;s your software background?
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
