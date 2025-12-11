"use client";

/**
 * Progress Indicator Component for ChatKit Streaming UI
 *
 * Shows a loading indicator with customizable message during
 * AI response streaming. Locks action buttons when visible.
 */

import React from "react";
import styles from "./styles.module.css";

interface ProgressIndicatorProps {
  message?: string;
  isVisible: boolean;
}

export function ProgressIndicator({
  message = "Thinking...",
  isVisible,
}: ProgressIndicatorProps): React.ReactElement | null {
  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.progressIndicator}>
      <div className={styles.progressSpinner}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.spinnerIcon}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
      <span className={styles.progressMessage}>{message}</span>
    </div>
  );
}
