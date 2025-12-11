/**
 * Notification types for TaskFlow frontend
 */

export interface Notification {
  id: number;
  user_id: string;
  user_type: "human" | "agent";
  type: "task_assigned" | "task_completed" | "task_spawned" | "task_reminder";
  title: string;
  body: string;
  task_id: number | null;
  project_id: number | null;
  read: boolean;
  created_at: string;
}

export interface NotificationUnreadCount {
  count: number;
}

export interface NotificationUpdate {
  read: boolean;
}

export interface MarkAllReadResponse {
  updated: number;
}
