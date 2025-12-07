import {
  ProjectRead,
  ProjectCreate,
  ProjectUpdate,
  MemberRead,
  MemberCreate,
  WorkerRead,
  AgentCreate,
  AgentUpdate,
  TaskListItem,
  TaskRead,
  TaskCreate,
  TaskUpdate,
  TaskStatusUpdate,
  TaskProgressUpdate,
  TaskAssignUpdate,
  AuditRead,
  ApiError,
  DeleteResponse,
  PaginationParams,
  TaskFilterParams,
} from "@/types";

// API requests go through our proxy which adds the auth token from httpOnly cookies
// Proxy prepends /api/ to all paths, so we use paths without /api/ prefix
const API_PROXY = "/api/proxy";

// API client singleton
class ApiClient {
  private proxyUrl: string;

  constructor(proxyUrl: string) {
    this.proxyUrl = proxyUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.proxyUrl}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Handle 401 - redirect to login
    if (response.status === 401) {
      window.location.href = "/";
      throw new Error("Not authenticated");
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: "Request failed",
        status_code: response.status,
      }));
      throw new Error(error.error);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Health check (direct, no auth needed)
  async health(): Promise<{ status: string; version: string }> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/health`);
    return response.json();
  }

  // Projects API
  async getProjects(params?: PaginationParams): Promise<ProjectRead[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    const query = searchParams.toString();
    return this.request<ProjectRead[]>(`/projects${query ? `?${query}` : ""}`);
  }

  async getProject(projectId: number): Promise<ProjectRead> {
    return this.request<ProjectRead>(`/projects/${projectId}`);
  }

  async createProject(data: ProjectCreate): Promise<ProjectRead> {
    return this.request<ProjectRead>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProject(projectId: number, data: ProjectUpdate): Promise<ProjectRead> {
    return this.request<ProjectRead>(`/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProject(projectId: number, force = false): Promise<DeleteResponse> {
    return this.request<DeleteResponse>(`/projects/${projectId}?force=${force}`, {
      method: "DELETE",
    });
  }

  // Project Members API
  async getProjectMembers(projectId: number): Promise<MemberRead[]> {
    return this.request<MemberRead[]>(`/projects/${projectId}/members`);
  }

  async addProjectMember(projectId: number, data: MemberCreate): Promise<MemberRead> {
    return this.request<MemberRead>(`/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async removeProjectMember(projectId: number, memberId: number): Promise<DeleteResponse> {
    return this.request<DeleteResponse>(`/projects/${projectId}/members/${memberId}`, {
      method: "DELETE",
    });
  }

  // Agents API
  async getAgents(params?: PaginationParams): Promise<WorkerRead[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    const query = searchParams.toString();
    return this.request<WorkerRead[]>(`/workers/agents${query ? `?${query}` : ""}`);
  }

  async getAgent(agentId: number): Promise<WorkerRead> {
    return this.request<WorkerRead>(`/workers/agents/${agentId}`);
  }

  async createAgent(data: AgentCreate): Promise<WorkerRead> {
    return this.request<WorkerRead>("/workers/agents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAgent(agentId: number, data: AgentUpdate): Promise<WorkerRead> {
    return this.request<WorkerRead>(`/workers/agents/${agentId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteAgent(agentId: number): Promise<DeleteResponse> {
    return this.request<DeleteResponse>(`/workers/agents/${agentId}`, {
      method: "DELETE",
    });
  }

  // Tasks API
  async getProjectTasks(projectId: number, params?: TaskFilterParams): Promise<TaskListItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.assignee_id) searchParams.set("assignee_id", params.assignee_id.toString());
    if (params?.priority) searchParams.set("priority", params.priority);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    const query = searchParams.toString();
    return this.request<TaskListItem[]>(`/projects/${projectId}/tasks${query ? `?${query}` : ""}`);
  }

  async getTask(taskId: number): Promise<TaskRead> {
    return this.request<TaskRead>(`/tasks/${taskId}`);
  }

  async createTask(projectId: number, data: TaskCreate): Promise<TaskRead> {
    return this.request<TaskRead>(`/projects/${projectId}/tasks`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTask(taskId: number, data: TaskUpdate): Promise<TaskRead> {
    return this.request<TaskRead>(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTask(taskId: number): Promise<DeleteResponse> {
    return this.request<DeleteResponse>(`/tasks/${taskId}`, {
      method: "DELETE",
    });
  }

  // Task Workflow API
  async updateTaskStatus(taskId: number, data: TaskStatusUpdate): Promise<TaskRead> {
    return this.request<TaskRead>(`/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async updateTaskProgress(taskId: number, data: TaskProgressUpdate): Promise<TaskRead> {
    return this.request<TaskRead>(`/tasks/${taskId}/progress`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async assignTask(taskId: number, data: TaskAssignUpdate): Promise<TaskRead> {
    return this.request<TaskRead>(`/tasks/${taskId}/assign`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async createSubtask(parentTaskId: number, data: TaskCreate): Promise<TaskRead> {
    return this.request<TaskRead>(`/tasks/${parentTaskId}/subtasks`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async approveTask(taskId: number): Promise<TaskRead> {
    return this.request<TaskRead>(`/tasks/${taskId}/approve`, {
      method: "POST",
    });
  }

  async rejectTask(taskId: number, reason: string): Promise<TaskRead> {
    return this.request<TaskRead>(`/tasks/${taskId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  // Audit API
  async getTaskAudit(taskId: number, params?: PaginationParams): Promise<AuditRead[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    const query = searchParams.toString();
    return this.request<AuditRead[]>(`/tasks/${taskId}/audit${query ? `?${query}` : ""}`);
  }

  async getProjectAudit(projectId: number, params?: PaginationParams): Promise<AuditRead[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    const query = searchParams.toString();
    return this.request<AuditRead[]>(`/projects/${projectId}/audit${query ? `?${query}` : ""}`);
  }
}

// Export singleton instance
export const api = new ApiClient(API_PROXY);

// Export type-safe hooks-style functions for use in components
export {
  type ProjectRead,
  type ProjectCreate,
  type ProjectUpdate,
  type MemberRead,
  type WorkerRead,
  type TaskListItem,
  type TaskRead,
  type TaskCreate,
  type AuditRead,
};
