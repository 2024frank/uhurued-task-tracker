import { neon } from '@neondatabase/serverless';
import { nanoid } from 'nanoid';

export type UserRole = 'admin' | 'engineer';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type UpdateKind = 'progress' | 'question' | 'suggestion' | 'ai_note';
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugStatus = 'open' | 'triaging' | 'fixing' | 'testing' | 'resolved' | 'ignored';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  githubHandle: string;
  bio: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface ProjectRecord {
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

export interface TaskUpdateRecord {
  id: string;
  taskId: string;
  authorEmail: string;
  authorName: string;
  kind: UpdateKind;
  content: string;
  createdAt: string;
}

export interface TaskRecord {
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
  updates: TaskUpdateRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface BugReportRecord {
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

const DEFAULT_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || 'fkusiapp@oberlin.edu,fkusiapp@gmail.com,kusi@uhurued.com,task@uhurued.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function isOwnerOrAdminEmail(email: string): boolean {
  const clean = email.trim().toLowerCase();
  return DEFAULT_ADMIN_EMAILS.has(clean);
}

export function deriveDisplayName(email: string, providedName?: string): string {
  if (providedName && providedName.trim()) return providedName.trim();
  const clean = email.trim().toLowerCase();
  if (clean === 'fkusiapp@oberlin.edu' || clean === 'fkusiapp@gmail.com' || clean === 'kusi@uhurued.com') {
    return 'Frank Kusi Appiah';
  }
  const local = clean.split('@')[0] || 'Engineer';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export interface TrackerStore {
  ensureInitialized(): Promise<void>;
  saveOtp(email: string, code: string, expiresAtIso: string): Promise<void>;
  verifyOtp(email: string, code: string): Promise<boolean>;
  upsertUser(email: string, name?: string, githubHandle?: string): Promise<UserRecord>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  updateUserProfile(email: string, patch: { name?: string; githubHandle?: string; bio?: string }): Promise<UserRecord>;
  listUsers(): Promise<UserRecord[]>;
  listProjects(): Promise<ProjectRecord[]>;
  getProject(id: string): Promise<ProjectRecord | null>;
  upsertProject(input: Partial<ProjectRecord> & { name: string; repoUrl: string }, actorEmail: string): Promise<ProjectRecord>;
  updateProjectEnv(projectId: string, envContent: string, actorEmail: string): Promise<ProjectRecord>;
  listTasks(filters?: { assigneeEmail?: string; projectId?: string; status?: string }): Promise<TaskRecord[]>;
  getTask(taskId: string): Promise<TaskRecord | null>;
  createTask(input: {
    projectId: string;
    title: string;
    description: string;
    acceptanceCriteria?: string[];
    priority?: TaskPriority;
    assigneeEmail?: string;
    assignedBy: string;
    sourceTranscript?: string;
    repoPathHint?: string;
    tags?: string[];
  }): Promise<TaskRecord>;
  updateTask(
    taskId: string,
    patch: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeEmail?: string;
      acceptanceCriteria?: string[];
      repoPathHint?: string;
      tags?: string[];
    },
  ): Promise<TaskRecord | null>;
  addTaskUpdate(input: {
    taskId: string;
    authorEmail: string;
    authorName: string;
    kind: UpdateKind;
    content: string;
  }): Promise<TaskUpdateRecord>;
  listBugs(filters?: { status?: string; projectId?: string }): Promise<BugReportRecord[]>;
  getBug(bugId: string): Promise<BugReportRecord | null>;
  createBug(input: {
    projectId: string;
    title: string;
    description: string;
    severity?: BugSeverity;
    reporterEmail: string;
    reporterName: string;
    stackTrace?: string;
    reproSteps?: string;
    filePaths?: string;
    agentFixSummary?: string;
  }): Promise<BugReportRecord>;
  updateBug(
    bugId: string,
    patch: {
      status?: BugStatus;
      severity?: BugSeverity;
      agentFixSummary?: string;
      agentTestOutput?: string;
      agentCommitOrDiff?: string;
    },
  ): Promise<BugReportRecord | null>;
}

function buildSeedProjects(): ProjectRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'proj_task_tracker',
      slug: 'uhurued-task-tracker',
      name: 'Uhurued Task Tracker (task.uhurued.com)',
      description:
        'Open-source collaborative engineering task tracker, .env configuration vault, and local Qwen3.6-Heretic + DeepSeek Harness bug automation platform.',
      repoUrl: 'https://github.com/2024frank/uhurued-task-tracker',
      localPath: '/home/kusi/Desktop/Dev/Uhurued/task-tracker',
      cloneCommand: 'git clone https://github.com/2024frank/uhurued-task-tracker.git && cd uhurued-task-tracker && npm install',
      setupInstructions: [
        '1. Clone the repository: `git clone https://github.com/2024frank/uhurued-task-tracker.git`',
        '2. Copy the shared `.env` variables from the vault below into `.env.local`.',
        '3. Install dependencies: `npm install`',
        '4. Run tests: `npm test`',
        '5. Start local dev server: `npm run dev` (Frontend on :5179, Hono API on :4179).',
      ].join('\n'),
      defaultBranch: 'main',
      envContent: [
        '# Shared Engineering Environment — Out There Task Tracker',
        'VITE_API_URL=/api',
        'EMAIL_FROM="Out There <task@uhurued.com>"',
        'PUBLIC_QWEN_GATEWAY_URL=https://kusi-qwen-api.vercel.app/v1',
        'LOCAL_HERETIC_URL=http://127.0.0.1:8083/v1',
        'LOCAL_MODEL_ID=qwen3.6-35b-a3b-heretic',
        'DSH_WEB_URL=http://127.0.0.1:3080',
      ].join('\n'),
      envUpdatedAt: now,
      envUpdatedBy: 'fkusiapp@oberlin.edu',
      createdAt: now,
    },
    {
      id: 'proj_out_there',
      slug: 'out-there',
      name: 'Out There — Campus Discovery & Admin',
      description:
        'Multi-campus mobile discovery app, Hono/Drizzle PostgreSQL backend, and moderation administration portal.',
      repoUrl: 'https://github.com/Sankofa-Robotics/out-there',
      localPath: '/home/kusi/Desktop/Dev/out-there',
      cloneCommand: 'git clone https://github.com/Sankofa-Robotics/out-there.git && cd out-there && npm install',
      setupInstructions: [
        '1. Clone repo: `git clone https://github.com/Sankofa-Robotics/out-there.git`',
        '2. Copy `.env.local` from the shared vault below into the project root.',
        '3. Run backend + unit tests: `npm test` and `npm run typecheck:server`.',
        '4. For admin portal development: `cd admin && npm install && npm run dev`.',
      ].join('\n'),
      defaultBranch: 'codex/mobile-frontend',
      envContent: [
        '# Shared Engineering Environment — Out There',
        'VITE_API_URL=https://api.uhurued.com/ot',
        'EXPO_PUBLIC_API_URL=https://api.uhurued.com/ot',
        'EMAIL_FROM="Out There <sign-in@uhurued.com>"',
        'EVENT_NOTIFICATIONS_ENABLED=false',
      ].join('\n'),
      envUpdatedAt: now,
      envUpdatedBy: 'fkusiapp@oberlin.edu',
      createdAt: now,
    },
    {
      id: 'proj_readdocs',
      slug: 'readdocs',
      name: 'ReadDocs — Smart Glasses & Web PDF Reader',
      description:
        'Cross-platform PDF/document reader for Even Realities G1, Rokid, Mentra, and web with live crash telemetry and OTA shipping.',
      repoUrl: 'https://github.com/AnanseNet-Inc/even-pdf-reader',
      localPath: '/home/kusi/Desktop/Dev/Uhurued/readDocs',
      cloneCommand: 'git clone https://github.com/AnanseNet-Inc/even-pdf-reader.git && cd even-pdf-reader && npm install',
      setupInstructions: [
        '1. Clone repo: `git clone https://github.com/AnanseNet-Inc/even-pdf-reader.git`',
        '2. Place the `.env` variables below in `.env.local`.',
        '3. Run verification suite: `npm test && npm run build`.',
        '4. DeepSeek Harness (`dsh`) monitors crash groups and ships fixes automatically.',
      ].join('\n'),
      defaultBranch: 'main',
      envContent: [
        '# Shared Engineering Environment — ReadDocs',
        'READDOCS_API_BASE=https://api.uhurued.com/readdocs',
        'READDOCS_OTA_ORIGIN=https://uhurued-readdocs.vercel.app',
        'VITE_FIREBASE_PROJECT_ID=uhurued-inc',
      ].join('\n'),
      envUpdatedAt: now,
      envUpdatedBy: 'fkusiapp@oberlin.edu',
      createdAt: now,
    },
  ];
}

