// JWT Claims from SSO
export interface JWTClaims {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  role: "user" | "admin";
  tenant_id: string;
  organization_ids: string[];
  organization_names: string[];
  iat: number;
  exp: number;
  iss: string;
}

// Auth State
export interface AuthState {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_at: number;
  user: JWTClaims | null;
}

// Project Types
export interface ProjectRead {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_default: boolean;
  member_count: number;
  task_count: number;
  created_at: string;
  updated_at: string;
  is_shared?: boolean;
}

export interface ProjectCreate {
  slug: string;
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
}

// Member Types
export interface MemberRead {
  id: number;
  worker_id: number;
  handle: string;
  name: string;
  type: "human" | "agent";
  role: "owner" | "member";
  joined_at: string;
}

export interface MemberCreate {
  user_id?: string;
  agent_id?: number;
}

// Worker Types
export interface WorkerRead {
  id: number;
  handle: string;
  name: string;
  type: "human" | "agent";
  agent_type: "claude" | "qwen" | "gemini" | "custom" | null;
  capabilities: string[];
  status?: "online" | "offline" | "working"; // Added for Workspace V2
  created_at: string;
}

export interface AgentCreate {
  handle: string;
  name: string;
  agent_type: "claude" | "qwen" | "gemini" | "custom";
  capabilities?: string[];
}

export interface AgentUpdate {
  name?: string;
  agent_type?: "claude" | "qwen" | "gemini" | "custom";
  capabilities?: string[];
}

// Task Types
export type TaskStatus = "pending" | "in_progress" | "review" | "completed" | "blocked" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type RecurrencePattern = "1m" | "5m" | "10m" | "15m" | "30m" | "1h" | "daily" | "weekly" | "monthly";
export type RecurrenceTrigger = "on_complete" | "on_due_date" | "both";

// Recurrence pattern options for UI dropdowns
export const RECURRENCE_PATTERNS: { value: RecurrencePattern; label: string }[] = [
  { value: "1m", label: "Every minute" },
  { value: "5m", label: "Every 5 minutes" },
  { value: "10m", label: "Every 10 minutes" },
  { value: "15m", label: "Every 15 minutes" },
  { value: "30m", label: "Every 30 minutes" },
  { value: "1h", label: "Every hour" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

// Recurrence trigger options for UI dropdowns
export const RECURRENCE_TRIGGERS: { value: RecurrenceTrigger; label: string; description: string; comingSoon?: boolean }[] = [
  { value: "on_complete", label: "On Completion", description: "Create next occurrence when task is completed" },
  { value: "on_due_date", label: "On Due Date", description: "Create next occurrence when due date passes" },
  { value: "both", label: "Both", description: "Create on completion or due date, whichever comes first" },
];

export interface TaskListItem {
  id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress_percent: number;
  assignee_id: number | null;
  assignee_handle: string | null;
  due_date: string | null;
  created_at: string;
  parent_task_id: number | null;
  subtask_count: number;
  // Recurring indicator
  is_recurring: boolean;
}

export interface TaskRead {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  progress_percent: number;
  tags: string[];
  due_date: string | null;
  // Recurring fields
  is_recurring: boolean;
  recurrence_pattern: string | null;
  max_occurrences: number | null;
  recurring_root_id: number | null;
  recurrence_trigger: RecurrenceTrigger;
  clone_subtasks_on_recur: boolean;
  has_spawned_next: boolean;
  spawn_count: number;
  // Foreign key references
  project_id: number;
  assignee_id: number | null;
  assignee_handle: string | null;
  parent_task_id: number | null;
  created_by_id: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  subtasks: TaskRead[];
}

export interface TaskCreate {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignee_id?: number;
  parent_task_id?: number;
  tags?: string[];
  due_date?: string;
  // Recurring fields
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  max_occurrences?: number;
  recurrence_trigger?: RecurrenceTrigger;
  clone_subtasks_on_recur?: boolean;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  tags?: string[];
  due_date?: string;
  // Recurring fields
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  max_occurrences?: number;
  recurrence_trigger?: RecurrenceTrigger;
  clone_subtasks_on_recur?: boolean;
}

export interface TaskStatusUpdate {
  status: TaskStatus;
}

export interface TaskProgressUpdate {
  percent: number;
  note?: string;
}

export interface TaskAssignUpdate {
  assignee_id: number;
}

// Audit Types
export interface AuditRead {
  id: number;
  entity_type: "project" | "task" | "worker";
  entity_id: number;
  action: string;
  actor_id: number;
  actor_handle: string;
  actor_type: "human" | "agent";
  details: Record<string, unknown>;
  created_at: string;
}

// API Response Types
export interface ApiError {
  error: string;
  status_code: number;
}

export interface DeleteResponse {
  ok: boolean;
  deleted_tasks?: number;
}

// Pagination
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// Task Filter Params
export interface TaskFilterParams extends PaginationParams {
  status?: TaskStatus;
  assignee_id?: number;
  priority?: TaskPriority;
  // NEW: Search, filter, and sort parameters
  search?: string;
  tags?: string;  // comma-separated, AND logic
  has_due_date?: boolean;
  sort_by?: "created_at" | "due_date" | "priority" | "title";
  sort_order?: "asc" | "desc";
}
