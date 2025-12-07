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
import { getAccessToken, refreshAccessToken, logout } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// API client singleton
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    let token = getAccessToken();

    // Try to refresh if no token
    if (!token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        token = getAccessToken();
      }
    }

    // Still no token, redirect to login
    if (!token) {
      logout();
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Handle 401 - try to refresh once
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        token = getAccessToken();
        // Retry the request
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        if (!retryResponse.ok) {
          const error: ApiError = await retryResponse.json().catch(() => ({
            error: "Request failed",
            status_code: retryResponse.status,
          }));
          throw new Error(error.error);
        }

        return retryResponse.json();
      }

      // Refresh failed, log out
      logout();
      throw new Error("Session expired");
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

  // Health check
  async health(): Promise<{ status: string; version: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }

  // Projects API
  async getProjects(params?: PaginationParams): Promise<ProjectRead[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    const query = searchParams.toString();
    return this.request<ProjectRead[]>(`/api/projects${query ? `?${query}` : ""}`);
  }

  async getProject(projectId: number): Promise<ProjectRead> {
    return this.request<ProjectRead>(`/api/projects/${projectId}`);
  }

  async createProject(data: ProjectCreate): Promise<ProjectRead> {
    return this.request<ProjectRead>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProject(projectId: number, data: ProjectUpdate): Promise<ProjectRead> {
    return this.request<ProjectRead>(`/api/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProject(projectId: number, force = false): Promise<DeleteResponse> {
    return this.request<DeleteResponse>(`/api/projects/${projectId}?force=${force}`, {
      method: "DELETE",
    });
  }

  // Project Members API
  async getProjectMembers(projectId: number): Promise<MemberRead[]> {
    return this.request<MemberRead[]>(`/api/projects/${projectId}/members`);
  }

  async addProjectMember(projectId: number, data: MemberCreate): Promise<MemberRead> {
    return this.request<MemberRead>(`/api/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async removeProjectMember(projectId: number, memberId: number): Promise<DeleteResponse> {
    return this.request<DeleteResponse>(`/api/projects/${projectId}/members/${memberId}`, {
      method: "DELETE",
    });
  }

  // Agents API
  async getAgents(params?: PaginationParams): Promise<WorkerRead[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    const query = searchParams.toString();
    return this.request<WorkerRead[]>(`/api/workers/agents${query ? `?${query}` : ""}`);
  }

  async getAgent(agentId: number): Promise<WorkerRead> {
    return this.request<WorkerRead>(`/api/workers/agents/${agentId}`);
  }

  async createAgent(data: AgentCreate): Promise<WorkerRead> {
    return this.request<WorkerRead>("/api/workers/agents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAgent(agentId: number, data: AgentUpdate): Promise<WorkerRead> {
    return this.request<WorkerRead>(`/api/workers/agents/${agentId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteAgent(agentId: number): Promise<DeleteResponse> {
    return this.request<DeleteResponse>(`/api/workers/agents/${agentId}`, {
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
    return this.request<TaskListItem[]>(`/api/projects/${projectId}/tasks${query ? `?${query}` : ""}`);
  }

  async getTask(taskId: number): Promise<TaskRead> {
    return this.request<TaskRead>(`/api/tasks/${taskId}`);
  }

  async createTask(projectId: number, data: TaskCreate): Promise<TaskRead> {
    return this.request<TaskRead>(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTask(taskId: number, data: TaskUpdate): Promise<TaskRead> {
    return this.request<TaskRead>(`/api/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTask(taskId: number): Promise<DeleteResponse> {
    return this.request<DeleteResponse>(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });
  }

  // Task Workflow API
  async updateTaskStatus(taskId: number, data: TaskStatusUpdate): Promise<TaskRead> {
    return this.request<TaskRead>(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async updateTaskProgress(taskId: number, data: TaskProgressUpdate): Promise<TaskRead> {
    return this.request<TaskRead>(`/api/tasks/${taskId}/progress`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async assignTask(taskId: number, data: TaskAssignUpdate): Promise<TaskRead> {
    return this.request<TaskRead>(`/api/tasks/${taskId}/assign`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async createSubtask(parentTaskId: number, data: TaskCreate): Promise<TaskRead> {
    return this.request<TaskRead>(`/api/tasks/${parentTaskId}/subtasks`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async approveTask(taskId: number): Promise<TaskRead> {
    return this.request<TaskRead>(`/api/tasks/${taskId}/approve`, {
      method: "POST",
    });
  }

  async rejectTask(taskId: number, reason: string): Promise<TaskRead> {
    return this.request<TaskRead>(`/api/tasks/${taskId}/reject`, {
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
    return this.request<AuditRead[]>(`/api/tasks/${taskId}/audit${query ? `?${query}` : ""}`);
  }

  async getProjectAudit(projectId: number, params?: PaginationParams): Promise<AuditRead[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    const query = searchParams.toString();
    return this.request<AuditRead[]>(`/api/projects/${projectId}/audit${query ? `?${query}` : ""}`);
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE);

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