export class MemoryTrackerStore implements TrackerStore {
  private users = new Map<string, UserRecord>();
  private otps = new Map<string, { code: string; expiresAt: number }>();
  private projects = new Map<string, ProjectRecord>();
  private tasks = new Map<string, TaskRecord>();
  private updates = new Map<string, TaskUpdateRecord[]>();
  private bugs = new Map<string, BugReportRecord>();
  private initialized = false;

  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    const now = new Date().toISOString();

    const adminUser: UserRecord = {
      id: 'usr_kusi_admin',
      email: 'fkusiapp@oberlin.edu',
      name: 'Frank Kusi Appiah',
      role: 'admin',
      githubHandle: '2024frank',
      bio: 'Founder & Lead Systems Architect at Uhurued. Connected to local Qwen3.6-Heretic (8083) & DeepSeek Harness (3080).',
      createdAt: now,
      lastSeenAt: now,
    };
    this.users.set(adminUser.email, adminUser);

    for (const p of buildSeedProjects()) {
      this.projects.set(p.id, p);
    }

    const seedTask1Id = 'tsk_heretic_gateway';
    const seedUpdate1: TaskUpdateRecord = {
      id: 'upd_seed_1',
      taskId: seedTask1Id,
      authorEmail: 'qwen3.6-heretic@uhurued.com',
      authorName: 'Qwen3.6-Heretic (Local 8083)',
      kind: 'ai_note',
      content:
        'Verified `http://127.0.0.1:8083/v1/chat/completions` (`qwen3.6-35b-a3b-heretic`) and public Cloudflare tunnel gateway `https://kusi-qwen-api.vercel.app/v1`. Transcript-to-task synthesis and autonomous DeepSeek Harness bug triage are active.',
      createdAt: now,
    };
    this.updates.set(seedTask1Id, [seedUpdate1]);

    this.tasks.set(seedTask1Id, {
      id: seedTask1Id,
      projectId: 'proj_task_tracker',
      title: 'Connect transcript-to-task studio and DeepSeek Harness bug watcher to Qwen3.6-Heretic',
      description: [
        '### Objective',
        'Ensure `task.uhurued.com` routes all transcript synthesis, task Q&A, and automated bug triage through Kusi\'s local uncensored `qwen3.6-35b-a3b-heretic` model on port `8083` (and via `https://kusi-qwen-api.vercel.app/v1` when called from Vercel production).',
        '',
        '### Key Deliverables',
        '- Transcript input parses raw meeting notes into structured engineering specs with acceptance criteria and one-click user assignment.',
        '- Assigning a task emails the engineer from `tracker@uhurued.com` using the Out There one-tone email template.',
        '- Filing a bug report wakes the DeepSeek Harness (`dsh`) plugin to reproduce, fix, and run tests.',
      ].join('\n'),
      acceptanceCriteria: [
        'Local model health badge confirms Qwen3.6-Heretic (8083) and gateway connectivity.',
        'Emails send from Uhurued Tracker <tracker@uhurued.com> using the one-tone #122218/#FFD75B template.',
        'Engineers can post progress writeups, questions, and suggestions on any task.',
      ],
      status: 'in_progress',
      priority: 'high',
      assigneeEmail: 'fkusiapp@oberlin.edu',
      assignedBy: 'qwen3.6-35b-a3b-heretic',
      repoPathHint: 'server/ai.ts',
      tags: ['local-llm', 'qwen3.6-heretic', 'deepseek-harness'],
      updates: [seedUpdate1],
      createdAt: now,
      updatedAt: now,
    });

