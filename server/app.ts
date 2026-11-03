import { createHmac } from 'node:crypto';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  assistTaskWithAi,
  checkLocalModelHealth,
  HERETIC_MODEL_ID,
  synthesizeTasksFromTranscript,
  triageBugAndWakeDsh,
} from './ai.js';
import { createTrackerMailer, DEFAULT_SENDER, type TrackerMailer } from './email.js';
import {
  deriveDisplayName,
  getTrackerStore,
  type BugSeverity,
  type BugStatus,
  type TaskPriority,
  type TaskStatus,
  type TrackerStore,
  type UpdateKind,
  type UserRecord,
} from './store.js';

function getSecretString(): string {
  return process.env.TOKEN_SECRET || 'uhurued-task-tracker-default-jwt-secret-2026-kusi';
}

export async function signSessionToken(user: UserRecord): Promise<string> {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 14 * 24 * 3600,
    }),
  ).toString('base64url');
  const sig = createHmac('sha256', getSecretString()).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<{ email: string; name: string; role: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payloadB64, sig] = parts;
    const expectedSig = createHmac('sha256', getSecretString()).update(`${header}.${payloadB64}`).digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.email) return null;
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return {
      email: String(payload.email),
      name: String(payload.name || payload.email),
      role: String(payload.role || 'engineer'),
    };
  } catch {
    return null;
  }
}

