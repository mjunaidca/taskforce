"use client";

/**
 * Context Badge Component for ChatKit
 *
 * Displays the current project context in the chat header.
 * Allows clearing context to switch to "All Projects" scope.
 */

import React from "react";
import styles from "./styles.module.css";

interface ContextBadgeProps {
  projectId?: number;
  projectName?: string;
  onClearContext?: () => void;
}

export function ContextBadge({
  projectId,
  projectName,
  onClearContext,
}: ContextBadgeProps): React.ReactElement {
  const hasContext = projectId !== undefined;
  const isLoading = hasContext && !projectName;
  const displayName = projectName || (hasContext ? `Project #${projectId}` : "All Projects");

  return (
    <div className={`${styles.contextBadge} ${isLoading ? styles.contextBadgeLoading : ""}`}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.contextIcon}
      >
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <span className={styles.contextLabel}>
        {hasContext ? `Project: ${displayName}` : "All Projects"}
      </span>
      {hasContext && onClearContext && (
        <button
          className={styles.contextClearButton}
          onClick={onClearContext}
          aria-label="Clear project context"
          title="Clear project context"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