    const seedBugId = 'bug_seed_env_sync';
    this.bugs.set(seedBugId, {
      id: seedBugId,
      projectId: 'proj_task_tracker',
      title: 'Ensure .env download strips trailing carriage returns on Windows/WSL',
      description:
        'When engineers copy or download a shared `.env` file on CRLF systems, trailing `\\r` characters can break shell `source .env` commands.',
      severity: 'medium',
      status: 'resolved',
      reporterEmail: 'fkusiapp@oberlin.edu',
      reporterName: 'Frank Kusi Appiah',
      stackTrace: 'env: line 4: $’\\r’: command not found',
      reproSteps: '1. Paste Windows-formatted .env in Vault\n2. Click Download .env\n3. Run `set -a && source .env` in bash.',
      filePaths: 'src/App.tsx, server/app.ts',
      agentAssigned: 'dsh-qwen3.6-heretic (Port 3080 -> 8083)',
      agentFixSummary:
        'Normalized `.env` content line endings (`\\r\\n` -> `\\n`) before storing and downloading in the `.env` Vault.',
      agentTestOutput: '✓ src/App.test.tsx (6 tests) — LF normalization and .env copy/download verified.',
      agentCommitOrDiff: 'envContent.replace(/\\r\\n/g, "\\n")',
      resolvedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  async saveOtp(email: string, code: string, expiresAtIso: string): Promise<void> {
    await this.ensureInitialized();
    this.otps.set(email.trim().toLowerCase(), {
      code,
      expiresAt: new Date(expiresAtIso).getTime(),
    });
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    await this.ensureInitialized();
    const clean = email.trim().toLowerCase();
    const entry = this.otps.get(clean);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.otps.delete(clean);
      return false;
    }
    if (entry.code !== code.trim()) return false;
    this.otps.delete(clean);
    return true;
  }

  async upsertUser(email: string, name?: string, githubHandle?: string): Promise<UserRecord> {
    await this.ensureInitialized();
    const clean = email.trim().toLowerCase();
    const now = new Date().toISOString();
    const existing = this.users.get(clean);
    if (existing) {
      const updated: UserRecord = {
        ...existing,
        name: name?.trim() || existing.name,
        githubHandle: githubHandle?.trim() || existing.githubHandle,
        role: isOwnerOrAdminEmail(clean) ? 'admin' : existing.role,
        lastSeenAt: now,
      };
      this.users.set(clean, updated);
      return updated;
    }
    const created: UserRecord = {
      id: `usr_${nanoid(10)}`,
      email: clean,
      name: deriveDisplayName(clean, name),
      role: isOwnerOrAdminEmail(clean) ? 'admin' : 'engineer',
      githubHandle: githubHandle?.trim() || '',
      bio: '',
      createdAt: now,
      lastSeenAt: now,
    };
    this.users.set(clean, created);
    return created;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    await this.ensureInitialized();
    return this.users.get(email.trim().toLowerCase()) || null;
  }

  async updateUserProfile(
    email: string,
    patch: { name?: string; githubHandle?: string; bio?: string },
  ): Promise<UserRecord> {
    const user = await this.upsertUser(email, patch.name, patch.githubHandle);
    const updated: UserRecord = {
      ...user,
      name: patch.name !== undefined ? patch.name.trim() || user.name : user.name,
      githubHandle: patch.githubHandle !== undefined ? patch.githubHandle.trim() : user.githubHandle,
      bio: patch.bio !== undefined ? patch.bio.trim() : user.bio,
    };
    this.users.set(user.email, updated);
    return updated;
  }

  async listUsers(): Promise<UserRecord[]> {
    await this.ensureInitialized();
    return Array.from(this.users.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async listProjects(): Promise<ProjectRecord[]> {
    await this.ensureInitialized();
    return Array.from(this.projects.values());
  }

  async getProject(id: string): Promise<ProjectRecord | null> {
    await this.ensureInitialized();
    return this.projects.get(id) || null;
  }

  async upsertProject(
    input: Partial<ProjectRecord> & { name: string; repoUrl: string },
    actorEmail: string,
  ): Promise<ProjectRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const id = input.id || `proj_${nanoid(8)}`;
    const existing = this.projects.get(id);
    const slug =
      input.slug ||
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const record: ProjectRecord = {
      id,
      slug,
      name: input.name.trim(),
      description: input.description?.trim() ?? existing?.description ?? '',
      repoUrl: input.repoUrl.trim(),
      localPath: input.localPath?.trim() ?? existing?.localPath ?? '',
      cloneCommand:
        input.cloneCommand?.trim() ||
        existing?.cloneCommand ||
        `git clone ${input.repoUrl.trim()} && cd ${slug} && npm install`,
      setupInstructions: input.setupInstructions?.trim() ?? existing?.setupInstructions ?? '',
      defaultBranch: input.defaultBranch?.trim() || existing?.defaultBranch || 'main',
      envContent: (input.envContent ?? existing?.envContent ?? '').replace(/\r\n/g, '\n'),
      envUpdatedAt: now,
      envUpdatedBy: actorEmail,
      createdAt: existing?.createdAt || now,
    };
    this.projects.set(id, record);
    return record;
  }

  async updateProjectEnv(projectId: string, envContent: string, actorEmail: string): Promise<ProjectRecord> {
    await this.ensureInitialized();
    const existing = this.projects.get(projectId);
    if (!existing) throw new Error('Project not found');
    const updated: ProjectRecord = {
      ...existing,
      envContent: envContent.replace(/\r\n/g, '\n'),
      envUpdatedAt: new Date().toISOString(),
      envUpdatedBy: actorEmail,
    };
    this.projects.set(projectId, updated);
    return updated;
  }

  private enrichTask(t: TaskRecord): TaskRecord {
    const proj = this.projects.get(t.projectId);
    const assignee = t.assigneeEmail ? this.users.get(t.assigneeEmail.toLowerCase()) : undefined;
    return {
      ...t,
      projectName: proj?.name || t.projectName || 'Workspace',
      repoUrl: proj?.repoUrl || t.repoUrl || '',
      assigneeName: assignee?.name || (t.assigneeEmail ? deriveDisplayName(t.assigneeEmail) : 'Unassigned'),
      updates: this.updates.get(t.id) || [],
    };
  }

  async listTasks(filters?: { assigneeEmail?: string; projectId?: string; status?: string }): Promise<TaskRecord[]> {
    await this.ensureInitialized();
    let list = Array.from(this.tasks.values()).map((t) => this.enrichTask(t));
    if (filters?.assigneeEmail) {
      const target = filters.assigneeEmail.trim().toLowerCase();
      list = list.filter((t) => t.assigneeEmail.toLowerCase() === target);
    }
    if (filters?.projectId && filters.projectId !== 'all') {
      list = list.filter((t) => t.projectId === filters.projectId);
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((t) => t.status === filters.status);
    }
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getTask(taskId: string): Promise<TaskRecord | null> {
    await this.ensureInitialized();
    const t = this.tasks.get(taskId);
    return t ? this.enrichTask(t) : null;
  }

  async createTask(input: {
    projectId: string;
    title: string;
    description: string;
    acceptanceCriteria?: string[];
    priority?: TaskPriority;
    assigneeEmail?: string;
    assignedBy: string;
    sourceTranscript?: string;
    repoPathHint?: string;
    tags?: string[];
  }): Promise<TaskRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const id = `tsk_${nanoid(10)}`;
    const cleanAssignee = (input.assigneeEmail || '').trim().toLowerCase();
    if (cleanAssignee && !this.users.has(cleanAssignee)) {
      await this.upsertUser(cleanAssignee);
    }
    const record: TaskRecord = {
      id,
      projectId: input.projectId || 'proj_task_tracker',
      title: input.title.trim(),
      description: input.description.trim(),
      acceptanceCriteria: input.acceptanceCriteria || [],
      status: 'todo',
      priority: input.priority || 'medium',
      assigneeEmail: cleanAssignee,
      assignedBy: input.assignedBy,
      sourceTranscript: input.sourceTranscript,
      repoPathHint: input.repoPathHint?.trim() || 'src/',
      tags: input.tags || [],
      updates: [],
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, record);
    this.updates.set(id, []);
    return this.enrichTask(record);
  }

  async updateTask(
    taskId: string,
    patch: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeEmail?: string;
      acceptanceCriteria?: string[];
      repoPathHint?: string;
      tags?: string[];
    },
  ): Promise<TaskRecord | null> {
    await this.ensureInitialized();
    const existing = this.tasks.get(taskId);
    if (!existing) return null;
    const cleanAssignee =
      patch.assigneeEmail !== undefined ? patch.assigneeEmail.trim().toLowerCase() : existing.assigneeEmail;
    if (cleanAssignee && !this.users.has(cleanAssignee)) {
      await this.upsertUser(cleanAssignee);
    }
    const updated: TaskRecord = {
      ...existing,
      title: patch.title !== undefined ? patch.title.trim() : existing.title,
      description: patch.description !== undefined ? patch.description.trim() : existing.description,
      status: patch.status ?? existing.status,
      priority: patch.priority ?? existing.priority,
      assigneeEmail: cleanAssignee,
      acceptanceCriteria: patch.acceptanceCriteria ?? existing.acceptanceCriteria,
      repoPathHint: patch.repoPathHint !== undefined ? patch.repoPathHint.trim() : existing.repoPathHint,
      tags: patch.tags ?? existing.tags,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(taskId, updated);
    return this.enrichTask(updated);
  }

  async addTaskUpdate(input: {
    taskId: string;
    authorEmail: string;
    authorName: string;
    kind: UpdateKind;
    content: string;
  }): Promise<TaskUpdateRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const update: TaskUpdateRecord = {
      id: `upd_${nanoid(10)}`,
      taskId: input.taskId,
      authorEmail: input.authorEmail.trim().toLowerCase(),
      authorName: input.authorName.trim(),
      kind: input.kind,
      content: input.content.trim(),
      createdAt: now,
    };
    const list = this.updates.get(input.taskId) || [];
    list.push(update);
    this.updates.set(input.taskId, list);
    const task = this.tasks.get(input.taskId);
    if (task) {
      task.updatedAt = now;
      this.tasks.set(input.taskId, task);
    }
    return update;
  }

  private enrichBug(b: BugReportRecord): BugReportRecord {
    const proj = this.projects.get(b.projectId);
    return {
      ...b,
      projectName: proj?.name || b.projectName || 'Workspace',
      repoUrl: proj?.repoUrl || b.repoUrl || '',
      localPath: proj?.localPath || b.localPath || '/home/kusi/Desktop/Dev/Uhurued/task-tracker',
    };
  }

  async listBugs(filters?: { status?: string; projectId?: string }): Promise<BugReportRecord[]> {
    await this.ensureInitialized();
    let list = Array.from(this.bugs.values()).map((b) => this.enrichBug(b));
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'actionable') {
        list = list.filter((b) => b.status !== 'resolved' && b.status !== 'ignored');
      } else {
        list = list.filter((b) => b.status === filters.status);
      }
    }
    if (filters?.projectId && filters.projectId !== 'all') {
      list = list.filter((b) => b.projectId === filters.projectId);
    }
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getBug(bugId: string): Promise<BugReportRecord | null> {
    await this.ensureInitialized();
    const b = this.bugs.get(bugId);
    return b ? this.enrichBug(b) : null;
  }

