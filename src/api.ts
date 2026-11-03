export type UserRole = 'admin' | 'engineer';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type UpdateKind = 'progress' | 'question' | 'suggestion' | 'ai_note';
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugStatus = 'open' | 'triaging' | 'fixing' | 'testing' | 'resolved' | 'ignored';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  githubHandle: string;
  bio: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface ProjectItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  repoUrl: string;
  localPath: string;
  cloneCommand: string;
  setupInstructions: string;
  defaultBranch: string;
  envContent: string;
  envUpdatedAt: string;
  envUpdatedBy: string;
  createdAt: string;
}

export interface TaskUpdateItem {
  id: string;
  taskId: string;
  authorEmail: string;
  authorName: string;
  kind: UpdateKind;
  content: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  projectId: string;
  projectName?: string;
  repoUrl?: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: TaskStatus;
  priority: TaskPriority;
  assigneeEmail: string;
  assigneeName?: string;
  assignedBy: string;
  sourceTranscript?: string;
  repoPathHint: string;
  tags: string[];
  updates: TaskUpdateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SynthesizedTaskDraft {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: TaskPriority;
  repoPathHint: string;
  tags: string[];
  suggestedAssigneeEmail?: string;
}

export interface BugReportItem {
  id: string;
  projectId: string;
  projectName?: string;
  repoUrl?: string;
  localPath?: string;
  title: string;
  description: string;
  severity: BugSeverity;
  status: BugStatus;
  reporterEmail: string;
  reporterName: string;
  stackTrace: string;
  reproSteps: string;
  filePaths: string;
  agentAssigned: string;
  agentFixSummary: string;
  agentTestOutput: string;
  agentCommitOrDiff: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiHealth {
  online: boolean;
  model: string;
  uncensored: boolean;
  activeEndpoint: string;
  localPort8083Online: boolean;
  gatewayOnline: boolean;
  dshHarnessOnline: boolean;
  dshPort: number;
  checkedAt: string;
}

export interface WorkspacePayload {
  user: UserAccount;
  users: UserAccount[];
  projects: ProjectItem[];
  tasks: TaskItem[];
  bugs: BugReportItem[];
  aiHealth: AiHealth;
}

const SESSION_STORAGE_KEY = 'uhurued_tracker_token_v1';

export class TrackerApiClient {
  private token: string | null = null;
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    try {
      this.token = window.localStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      this.token = null;
    }
  }

  hasSession(): boolean {
    return Boolean(this.token);
  }

  setToken(token: string | null) {
    this.token = token;
    try {
      if (token) window.localStorage.setItem(SESSION_STORAGE_KEY, token);
      else window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data as T;
  }

  async requestCode(email: string): Promise<{ ok: boolean; email: string; sender: string; delivered: boolean; previewCode?: string }> {
    return this.request('/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyCode(input: { email: string; code: string; name?: string; githubHandle?: string }): Promise<{ token: string; user: UserAccount }> {
    const res = await this.request<{ token: string; user: UserAccount }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.setToken(res.token);
    return res;
  }

  async loadWorkspace(): Promise<WorkspacePayload> {
    return this.request<WorkspacePayload>('/workspace');
  }

  async createTask(input: {
    projectId: string;
    title: string;
    description: string;
    acceptanceCriteria?: string[];
    priority?: TaskPriority;
    assigneeEmail?: string;
    repoPathHint?: string;
    tags?: string[];
    sourceTranscript?: string;
  }): Promise<{ task: TaskItem; emailDelivered: boolean }> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateTask(
    taskId: string,
    patch: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      assigneeEmail: string;
      acceptanceCriteria: string[];
      repoPathHint: string;
    }>,
  ): Promise<{ task: TaskItem; emailDelivered: boolean }> {
    return this.request(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async postTaskUpdate(taskId: string, kind: UpdateKind, content: string): Promise<{ task: TaskItem }> {
    return this.request(`/tasks/${taskId}/updates`, {
      method: 'POST',
      body: JSON.stringify({ kind, content }),
    });
  }

  async askAiOnTask(taskId: string, prompt: string): Promise<{ task: TaskItem; model: string; endpointUsed: string }> {
    return this.request(`/tasks/${taskId}/ai-assist`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }

  async synthesizeTranscript(input: {
    transcript: string;
    projectId: string;
    assigneeEmail?: string;
    autoCreate?: boolean;
  }): Promise<{
    drafts: SynthesizedTaskDraft[];
    createdTasks: TaskItem[];
    model: string;
    endpointUsed: string;
  }> {
    return this.request('/ai/transcript-to-tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async saveProjectEnv(projectId: string, envContent: string): Promise<{ project: ProjectItem }> {
    return this.request(`/projects/${projectId}/env`, {
      method: 'PATCH',
      body: JSON.stringify({ envContent }),
    });
  }

  async upsertProject(input: {
    id?: string;
    name: string;
    description: string;
    repoUrl: string;
    localPath?: string;
    cloneCommand?: string;
    setupInstructions?: string;
    defaultBranch?: string;
    envContent?: string;
  }): Promise<{ project: ProjectItem }> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async createBug(input: {
    projectId: string;
    title: string;
    description: string;
    severity: BugSeverity;
    stackTrace?: string;
    reproSteps?: string;
    filePaths?: string;
  }): Promise<{ bug: BugReportItem; dshWoken: boolean; model: string; endpointUsed: string }> {
    return this.request('/bugs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateBug(
    bugId: string,
    patch: Partial<{
      status: BugStatus;
      severity: BugSeverity;
      agentFixSummary: string;
      agentTestOutput: string;
      agentCommitOrDiff: string;
    }>,
  ): Promise<{ bug: BugReportItem }> {
    return this.request(`/bugs/${bugId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async dispatchBugToDsh(bugId: string): Promise<{ bug: BugReportItem; dshWoken: boolean; model: string }> {
    return this.request(`/bugs/${bugId}/dispatch-dsh`, {
      method: 'POST',
    });
  }

  async inviteEngineer(input: { email: string; name?: string; githubHandle?: string }): Promise<{ member: UserAccount }> {
    return this.request('/team/invite', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async inviteTeamMember(input: { email: string; name?: string; githubHandle?: string }): Promise<{ member: UserAccount }> {
    return this.inviteEngineer(input);
  }

  async updateProfile(patch: { name?: string; githubHandle?: string; bio?: string }): Promise<{ user: UserAccount }> {
    return this.request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }
}

export const defaultTrackerApi = new TrackerApiClient();