function generateSixDigitCode(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

export function createTrackerApp(options?: { store?: TrackerStore; mailer?: TrackerMailer }) {
  const store = options?.store || getTrackerStore();
  const mailer =
    options?.mailer ||
    createTrackerMailer(
      process.env.RESEND_API_KEY,
      process.env.EMAIL_FROM || DEFAULT_SENDER,
    );

  const app = new Hono();
  app.use('*', cors());

  async function requireAuth(c: { req: { header: (name: string) => string | undefined } }): Promise<UserRecord | null> {
    const opsHeader = c.req.header('x-tracker-ops-key');
    const expectedOps = process.env.TRACKER_OPS_SECRET || 'uhuru-dsh-ops-local';
    if (opsHeader && opsHeader === expectedOps) {
      return store.upsertUser('fkusiapp@oberlin.edu', 'DeepSeek Harness Ops Agent');
    }

    const auth = c.req.header('authorization') || '';
    if (!auth.toLowerCase().startsWith('bearer ')) return null;
    const token = auth.slice(7).trim();
    if (token === expectedOps) {
      return store.upsertUser('fkusiapp@oberlin.edu', 'DeepSeek Harness Ops Agent');
    }
    const verified = await verifySessionToken(token);
    if (!verified) return null;
    return store.upsertUser(verified.email, verified.name);
  }

  app.get('/api/health', async (c) => {
    const aiHealth = await checkLocalModelHealth();
    return c.json({
      ok: true,
      service: 'uhurued-task-tracker',
      domain: 'task.uhurued.com',
      emailSender: DEFAULT_SENDER,
      ai: aiHealth,
    });
  });

  app.post('/api/auth/request-code', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return c.json({ error: 'Enter a valid email address.' }, 400);
    }

    const code = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await store.saveOtp(email, code, expiresAt);

    const delivery = await mailer.sendCode(email, code);
    return c.json({
      ok: true,
      email,
      sender: DEFAULT_SENDER,
      delivered: delivery.delivered,
      previewCode: delivery.previewCode,
    });
  });

  app.post('/api/auth/verify', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    const name = body.name ? String(body.name).trim() : undefined;
    const githubHandle = body.githubHandle ? String(body.githubHandle).trim() : undefined;

    if (!email || !/^\d{6}$/.test(code)) {
      return c.json({ error: 'Enter your email and 6-digit verification code.' }, 400);
    }

    const valid = await store.verifyOtp(email, code);
    if (!valid) {
      return c.json({ error: 'Invalid or expired 6-digit verification code.' }, 401);
    }

    const user = await store.upsertUser(email, name, githubHandle);
    const token = await signSessionToken(user);
    return c.json({ token, user });
  });

  app.get('/api/auth/me', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    return c.json({ user });
  });

  app.patch('/api/auth/profile', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    const updated = await store.updateUserProfile(user.email, {
      name: body.name,
      githubHandle: body.githubHandle,
      bio: body.bio,
    });
    return c.json({ user: updated });
  });

  app.get('/api/workspace', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const [users, projects, tasks, bugs, aiHealth] = await Promise.all([
      store.listUsers(),
      store.listProjects(),
      store.listTasks(),
      store.listBugs(),
      checkLocalModelHealth(),
    ]);

    return c.json({
      user,
      users,
      projects,
      tasks,
      bugs,
      aiHealth,
    });
  });

  app.post('/api/projects', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    if (!body.name || !body.repoUrl) {
      return c.json({ error: 'Project name and GitHub repository URL are required.' }, 400);
    }
    const project = await store.upsertProject(
      {
        id: body.id,
        name: String(body.name),
        description: body.description ? String(body.description) : '',
        repoUrl: String(body.repoUrl),
        localPath: body.localPath ? String(body.localPath) : '',
        cloneCommand: body.cloneCommand ? String(body.cloneCommand) : '',
        setupInstructions: body.setupInstructions ? String(body.setupInstructions) : '',
        defaultBranch: body.defaultBranch ? String(body.defaultBranch) : 'main',
        envContent: body.envContent ? String(body.envContent) : '',
      },
      user.email,
    );
    return c.json({ project });
  });

  app.patch('/api/projects/:id/env', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const projectId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    if (typeof body.envContent !== 'string') {
      return c.json({ error: 'envContent string is required.' }, 400);
    }
    const project = await store.updateProjectEnv(projectId, body.envContent, user.email);
    return c.json({ project });
  });

  app.get('/api/tasks', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const assigneeEmail = c.req.query('assignee');
    const projectId = c.req.query('projectId');
    const status = c.req.query('status');
    const tasks = await store.listTasks({ assigneeEmail, projectId, status });
    return c.json({ tasks });
  });

  app.post('/api/tasks', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    if (!body.title || !String(body.title).trim()) {
      return c.json({ error: 'Task title is required.' }, 400);
    }

    const assigneeEmail = body.assigneeEmail ? String(body.assigneeEmail).trim().toLowerCase() : '';
    const assignedBy = body.assignedBy ? String(body.assignedBy) : user.email;
    const task = await store.createTask({
      projectId: body.projectId || 'proj_task_tracker',
      title: String(body.title),
      description: String(body.description || ''),
      acceptanceCriteria: Array.isArray(body.acceptanceCriteria) ? body.acceptanceCriteria.map(String) : [],
      priority: (body.priority || 'medium') as TaskPriority,
      assigneeEmail,
      assignedBy,
      sourceTranscript: body.sourceTranscript ? String(body.sourceTranscript) : undefined,
      repoPathHint: body.repoPathHint ? String(body.repoPathHint) : 'src/',
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    });

    let emailDelivered = false;
    if (assigneeEmail && assigneeEmail.includes('@')) {
      const proj = await store.getProject(task.projectId);
      const sent = await mailer.sendTaskAssigned({
        toEmail: assigneeEmail,
        assigneeName: deriveDisplayName(assigneeEmail),
        taskTitle: task.title,
        taskDescription: task.description,
        priority: task.priority,
        projectName: proj?.name,
        repoUrl: proj?.repoUrl,
        assignedBy,
      });
      emailDelivered = sent.delivered;
    }

    return c.json({ task, emailDelivered });
  });

  app.patch('/api/tasks/:id', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const taskId = c.req.param('id');
    const prev = await store.getTask(taskId);
    if (!prev) return c.json({ error: 'Task not found' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const updated = await store.updateTask(taskId, {
      title: body.title,
      description: body.description,
      status: body.status as TaskStatus | undefined,
      priority: body.priority as TaskPriority | undefined,
      assigneeEmail: body.assigneeEmail,
      acceptanceCriteria: body.acceptanceCriteria,
      repoPathHint: body.repoPathHint,
      tags: body.tags,
    });
    if (!updated) return c.json({ error: 'Task not found' }, 404);

    let emailDelivered = false;
    if (
      updated.assigneeEmail &&
      updated.assigneeEmail !== prev.assigneeEmail &&
      updated.assigneeEmail.includes('@')
    ) {
      const proj = await store.getProject(updated.projectId);
      const sent = await mailer.sendTaskAssigned({
        toEmail: updated.assigneeEmail,
        assigneeName: updated.assigneeName,
        taskTitle: updated.title,
        taskDescription: updated.description,
        priority: updated.priority,
        projectName: proj?.name,
        repoUrl: proj?.repoUrl,
        assignedBy: user.email,
      });
      emailDelivered = sent.delivered;
    }

    return c.json({ task: updated, emailDelivered });
  });

  app.post('/api/tasks/:id/updates', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const taskId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const content = String(body.content || '').trim();
    if (!content) return c.json({ error: 'Writeup, question, or suggestion cannot be empty.' }, 400);

    const kind = (['progress', 'question', 'suggestion', 'ai_note'].includes(body.kind)
      ? body.kind
      : 'progress') as UpdateKind;

    await store.addTaskUpdate({
      taskId,
      authorEmail: user.email,
      authorName: user.name,
      kind,
      content,
    });
    const task = await store.getTask(taskId);
    return c.json({ task });
  });

  app.post('/api/tasks/:id/ai-assist', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const taskId = c.req.param('id');
    const task = await store.getTask(taskId);
    if (!task) return c.json({ error: 'Task not found' }, 404);

    const body = await c.req.json().catch(() => ({}));
    const prompt =
      String(body.prompt || '').trim() ||
      'Provide a step-by-step technical implementation guide, file pointers, and verification commands for this task.';

    const aiRes = await assistTaskWithAi({
      taskTitle: task.title,
      taskDescription: task.description,
      repoUrl: task.repoUrl,
      questionOrPrompt: prompt,
      authorName: user.name,
    });

    await store.addTaskUpdate({
      taskId,
      authorEmail: 'qwen3.6-heretic@uhurued.com',
      authorName: `Qwen3.6-Heretic (${aiRes.endpointUsed})`,
      kind: 'ai_note',
      content: aiRes.reply,
    });

    const updatedTask = await store.getTask(taskId);
    return c.json({ task: updatedTask, model: aiRes.model, endpointUsed: aiRes.endpointUsed });
  });

  app.post('/api/ai/transcript-to-tasks', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    const transcript = String(body.transcript || '').trim();
    if (!transcript) {
      return c.json({ error: 'Paste a transcript or rough task notes first.' }, 400);
    }

    const projectId = String(body.projectId || 'proj_task_tracker');
    const defaultAssigneeEmail = body.assigneeEmail ? String(body.assigneeEmail).trim().toLowerCase() : '';
    const autoCreate = Boolean(body.autoCreate);

    const [proj, engineers] = await Promise.all([
      store.getProject(projectId),
      store.listUsers(),
    ]);

    const result = await synthesizeTasksFromTranscript({
      transcript,
      projectName: proj?.name || 'Uhurued Workspace',
      repoUrl: proj?.repoUrl,
      engineers: engineers.map((e) => ({ email: e.email, name: e.name })),
      defaultAssigneeEmail: defaultAssigneeEmail || undefined,
    });

    const createdTasks = [];
    if (autoCreate) {
      for (const draft of result.tasks) {
        const targetAssignee = (draft.suggestedAssigneeEmail || defaultAssigneeEmail || '').trim().toLowerCase();
        const created = await store.createTask({
          projectId,
          title: draft.title,
          description: draft.description,
          acceptanceCriteria: draft.acceptanceCriteria,
          priority: draft.priority,
          assigneeEmail: targetAssignee,
          assignedBy: `${HERETIC_MODEL_ID} (via ${user.name})`,
          sourceTranscript: transcript,
          repoPathHint: draft.repoPathHint,
          tags: draft.tags,
        });
        if (targetAssignee && targetAssignee.includes('@')) {
          await mailer.sendTaskAssigned({
            toEmail: targetAssignee,
            assigneeName: deriveDisplayName(targetAssignee),
            taskTitle: created.title,
            taskDescription: created.description,
            priority: created.priority,
            projectName: proj?.name,
            repoUrl: proj?.repoUrl,
            assignedBy: `${HERETIC_MODEL_ID} (${user.email})`,
          });
        }
        createdTasks.push(created);
      }
    }

    return c.json({
      drafts: result.tasks,
      createdTasks,
      model: result.model,
      endpointUsed: result.endpointUsed,
    });
  });

  app.get('/api/bugs', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const status = c.req.query('status');
    const projectId = c.req.query('projectId');
    const bugs = await store.listBugs({ status, projectId });
    return c.json({ bugs });
  });

  app.get('/api/bugs/:id', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const bug = await store.getBug(c.req.param('id'));
    if (!bug) return c.json({ error: 'Bug not found' }, 404);
    return c.json({ bug });
  });

  app.post('/api/bugs', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    if (!body.title || !String(body.title).trim()) {
      return c.json({ error: 'Bug title is required.' }, 400);
    }

    const projectId = String(body.projectId || 'proj_task_tracker');
    const proj = await store.getProject(projectId);
    const created = await store.createBug({
      projectId,
      title: String(body.title),
      description: String(body.description || ''),
      severity: (body.severity || 'high') as BugSeverity,
      reporterEmail: user.email,
      reporterName: user.name,
      stackTrace: body.stackTrace ? String(body.stackTrace) : '',
      reproSteps: body.reproSteps ? String(body.reproSteps) : '',
      filePaths: body.filePaths ? String(body.filePaths) : '',
    });

    const triage = await triageBugAndWakeDsh({
      bugId: created.id,
      title: created.title,
      description: created.description,
      severity: created.severity,
      stackTrace: created.stackTrace,
      reproSteps: created.reproSteps,
      filePaths: created.filePaths,
      projectName: proj?.name,
      repoUrl: proj?.repoUrl,
    });

    const updated = await store.updateBug(created.id, {
      status: 'triaging',
      agentFixSummary: triage.triageSummary,
    });

    return c.json({
      bug: updated || created,
      dshWoken: triage.dshWoken,
      model: triage.model,
      endpointUsed: triage.endpointUsed,
    });
  });

  app.patch('/api/bugs/:id', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const bugId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const updated = await store.updateBug(bugId, {
      status: body.status as BugStatus | undefined,
      severity: body.severity as BugSeverity | undefined,
      agentFixSummary: body.agentFixSummary,
      agentTestOutput: body.agentTestOutput,
      agentCommitOrDiff: body.agentCommitOrDiff,
    });
    if (!updated) return c.json({ error: 'Bug not found' }, 404);
    return c.json({ bug: updated });
  });

  app.post('/api/bugs/:id/dispatch-dsh', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const bugId = c.req.param('id');
    const bug = await store.getBug(bugId);
    if (!bug) return c.json({ error: 'Bug not found' }, 404);

    const triage = await triageBugAndWakeDsh({
      bugId: bug.id,
      title: bug.title,
      description: bug.description,
      severity: bug.severity,
      stackTrace: bug.stackTrace,
      reproSteps: bug.reproSteps,
      filePaths: bug.filePaths,
      projectName: bug.projectName,
      repoUrl: bug.repoUrl,
    });

    const updated = await store.updateBug(bug.id, {
      status: bug.status === 'resolved' ? 'resolved' : 'fixing',
      agentFixSummary: triage.triageSummary,
    });

    return c.json({
      bug: updated,
      dshWoken: triage.dshWoken,
      model: triage.model,
      endpointUsed: triage.endpointUsed,
    });
  });

  app.post('/api/team/invite', async (c) => {
    const user = await requireAuth(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const name = body.name ? String(body.name).trim() : undefined;
    const githubHandle = body.githubHandle ? String(body.githubHandle).trim() : undefined;
    if (!email || !email.includes('@')) {
      return c.json({ error: 'Enter a valid engineer email address.' }, 400);
    }

    const member = await store.upsertUser(email, name, githubHandle);
    return c.json({ member });
  });

  return app;
}