  async createBug(input: {
    projectId: string;
    title: string;
    description: string;
    severity?: BugSeverity;
    reporterEmail: string;
    reporterName: string;
    stackTrace?: string;
    reproSteps?: string;
    filePaths?: string;
    agentFixSummary?: string;
  }): Promise<BugReportRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const id = `bug_${nanoid(10)}`;
    const record: BugReportRecord = {
      id,
      projectId: input.projectId || 'proj_task_tracker',
      title: input.title.trim(),
      description: input.description.trim(),
      severity: input.severity || 'high',
      status: 'open',
      reporterEmail: input.reporterEmail.trim().toLowerCase(),
      reporterName: input.reporterName.trim(),
      stackTrace: input.stackTrace?.trim() || '',
      reproSteps: input.reproSteps?.trim() || '',
      filePaths: input.filePaths?.trim() || '',
      agentAssigned: 'dsh-qwen3.6-heretic (Port 3080 -> 8083)',
      agentFixSummary: input.agentFixSummary || '',
      agentTestOutput: '',
      agentCommitOrDiff: '',
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.bugs.set(id, record);
    return this.enrichBug(record);
  }

  async updateBug(
    bugId: string,
    patch: {
      status?: BugStatus;
      severity?: BugSeverity;
      agentFixSummary?: string;
      agentTestOutput?: string;
      agentCommitOrDiff?: string;
    },
  ): Promise<BugReportRecord | null> {
    await this.ensureInitialized();
    const existing = this.bugs.get(bugId);
    if (!existing) return null;
    const now = new Date().toISOString();
    const nextStatus = patch.status ?? existing.status;
    const updated: BugReportRecord = {
      ...existing,
      status: nextStatus,
      severity: patch.severity ?? existing.severity,
      agentFixSummary: patch.agentFixSummary !== undefined ? patch.agentFixSummary : existing.agentFixSummary,
      agentTestOutput: patch.agentTestOutput !== undefined ? patch.agentTestOutput : existing.agentTestOutput,
      agentCommitOrDiff: patch.agentCommitOrDiff !== undefined ? patch.agentCommitOrDiff : existing.agentCommitOrDiff,
      resolvedAt: nextStatus === 'resolved' ? existing.resolvedAt || now : existing.resolvedAt,
      updatedAt: now,
    };
    this.bugs.set(bugId, updated);
    return this.enrichBug(updated);
  }
}

