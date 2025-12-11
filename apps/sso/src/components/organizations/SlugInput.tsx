"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeSlug, validateSlug } from "@/lib/utils/validation";

interface SlugInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
  error?: string;
  autoGenerateFrom?: string;
  checkAvailability?: (slug: string) => Promise<boolean>;
}

/**
 * Slug Input Component with Auto-Sanitization
 * Automatically sanitizes input to URL-safe format
 * Optionally checks slug availability in real-time
 */
export function SlugInput({
  value,
  onChange,
  label = "Organization Slug",
  helperText = "URL-friendly identifier (lowercase, alphanumeric, hyphens only)",
  error,
  autoGenerateFrom,
  checkAvailability,
}: SlugInputProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    message: string;
  } | null>(null);

  // Auto-generate slug from source (e.g., organization name)
  useEffect(() => {
    if (autoGenerateFrom && !value) {
      const sanitized = sanitizeSlug(autoGenerateFrom);
      if (sanitized) {
        onChange(sanitized);
      }
    }
  }, [autoGenerateFrom, value, onChange]);

  // Check slug availability (debounced)
  useEffect(() => {
    if (!checkAvailability || !value || !validateSlug(value)) {
      setAvailability(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsChecking(true);
      try {
        const available = await checkAvailability(value);
        setAvailability({
          available,
          message: available
            ? "Slug is available"
            : "Slug is already taken, please choose another",
        });
      } catch (err) {
        setAvailability({
          available: false,
          message: "Error checking availability",
        });
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value, checkAvailability]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeSlug(e.target.value);
    onChange(sanitized);
  };

  const displayError = error || (availability && !availability.available ? availability.message : null);
  const displaySuccess = availability && availability.available ? availability.message : null;

  return (
    <div className="space-y-2">
      <Label htmlFor="slug">{label}</Label>
      <div className="relative">
        <Input
          id="slug"
          value={value}
          onChange={handleChange}
          className={`pr-10 ${displayError ? "border-red-500" : ""} ${displaySuccess ? "border-green-500" : ""}`}
          placeholder="ai-lab"
        />
        {isChecking && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-taskflow-500 border-t-transparent" />
          </div>
        )}
        {!isChecking && availability && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {availability.available ? (
              <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        )}
      </div>
      {helperText && !displayError && !displaySuccess && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
      {displayError && <p className="text-xs text-red-500">{displayError}</p>}
      {displaySuccess && <p className="text-xs text-green-500">{displaySuccess}</p>}
    </div>
  );
}