export class PostgresTrackerStore implements TrackerStore {
  private sql: ReturnType<typeof neon>;
  private initialized = false;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await this.sql`
      CREATE TABLE IF NOT EXISTS uhuru_tracker_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'engineer',
        github_handle TEXT NOT NULL DEFAULT '',
        bio TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS uhuru_tracker_otps (
        email TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS uhuru_tracker_projects (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        repo_url TEXT NOT NULL,
        local_path TEXT NOT NULL DEFAULT '',
        clone_command TEXT NOT NULL DEFAULT '',
        setup_instructions TEXT NOT NULL DEFAULT '',
        default_branch TEXT NOT NULL DEFAULT 'main',
        env_content TEXT NOT NULL DEFAULT '',
        env_updated_at TEXT NOT NULL,
        env_updated_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS uhuru_tracker_tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'medium',
        assignee_email TEXT NOT NULL DEFAULT '',
        assigned_by TEXT NOT NULL DEFAULT '',
        source_transcript TEXT,
        repo_path_hint TEXT NOT NULL DEFAULT 'src/',
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS uhuru_tracker_task_updates (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        author_email TEXT NOT NULL,
        author_name TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'progress',
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS uhuru_tracker_bugs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'high',
        status TEXT NOT NULL DEFAULT 'open',
        reporter_email TEXT NOT NULL,
        reporter_name TEXT NOT NULL,
        stack_trace TEXT NOT NULL DEFAULT '',
        repro_steps TEXT NOT NULL DEFAULT '',
        file_paths TEXT NOT NULL DEFAULT '',
        agent_assigned TEXT NOT NULL DEFAULT 'dsh-qwen3.6-heretic',
        agent_fix_summary TEXT NOT NULL DEFAULT '',
        agent_test_output TEXT NOT NULL DEFAULT '',
        agent_commit_or_diff TEXT NOT NULL DEFAULT '',
        resolved_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;

    const existingProjects = (await this.sql`SELECT COUNT(*)::int AS cnt FROM uhuru_tracker_projects`) as Array<{ cnt: number }>;
    if ((existingProjects[0]?.cnt || 0) === 0) {
      const now = new Date().toISOString();
      await this.sql`
        INSERT INTO uhuru_tracker_users (id, email, name, role, github_handle, bio, created_at, last_seen_at)
        VALUES (
          'usr_kusi_admin',
          'fkusiapp@oberlin.edu',
          'Frank Kusi Appiah',
          'admin',
          '2024frank',
          'Founder & Lead Systems Architect at Uhurued. Connected to local Qwen3.6-Heretic (8083) & DeepSeek Harness (3080).',
          ${now},
          ${now}
        )
        ON CONFLICT (email) DO NOTHING
      `;
      for (const p of buildSeedProjects()) {
        await this.sql`
          INSERT INTO uhuru_tracker_projects (
            id, slug, name, description, repo_url, local_path, clone_command,
            setup_instructions, default_branch, env_content, env_updated_at, env_updated_by, created_at
          ) VALUES (
            ${p.id}, ${p.slug}, ${p.name}, ${p.description}, ${p.repoUrl}, ${p.localPath}, ${p.cloneCommand},
            ${p.setupInstructions}, ${p.defaultBranch}, ${p.envContent}, ${p.envUpdatedAt}, ${p.envUpdatedBy}, ${p.createdAt}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
      const seedTaskId = 'tsk_heretic_gateway';
      const criteriaJson = JSON.stringify([
        'Local model health badge confirms Qwen3.6-Heretic (8083) and gateway connectivity.',
        'Emails send from Uhurued Tracker <tracker@uhurued.com> using the one-tone #122218/#FFD75B template.',
        'Engineers can post progress writeups, questions, and suggestions on any task.',
      ]);
      const tagsJson = JSON.stringify(['local-llm', 'qwen3.6-heretic', 'deepseek-harness']);
      await this.sql`
        INSERT INTO uhuru_tracker_tasks (
          id, project_id, title, description, acceptance_criteria, status, priority,
          assignee_email, assigned_by, repo_path_hint, tags, created_at, updated_at
        ) VALUES (
          ${seedTaskId},
          'proj_task_tracker',
          'Connect transcript-to-task studio and DeepSeek Harness bug watcher to Qwen3.6-Heretic',
          ${'Ensure task.uhurued.com routes transcript synthesis, task Q&A, and automated bug triage through Kusi\'s local uncensored qwen3.6-35b-a3b-heretic model on port 8083 and via https://kusi-qwen-api.vercel.app/v1.'},
          ${criteriaJson}::jsonb,
          'in_progress',
          'high',
          'fkusiapp@oberlin.edu',
          'qwen3.6-35b-a3b-heretic',
          'server/ai.ts',
          ${tagsJson}::jsonb,
          ${now},
          ${now}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      await this.sql`
        INSERT INTO uhuru_tracker_task_updates (id, task_id, author_email, author_name, kind, content, created_at)
        VALUES (
          'upd_seed_1',
          ${seedTaskId},
          'qwen3.6-heretic@uhurued.com',
          'Qwen3.6-Heretic (Local 8083)',
          'ai_note',
          'Verified http://127.0.0.1:8083/v1/chat/completions (qwen3.6-35b-a3b-heretic) and public Cloudflare tunnel gateway https://kusi-qwen-api.vercel.app/v1. Transcript-to-task synthesis and autonomous DeepSeek Harness bug triage are active.',
          ${now}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    this.initialized = true;
  }

  async saveOtp(email: string, code: string, expiresAtIso: string): Promise<void> {
    await this.ensureInitialized();
    const clean = email.trim().toLowerCase();
    await this.sql`
      INSERT INTO uhuru_tracker_otps (email, code, expires_at)
      VALUES (${clean}, ${code}, ${expiresAtIso})
      ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at
    `;
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    await this.ensureInitialized();
    const clean = email.trim().toLowerCase();
    const rows = (await this.sql`
      SELECT code, expires_at FROM uhuru_tracker_otps WHERE email = ${clean}
    `) as Array<{ code: string; expires_at: string }>;
    const row = rows[0];
    if (!row) return false;
    if (Date.now() > new Date(row.expires_at).getTime()) {
      await this.sql`DELETE FROM uhuru_tracker_otps WHERE email = ${clean}`;
      return false;
    }
    if (row.code !== code.trim()) return false;
    await this.sql`DELETE FROM uhuru_tracker_otps WHERE email = ${clean}`;
    return true;
  }

  async upsertUser(email: string, name?: string, githubHandle?: string): Promise<UserRecord> {
    await this.ensureInitialized();
    const clean = email.trim().toLowerCase();
    const now = new Date().toISOString();
    const existing = await this.getUserByEmail(clean);
    if (existing) {
      const nextName = name?.trim() || existing.name;
      const nextGh = githubHandle?.trim() || existing.githubHandle;
      const nextRole: UserRole = isOwnerOrAdminEmail(clean) ? 'admin' : existing.role;
      await this.sql`
        UPDATE uhuru_tracker_users
        SET name = ${nextName}, github_handle = ${nextGh}, role = ${nextRole}, last_seen_at = ${now}
        WHERE email = ${clean}
      `;
      return { ...existing, name: nextName, githubHandle: nextGh, role: nextRole, lastSeenAt: now };
    }
    const id = `usr_${nanoid(10)}`;
    const displayName = deriveDisplayName(clean, name);
    const role: UserRole = isOwnerOrAdminEmail(clean) ? 'admin' : 'engineer';
    const gh = githubHandle?.trim() || '';
    await this.sql`
      INSERT INTO uhuru_tracker_users (id, email, name, role, github_handle, bio, created_at, last_seen_at)
      VALUES (${id}, ${clean}, ${displayName}, ${role}, ${gh}, '', ${now}, ${now})
    `;
    return { id, email: clean, name: displayName, role, githubHandle: gh, bio: '', createdAt: now, lastSeenAt: now };
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    await this.ensureInitialized();
    const clean = email.trim().toLowerCase();
    const rows = (await this.sql`
      SELECT id, email, name, role, github_handle, bio, created_at, last_seen_at
      FROM uhuru_tracker_users WHERE email = ${clean}
    `) as Array<Record<string, string>>;
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      email: r.email,
      name: r.name,
      role: (isOwnerOrAdminEmail(r.email) ? 'admin' : r.role) as UserRole,
      githubHandle: r.github_handle || '',
      bio: r.bio || '',
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at,
    };
  }

  async updateUserProfile(
    email: string,
    patch: { name?: string; githubHandle?: string; bio?: string },
  ): Promise<UserRecord> {
    const u = await this.upsertUser(email, patch.name, patch.githubHandle);
    const nextName = patch.name !== undefined ? patch.name.trim() || u.name : u.name;
    const nextGh = patch.githubHandle !== undefined ? patch.githubHandle.trim() : u.githubHandle;
    const nextBio = patch.bio !== undefined ? patch.bio.trim() : u.bio;
    await this.sql`
      UPDATE uhuru_tracker_users
      SET name = ${nextName}, github_handle = ${nextGh}, bio = ${nextBio}
      WHERE email = ${u.email}
    `;
    return { ...u, name: nextName, githubHandle: nextGh, bio: nextBio };
  }

  async listUsers(): Promise<UserRecord[]> {
    await this.ensureInitialized();
    const rows = (await this.sql`
      SELECT id, email, name, role, github_handle, bio, created_at, last_seen_at
      FROM uhuru_tracker_users ORDER BY name ASC
    `) as Array<Record<string, string>>;
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: (isOwnerOrAdminEmail(r.email) ? 'admin' : r.role) as UserRole,
      githubHandle: r.github_handle || '',
      bio: r.bio || '',
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at,
    }));
  }

  private mapProject(r: Record<string, string>): ProjectRecord {
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description || '',
      repoUrl: r.repo_url,
      localPath: r.local_path || '',
      cloneCommand: r.clone_command || '',
      setupInstructions: r.setup_instructions || '',
      defaultBranch: r.default_branch || 'main',
      envContent: r.env_content || '',
      envUpdatedAt: r.env_updated_at,
      envUpdatedBy: r.env_updated_by,
      createdAt: r.created_at,
    };
  }

  async listProjects(): Promise<ProjectRecord[]> {
    await this.ensureInitialized();
    const rows = (await this.sql`
      SELECT * FROM uhuru_tracker_projects ORDER BY created_at ASC
    `) as Array<Record<string, string>>;
    return rows.map((r) => this.mapProject(r));
  }

  async getProject(id: string): Promise<ProjectRecord | null> {
    await this.ensureInitialized();
    const rows = (await this.sql`
      SELECT * FROM uhuru_tracker_projects WHERE id = ${id}
    `) as Array<Record<string, string>>;
    return rows[0] ? this.mapProject(rows[0]) : null;
  }

  async upsertProject(
    input: Partial<ProjectRecord> & { name: string; repoUrl: string },
    actorEmail: string,
  ): Promise<ProjectRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const id = input.id || `proj_${nanoid(8)}`;
    const existing = await this.getProject(id);
    const slug =
      input.slug ||
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const record: ProjectRecord = {
      id,
      slug,
      name: input.name.trim(),
      description: input.description?.trim() ?? existing?.description ?? '',
      repoUrl: input.repoUrl.trim(),
      localPath: input.localPath?.trim() ?? existing?.localPath ?? '',
      cloneCommand:
        input.cloneCommand?.trim() ||
        existing?.cloneCommand ||
        `git clone ${input.repoUrl.trim()} && cd ${slug} && npm install`,
      setupInstructions: input.setupInstructions?.trim() ?? existing?.setupInstructions ?? '',
      defaultBranch: input.defaultBranch?.trim() || existing?.defaultBranch || 'main',
      envContent: (input.envContent ?? existing?.envContent ?? '').replace(/\r\n/g, '\n'),
      envUpdatedAt: now,
      envUpdatedBy: actorEmail,
      createdAt: existing?.createdAt || now,
    };
    await this.sql`
      INSERT INTO uhuru_tracker_projects (
        id, slug, name, description, repo_url, local_path, clone_command,
        setup_instructions, default_branch, env_content, env_updated_at, env_updated_by, created_at
      ) VALUES (
        ${record.id}, ${record.slug}, ${record.name}, ${record.description}, ${record.repoUrl},
        ${record.localPath}, ${record.cloneCommand}, ${record.setupInstructions}, ${record.defaultBranch},
        ${record.envContent}, ${record.envUpdatedAt}, ${record.envUpdatedBy}, ${record.createdAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        repo_url = EXCLUDED.repo_url,
        local_path = EXCLUDED.local_path,
        clone_command = EXCLUDED.clone_command,
        setup_instructions = EXCLUDED.setup_instructions,
        default_branch = EXCLUDED.default_branch,
        env_content = EXCLUDED.env_content,
        env_updated_at = EXCLUDED.env_updated_at,
        env_updated_by = EXCLUDED.env_updated_by
    `;
    return record;
  }

  async updateProjectEnv(projectId: string, envContent: string, actorEmail: string): Promise<ProjectRecord> {
    await this.ensureInitialized();
    const existing = await this.getProject(projectId);
    if (!existing) throw new Error('Project not found');
    const cleanEnv = envContent.replace(/\r\n/g, '\n');
    const now = new Date().toISOString();
    await this.sql`
      UPDATE uhuru_tracker_projects
      SET env_content = ${cleanEnv}, env_updated_at = ${now}, env_updated_by = ${actorEmail}
      WHERE id = ${projectId}
    `;
    return { ...existing, envContent: cleanEnv, envUpdatedAt: now, envUpdatedBy: actorEmail };
  }

  async listTasks(filters?: { assigneeEmail?: string; projectId?: string; status?: string }): Promise<TaskRecord[]> {
    await this.ensureInitialized();
    const [taskRows, updateRows, projects, users] = await Promise.all([
      this.sql`SELECT * FROM uhuru_tracker_tasks ORDER BY updated_at DESC`,
      this.sql`SELECT * FROM uhuru_tracker_task_updates ORDER BY created_at ASC`,
      this.listProjects(),
      this.listUsers(),
    ]);

    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const userMap = new Map(users.map((u) => [u.email.toLowerCase(), u]));
    const updatesByTask = new Map<string, TaskUpdateRecord[]>();

    for (const u of updateRows as Array<Record<string, string>>) {
      const list = updatesByTask.get(u.task_id) || [];
      list.push({
        id: u.id,
        taskId: u.task_id,
        authorEmail: u.author_email,
        authorName: u.author_name,
        kind: (u.kind || 'progress') as UpdateKind,
        content: u.content,
        createdAt: u.created_at,
      });
      updatesByTask.set(u.task_id, list);
    }

    let list: TaskRecord[] = (taskRows as Array<Record<string, unknown>>).map((r) => {
      const proj = projectMap.get(String(r.project_id));
      const assigneeEmail = String(r.assignee_email || '').toLowerCase();
      const assignee = userMap.get(assigneeEmail);
      return {
        id: String(r.id),
        projectId: String(r.project_id),
        projectName: proj?.name || 'Workspace',
        repoUrl: proj?.repoUrl || '',
        title: String(r.title),
        description: String(r.description),
        acceptanceCriteria: Array.isArray(r.acceptance_criteria)
          ? (r.acceptance_criteria as string[])
          : [],
        status: (r.status || 'todo') as TaskStatus,
        priority: (r.priority || 'medium') as TaskPriority,
        assigneeEmail,
        assigneeName: assignee?.name || (assigneeEmail ? deriveDisplayName(assigneeEmail) : 'Unassigned'),
        assignedBy: String(r.assigned_by || ''),
        sourceTranscript: r.source_transcript ? String(r.source_transcript) : undefined,
        repoPathHint: String(r.repo_path_hint || 'src/'),
        tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
        updates: updatesByTask.get(String(r.id)) || [],
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      };
    });

    if (filters?.assigneeEmail) {
      const target = filters.assigneeEmail.trim().toLowerCase();
      list = list.filter((t) => t.assigneeEmail === target);
    }
    if (filters?.projectId && filters.projectId !== 'all') {
      list = list.filter((t) => t.projectId === filters.projectId);
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((t) => t.status === filters.status);
    }
    return list;
  }

  async getTask(taskId: string): Promise<TaskRecord | null> {
    const all = await this.listTasks();
    return all.find((t) => t.id === taskId) || null;
  }

  async createTask(input: {
    projectId: string;
    title: string;
    description: string;
    acceptanceCriteria?: string[];
    priority?: TaskPriority;
    assigneeEmail?: string;
    assignedBy: string;
    sourceTranscript?: string;
    repoPathHint?: string;
    tags?: string[];
  }): Promise<TaskRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const id = `tsk_${nanoid(10)}`;
    const cleanAssignee = (input.assigneeEmail || '').trim().toLowerCase();
    if (cleanAssignee) {
      await this.upsertUser(cleanAssignee);
    }
    const criteriaJson = JSON.stringify(input.acceptanceCriteria || []);
    const tagsJson = JSON.stringify(input.tags || []);
    await this.sql`
      INSERT INTO uhuru_tracker_tasks (
        id, project_id, title, description, acceptance_criteria, status, priority,
        assignee_email, assigned_by, source_transcript, repo_path_hint, tags, created_at, updated_at
      ) VALUES (
        ${id},
        ${input.projectId || 'proj_task_tracker'},
        ${input.title.trim()},
        ${input.description.trim()},
        ${criteriaJson}::jsonb,
        'todo',
        ${input.priority || 'medium'},
        ${cleanAssignee},
        ${input.assignedBy},
        ${input.sourceTranscript || null},
        ${input.repoPathHint?.trim() || 'src/'},
        ${tagsJson}::jsonb,
        ${now},
        ${now}
      )
    `;
    const created = await this.getTask(id);
    if (!created) throw new Error('Failed to load created task');
    return created;
  }

  async updateTask(
    taskId: string,
    patch: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeEmail?: string;
      acceptanceCriteria?: string[];
      repoPathHint?: string;
      tags?: string[];
    },
  ): Promise<TaskRecord | null> {
    const existing = await this.getTask(taskId);
    if (!existing) return null;
    const cleanAssignee =
      patch.assigneeEmail !== undefined ? patch.assigneeEmail.trim().toLowerCase() : existing.assigneeEmail;
    if (cleanAssignee) {
      await this.upsertUser(cleanAssignee);
    }
    const nextTitle = patch.title !== undefined ? patch.title.trim() : existing.title;
    const nextDesc = patch.description !== undefined ? patch.description.trim() : existing.description;
    const nextStatus = patch.status ?? existing.status;
    const nextPriority = patch.priority ?? existing.priority;
    const nextCriteria = JSON.stringify(patch.acceptanceCriteria ?? existing.acceptanceCriteria);
    const nextHint = patch.repoPathHint !== undefined ? patch.repoPathHint.trim() : existing.repoPathHint;
    const nextTags = JSON.stringify(patch.tags ?? existing.tags);
    const now = new Date().toISOString();

    await this.sql`
      UPDATE uhuru_tracker_tasks
      SET
        title = ${nextTitle},
        description = ${nextDesc},
        status = ${nextStatus},
        priority = ${nextPriority},
        assignee_email = ${cleanAssignee},
        acceptance_criteria = ${nextCriteria}::jsonb,
        repo_path_hint = ${nextHint},
        tags = ${nextTags}::jsonb,
        updated_at = ${now}
      WHERE id = ${taskId}
    `;
    return this.getTask(taskId);
  }

  async addTaskUpdate(input: {
    taskId: string;
    authorEmail: string;
    authorName: string;
    kind: UpdateKind;
    content: string;
  }): Promise<TaskUpdateRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const id = `upd_${nanoid(10)}`;
    const cleanEmail = input.authorEmail.trim().toLowerCase();
    await this.sql`
      INSERT INTO uhuru_tracker_task_updates (id, task_id, author_email, author_name, kind, content, created_at)
      VALUES (${id}, ${input.taskId}, ${cleanEmail}, ${input.authorName.trim()}, ${input.kind}, ${input.content.trim()}, ${now})
    `;
    await this.sql`
      UPDATE uhuru_tracker_tasks SET updated_at = ${now} WHERE id = ${input.taskId}
    `;
    return {
      id,
      taskId: input.taskId,
      authorEmail: cleanEmail,
      authorName: input.authorName.trim(),
      kind: input.kind,
      content: input.content.trim(),
      createdAt: now,
    };
  }

  async listBugs(filters?: { status?: string; projectId?: string }): Promise<BugReportRecord[]> {
    await this.ensureInitialized();
    const [rows, projects] = await Promise.all([
      this.sql`SELECT * FROM uhuru_tracker_bugs ORDER BY updated_at DESC`,
      this.listProjects(),
    ]);
    const projMap = new Map(projects.map((p) => [p.id, p]));
    let list: BugReportRecord[] = (rows as Array<Record<string, string | null>>).map((r) => {
      const proj = projMap.get(String(r.project_id));
      return {
        id: String(r.id),
        projectId: String(r.project_id),
        projectName: proj?.name || 'Workspace',
        repoUrl: proj?.repoUrl || '',
        localPath: proj?.localPath || '/home/kusi/Desktop/Dev/Uhurued/task-tracker',
        title: String(r.title),
        description: String(r.description),
        severity: (r.severity || 'high') as BugSeverity,
        status: (r.status || 'open') as BugStatus,
        reporterEmail: String(r.reporter_email),
        reporterName: String(r.reporter_name),
        stackTrace: String(r.stack_trace || ''),
        reproSteps: String(r.repro_steps || ''),
        filePaths: String(r.file_paths || ''),
        agentAssigned: String(r.agent_assigned || 'dsh-qwen3.6-heretic'),
        agentFixSummary: String(r.agent_fix_summary || ''),
        agentTestOutput: String(r.agent_test_output || ''),
        agentCommitOrDiff: String(r.agent_commit_or_diff || ''),
        resolvedAt: r.resolved_at ? String(r.resolved_at) : null,
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      };
    });

    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'actionable') {
        list = list.filter((b) => b.status !== 'resolved' && b.status !== 'ignored');
      } else {
        list = list.filter((b) => b.status === filters.status);
      }
    }
    if (filters?.projectId && filters.projectId !== 'all') {
      list = list.filter((b) => b.projectId === filters.projectId);
    }
    return list;
  }

  async getBug(bugId: string): Promise<BugReportRecord | null> {
    const all = await this.listBugs();
    return all.find((b) => b.id === bugId) || null;
  }

  async createBug(input: {
    projectId: string;
    title: string;
    description: string;
    severity?: BugSeverity;
    reporterEmail: string;
    reporterName: string;
    stackTrace?: string;
    reproSteps?: string;
    filePaths?: string;
    agentFixSummary?: string;
  }): Promise<BugReportRecord> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const id = `bug_${nanoid(10)}`;
    await this.sql`
      INSERT INTO uhuru_tracker_bugs (
        id, project_id, title, description, severity, status, reporter_email, reporter_name,
        stack_trace, repro_steps, file_paths, agent_assigned, agent_fix_summary, created_at, updated_at
      ) VALUES (
        ${id},
        ${input.projectId || 'proj_task_tracker'},
        ${input.title.trim()},
        ${input.description.trim()},
        ${input.severity || 'high'},
        'open',
        ${input.reporterEmail.trim().toLowerCase()},
        ${input.reporterName.trim()},
        ${input.stackTrace?.trim() || ''},
        ${input.reproSteps?.trim() || ''},
        ${input.filePaths?.trim() || ''},
        'dsh-qwen3.6-heretic (Port 3080 -> 8083)',
        ${input.agentFixSummary || ''},
        ${now},
        ${now}
      )
    `;
    const created = await this.getBug(id);
    if (!created) throw new Error('Failed to load created bug');
    return created;
  }

  async updateBug(
    bugId: string,
    patch: {
      status?: BugStatus;
      severity?: BugSeverity;
      agentFixSummary?: string;
      agentTestOutput?: string;
      agentCommitOrDiff?: string;
    },
  ): Promise<BugReportRecord | null> {
    const existing = await this.getBug(bugId);
    if (!existing) return null;
    const now = new Date().toISOString();
    const nextStatus = patch.status ?? existing.status;
    const nextSeverity = patch.severity ?? existing.severity;
    const nextSummary = patch.agentFixSummary !== undefined ? patch.agentFixSummary : existing.agentFixSummary;
    const nextTest = patch.agentTestOutput !== undefined ? patch.agentTestOutput : existing.agentTestOutput;
    const nextDiff = patch.agentCommitOrDiff !== undefined ? patch.agentCommitOrDiff : existing.agentCommitOrDiff;
    const nextResolved = nextStatus === 'resolved' ? existing.resolvedAt || now : existing.resolvedAt;

    await this.sql`
      UPDATE uhuru_tracker_bugs
      SET
        status = ${nextStatus},
        severity = ${nextSeverity},
        agent_fix_summary = ${nextSummary},
        agent_test_output = ${nextTest},
        agent_commit_or_diff = ${nextDiff},
        resolved_at = ${nextResolved},
        updated_at = ${now}
      WHERE id = ${bugId}
    `;
    return this.getBug(bugId);
  }
}

let defaultStore: TrackerStore | null = null;

export function getTrackerStore(): TrackerStore {
  if (!defaultStore) {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && dbUrl.startsWith('postgres')) {
      defaultStore = new PostgresTrackerStore(dbUrl);
    } else {
      defaultStore = new MemoryTrackerStore();
    }
  }
  return defaultStore;
}
