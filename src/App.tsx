import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Bug,
  Check,
  Code2,
  Copy,
  Cpu,
  Download,
  Eye,
  EyeOff,
  FileText,
  FolderGit2,
  GitBranch,
  KeyRound,
  LoaderCircle,
  LogOut,
  Mail,
  MessageSquarePlus,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Sun,
  Terminal,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import {
  TrackerApiClient,
  type AiHealth,
  type BugReportItem,
  type BugSeverity,
  type BugStatus,
  type ProjectItem,
  type SynthesizedTaskDraft,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
  type UpdateKind,
  type UserAccount,
} from './api';

type SectionId = 'my-space' | 'tasks' | 'transcript-studio' | 'repos-env' | 'bugs' | 'team';

const defaultApi = new TrackerApiClient('/api');

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    blocked: 'Blocked',
    done: 'Done',
    open: 'Open',
    triaging: 'AI Triaging',
    fixing: 'DSH Fixing',
    testing: 'Running Tests',
    resolved: 'Resolved',
    ignored: 'Ignored',
  };
  return map[status] || status;
}

function maskEnvContent(raw: string): string {
  return raw
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return line;
      const idx = line.indexOf('=');
      const key = line.slice(0, idx);
      return `${key}=••••••••••••••••`;
    })
    .join('\n');
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="Uhurued Task Tracker home">
      <b>uhuru</b>
      <span>
        tracker<b>.</b>
      </span>
    </a>
  );
}

export function App({ api = defaultApi }: { api?: TrackerApiClient }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [bugs, setBugs] = useState<BugReportItem[]>([]);
  const [aiHealth, setAiHealth] = useState<AiHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(() => api.hasSession());
  const [notice, setNotice] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = window.localStorage.getItem('uhurued_tracker_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem('uhurued_tracker_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  async function refreshWorkspace() {
    try {
      const data = await api.loadWorkspace();
      setUser(data.user);
      setUsers(data.users);
      setProjects(data.projects);
      setTasks(data.tasks);
      setBugs(data.bugs);
      setAiHealth(data.aiHealth);
    } catch (err) {
      api.setToken(null);
      setUser(null);
      setNotice(err instanceof Error ? err.message : 'Your session expired. Sign in again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!api.hasSession()) {
      setLoading(false);
      return;
    }
    refreshWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  function handleSignOut() {
    api.setToken(null);
    setUser(null);
    setNotice('');
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-group">
          <Brand />
          <span className="model-pill" title={aiHealth?.activeEndpoint || 'Local Qwen3.6-Heretic (Port 8083)'}>
            <span
              className="status-dot"
              style={{ color: aiHealth?.online !== false ? 'var(--green)' : 'var(--amber)' }}
            />
            <Cpu size={14} />
            <span>Qwen3.6-Heretic (8083)</span>
          </span>
        </div>
        <div className="top-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            aria-label="Toggle color theme"
            title="Toggle light/dark theme"
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          {user && (
            <>
              <div className="reviewer">
                <span className="badge status-in_progress">{user.role === 'admin' ? 'Admin' : 'Engineer'}</span>
                <span>{user.name}</span>
              </div>
              <button
                type="button"
                className="icon-button"
                title="Sign out"
                aria-label="Sign out"
                onClick={handleSignOut}
              >
                <LogOut size={17} />
              </button>
            </>
          )}
        </div>
      </header>

      {loading ? (
        <main className="login-main" aria-busy="true">
          <LoaderCircle className="spin" size={24} aria-label="Loading workspace" />
        </main>
      ) : user ? (
        <WorkspaceView
          api={api}
          user={user}
          users={users}
          projects={projects}
          tasks={tasks}
          bugs={bugs}
          aiHealth={aiHealth}
          onRefresh={refreshWorkspace}
          onTasksChange={setTasks}
          onProjectsChange={setProjects}
          onBugsChange={setBugs}
          onUsersChange={setUsers}
          onUserChange={setUser}
        />
      ) : (
        <LoginView
          api={api}
          notice={notice}
          onAuthenticated={() => {
            setLoading(true);
            refreshWorkspace();
          }}
        />
      )}

      <footer className="footer">
        <span>Uhurued Engineering Tracker · task.uhurued.com</span>
        <span className="mono">
          Outbound Mail: tracker@uhurued.com · Local AI: qwen3.6-35b-a3b-heretic (Port 8083 &amp; DSH 3080)
        </span>
      </footer>
    </div>
  );
}

function LoginView({
  api,
  notice,
  onAuthenticated,
}: {
  api: TrackerApiClient;
  notice: string;
  onAuthenticated: () => void;
}) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [githubHandle, setGithubHandle] = useState('');
  const [code, setCode] = useState('');
  const [previewCode, setPreviewCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function requestCode() {
    setError('');
    setPending(true);
    try {
      const res = await api.requestCode(email.trim().toLowerCase());
      setPreviewCode(res.previewCode || '');
      if (res.previewCode) {
        setCode(res.previewCode);
      }
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send verification code.');
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (step === 'email') {
      await requestCode();
      return;
    }
    setError('');
    setPending(true);
    try {
      await api.verifyCode({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        name: name.trim() || undefined,
        githubHandle: githubHandle.trim() || undefined,
      });
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-main">
      <section className="login-panel" aria-labelledby="login-heading">
        <h1 id="login-heading">{step === 'email' ? 'Engineering Workspace Sign-In' : 'Check your inbox'}</h1>
        <p>
          {step === 'email'
            ? 'Sign up or sign in with your email. We send a 6-digit login code from tracker@uhurued.com.'
            : `Enter the 6-digit code sent from tracker@uhurued.com to ${email}.`}
        </p>

        {(error || notice) && (
          <div className="notice" role="alert">
            <AlertTriangle size={16} />
            <span>{error || notice}</span>
          </div>
        )}

        {step === 'code' && previewCode && (
          <div className="success" role="status">
            <Check size={16} />
            <span>
              Local dev code preview: <strong className="mono">{previewCode}</strong>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {step === 'email' ? (
            <>
              <div>
                <label htmlFor="login-email">Work or university email</label>
                <div className="input-icon">
                  <Mail size={18} />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="engineer@uhurued.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={pending}
                  />
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <label htmlFor="login-name">Your name (new sign-ups)</label>
                  <input
                    id="login-name"
                    type="text"
                    placeholder="Ada Lovelace"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={pending}
                  />
                </div>
                <div>
                  <label htmlFor="login-github">GitHub username (optional)</label>
                  <input
                    id="login-github"
                    type="text"
                    placeholder="2024frank"
                    value={githubHandle}
                    onChange={(e) => setGithubHandle(e.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="login-code">6-digit verification code</label>
              <input
                id="login-code"
                className="code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                disabled={pending}
              />
            </div>
          )}

          <button
            type="submit"
            className="primary login-submit"
            disabled={pending || (step === 'code' && code.length !== 6)}
          >
            {pending ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <>
                <span>{step === 'email' ? 'Email a 6-digit sign-in code' : 'Enter Engineering Space'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {step === 'code' ? (
          <div className="login-links">
            <button
              type="button"
              className="text-button"
              disabled={pending}
              onClick={() => {
                setStep('email');
                setCode('');
                setError('');
              }}
            >
              Change email address
            </button>
            <button type="button" className="text-button" disabled={pending} onClick={requestCode}>
              Resend code from tracker@uhurued.com
            </button>
          </div>
        ) : (
          <p className="login-policy">
            Connected to local uncensored Qwen3.6-Heretic (Port 8083) and DeepSeek Harness (Port 3080) for transcript synthesis and autonomous bug resolution.
          </p>
        )}
      </section>
    </main>
  );
}

function WorkspaceView({
  api,
  user,
  users,
  projects,
  tasks,
  bugs,
  aiHealth,
  onRefresh,
  onTasksChange,
  onProjectsChange,
  onBugsChange,
  onUsersChange,
  onUserChange,
}: {
  api: TrackerApiClient;
  user: UserAccount;
  users: UserAccount[];
  projects: ProjectItem[];
  tasks: TaskItem[];
  bugs: BugReportItem[];
  aiHealth: AiHealth | null;
  onRefresh: () => Promise<void>;
  onTasksChange: (tasks: TaskItem[]) => void;
  onProjectsChange: (projects: ProjectItem[]) => void;
  onBugsChange: (bugs: BugReportItem[]) => void;
  onUsersChange: (users: UserAccount[]) => void;
  onUserChange: (user: UserAccount) => void;
}) {
  const [section, setSection] = useState<SectionId>('my-space');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedBugId, setSelectedBugId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const myTasks = tasks.filter(
    (t) => t.assigneeEmail.toLowerCase() === user.email.toLowerCase(),
  );
  const openBugsCount = bugs.filter((b) => b.status !== 'resolved' && b.status !== 'ignored').length;

  function openTask(id: string) {
    setSelectedTaskId(id);
  }

  function replaceTaskInList(updated: TaskItem) {
    const exists = tasks.some((t) => t.id === updated.id);
    if (exists) {
      onTasksChange(tasks.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      onTasksChange([updated, ...tasks]);
    }
  }

  function replaceBugInList(updated: BugReportItem) {
    const exists = bugs.some((b) => b.id === updated.id);
    if (exists) {
      onBugsChange(bugs.map((b) => (b.id === updated.id ? updated : b)));
    } else {
      onBugsChange([updated, ...bugs]);
    }
  }

  const navItems: Array<{ id: SectionId; label: string; count?: number }> = [
    { id: 'my-space', label: 'My Space', count: myTasks.length },
    { id: 'tasks', label: 'All Tasks', count: tasks.length },
    { id: 'transcript-studio', label: 'AI Transcript Studio' },
    { id: 'repos-env', label: 'Repos & .env Vault', count: projects.length },
    { id: 'bugs', label: 'Bug Reports & Auto-Fix', count: openBugsCount },
    { id: 'team', label: 'Team', count: users.length },
  ];

  const activeTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) || null : null;
  const activeBug = selectedBugId ? bugs.find((b) => b.id === selectedBugId) || null : null;

  return (
    <>
      <nav className="section-nav" aria-label="Workspace sections">
        <div>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={section === item.id ? 'page' : undefined}
              onClick={() => {
                setSection(item.id);
                setSelectedTaskId(null);
                setSelectedBugId(null);
              }}
            >
              <span>{item.label}</span>
              {item.count !== undefined && <span className="tab-count">{item.count}</span>}
            </button>
          ))}
        </div>
      </nav>

      <main className="workspace">
        {toast && (
          <div className="success" role="status">
            <Check size={16} />
            <span>{toast}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Dismiss message"
              onClick={() => setToast('')}
              style={{ marginLeft: 'auto', width: 28, height: 28 }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {activeTask ? (
          <TaskDetailView
            api={api}
            task={activeTask}
            users={users}
            projects={projects}
            onBack={() => setSelectedTaskId(null)}
            onTaskUpdated={(updated, msg) => {
              replaceTaskInList(updated);
              if (msg) setToast(msg);
            }}
          />
        ) : activeBug ? (
          <BugDetailView
            api={api}
            bug={activeBug}
            onBack={() => setSelectedBugId(null)}
            onBugUpdated={(updated, msg) => {
              replaceBugInList(updated);
              if (msg) setToast(msg);
            }}
          />
        ) : section === 'my-space' ? (
          <MySpaceSection
            user={user}
            myTasks={myTasks}
            allTasks={tasks}
            projects={projects}
            aiHealth={aiHealth}
            onOpenTask={openTask}
            onNavigate={setSection}
            onRefresh={onRefresh}
            onToast={setToast}
          />
        ) : section === 'tasks' ? (
          <TasksSection
            api={api}
            tasks={tasks}
            users={users}
            projects={projects}
            onOpenTask={openTask}
            onTaskCreated={(created, emailed) => {
              replaceTaskInList(created);
              setToast(
                emailed
                  ? `Task created and emailed to ${created.assigneeEmail} from tracker@uhurued.com.`
                  : `Task "${created.title}" created.`,
              );
            }}
          />
        ) : section === 'transcript-studio' ? (
          <TranscriptStudioSection
            api={api}
            projects={projects}
            users={users}
            aiHealth={aiHealth}
            onTasksCreated={(newTasks) => {
              onTasksChange([...newTasks, ...tasks]);
              setToast(`Created and assigned ${newTasks.length} task(s) via Qwen3.6-Heretic.`);
            }}
            onOpenTask={openTask}
          />
        ) : section === 'repos-env' ? (
          <ReposAndEnvSection
            api={api}
            projects={projects}
            onProjectUpdated={(updated, msg) => {
              const exists = projects.some((p) => p.id === updated.id);
              onProjectsChange(
                exists ? projects.map((p) => (p.id === updated.id ? updated : p)) : [...projects, updated],
              );
              setToast(msg);
            }}
          />
        ) : section === 'bugs' ? (
          <BugsSection
            api={api}
            bugs={bugs}
            projects={projects}
            aiHealth={aiHealth}
            onOpenBug={(id) => setSelectedBugId(id)}
            onBugCreated={(created, dshWoken) => {
              replaceBugInList(created);
              setToast(
                dshWoken
                  ? `Bug report triaged by Qwen3.6-Heretic and dispatched to DeepSeek Harness (Port 3080).`
                  : `Bug report "${created.title}" filed and triaged by Qwen3.6-Heretic.`,
              );
            }}
          />
        ) : (
          <TeamSection
            api={api}
            user={user}
            users={users}
            tasks={tasks}
            onUserAdded={(member) => {
              const exists = users.some((u) => u.email === member.email);
              onUsersChange(exists ? users.map((u) => (u.email === member.email ? member : u)) : [...users, member]);
              setToast(`Added ${member.name} (${member.email}) to the workspace.`);
            }}
            onProfileUpdated={(updated) => {
              onUserChange(updated);
              onUsersChange(users.map((u) => (u.email === updated.email ? updated : u)));
              setToast('Your engineering profile has been updated.');
            }}
          />
        )}
      </main>
    </>
  );
}

function MySpaceSection({
  user,
  myTasks,
  allTasks,
  projects,
  aiHealth,
  onOpenTask,
  onNavigate,
  onRefresh,
  onToast,
}: {
  user: UserAccount;
  myTasks: TaskItem[];
  allTasks: TaskItem[];
  projects: ProjectItem[];
  aiHealth: AiHealth | null;
  onOpenTask: (id: string) => void;
  onNavigate: (s: SectionId) => void;
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const visibleTasks =
    statusFilter === 'all' ? myTasks : myTasks.filter((t) => t.status === statusFilter);

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      onToast(`Copied ${label} to clipboard.`);
    } catch {
      onToast(`Could not copy ${label}.`);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{user.name}&rsquo;s Engineering Space</h1>
          <p>
            Tasks assigned to <strong className="mono">{user.email}</strong> by Kusi or the local{' '}
            <strong className="mono">qwen3.6-35b-a3b-heretic</strong> model, plus one-click repo clone and shared{' '}
            <code className="mono">.env</code> access.
          </p>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => onNavigate('transcript-studio')}
          >
            <Sparkles size={15} />
            <span>Transcript to Tasks (AI)</span>
          </button>
          <button
            type="button"
            className="secondary"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              await onRefresh();
              setRefreshing(false);
            }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="workspace-strip">
        <div>
          <strong>Assigned to you: {myTasks.length}</strong>
          <span className="muted">Workspace total: {allTasks.length} tasks</span>
          <span className="muted">
            Local AI: <code className="mono">{aiHealth?.model || 'qwen3.6-35b-a3b-heretic'}</code> (
            {aiHealth?.activeEndpoint || '127.0.0.1:8083'})
          </span>
        </div>
        <button type="button" className="text-button" onClick={() => onNavigate('repos-env')}>
          Open full .env Vault &amp; GitHub onboarding
        </button>
      </div>

      <div className="status-tabs" role="tablist" aria-label="Filter assigned tasks">
        {(['all', 'todo', 'in_progress', 'in_review', 'blocked', 'done'] as const).map((st) => (
          <button
            key={st}
            type="button"
            role="tab"
            aria-selected={statusFilter === st}
            onClick={() => setStatusFilter(st)}
          >
            <span>{st === 'all' ? 'All Assigned' : statusLabel(st)}</span>
            <span className="tab-count">
              {st === 'all' ? myTasks.length : myTasks.filter((t) => t.status === st).length}
            </span>
          </button>
        ))}
      </div>

      <section className="queue-section" aria-label="Your assigned tasks">
        {visibleTasks.length === 0 ? (
          <div className="empty">
            <FileText size={22} className="muted" />
            <h2>No tasks in this view</h2>
            <p className="muted">
              Switch tabs, view all workspace tasks, or paste a meeting transcript to generate new tasks with Qwen3.6-Heretic.
            </p>
            <div className="heading-actions" style={{ marginTop: 8 }}>
              <button type="button" className="primary" onClick={() => onNavigate('transcript-studio')}>
                <Sparkles size={15} />
                <span>Generate Tasks from Transcript</span>
              </button>
              <button type="button" className="secondary" onClick={() => onNavigate('tasks')}>
                <span>Browse All Workspace Tasks</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Task &amp; Specification</th>
                  <th>Repository</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Updates</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {visibleTasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <button type="button" className="task-row-btn" onClick={() => onOpenTask(t.id)}>
                        <strong>{t.title}</strong>
                        <span>{t.description.replace(/#+\s*/g, '')}</span>
                      </button>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 12 }}>
                        {t.projectName}
                      </span>
                    </td>
                    <td>
                      <span className={`badge status-${t.priority}`}>{t.priority.toUpperCase()}</span>
                    </td>
                    <td>
                      <span className={`badge status-${t.status}`}>
                        <span className="status-dot" />
                        {statusLabel(t.status)}
                      </span>
                    </td>
                    <td className="mono">{t.updates.length} writeups/notes</td>
                    <td className="mono muted">{formatDate(t.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel" style={{ marginTop: 24 }}>
        <div className="panel-header">
          <h2>Quick Repository Clone &amp; .env Access</h2>
          <button type="button" className="text-button" onClick={() => onNavigate('repos-env')}>
            Manage all repositories &amp; .env files
          </button>
        </div>
        <div className="grid-2">
          {projects.slice(0, 2).map((proj) => (
            <div
              key={proj.id}
              style={{
                border: '1px solid var(--line)',
                borderRadius: 6,
                padding: 14,
                background: 'var(--bg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong>{proj.name}</strong>
                <a
                  href={proj.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-button"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <span>GitHub</span>
                  <ArrowUpRight size={14} />
                </a>
              </div>
              <pre className="code-block" style={{ marginTop: 10 }}>
                {proj.cloneCommand}
              </pre>
              <div className="heading-actions" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => copyText(proj.cloneCommand, `${proj.slug} clone command`)}
                >
                  <Copy size={14} />
                  <span>Copy git clone</span>
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => copyText(proj.envContent, `${proj.slug} .env file`)}
                >
                  <KeyRound size={14} />
                  <span>Copy shared .env</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function TasksSection({
  api,
  tasks,
  users,
  projects,
  onOpenTask,
  onTaskCreated,
}: {
  api: TrackerApiClient;
  tasks: TaskItem[];
  users: UserAccount[];
  projects: ProjectItem[];
  onOpenTask: (id: string) => void;
  onTaskCreated: (task: TaskItem, emailed: boolean) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || 'proj_task_tracker');
  const [assigneeEmail, setAssigneeEmail] = useState(users[0]?.email || '');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [repoPathHint, setRepoPathHint] = useState('src/');
  const [description, setDescription] = useState('');
  const [criteriaText, setCriteriaText] = useState(
    'Implementation verified locally with unit tests.\nProgress writeup posted on task thread.',
  );
  const [submitting, setSubmitting] = useState(false);

  const filtered = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (projectFilter !== 'all' && t.projectId !== projectFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assigneeEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.createTask({
        projectId,
        title: title.trim(),
        description: description.trim(),
        priority,
        assigneeEmail: assigneeEmail.trim().toLowerCase(),
        repoPathHint: repoPathHint.trim() || 'src/',
        acceptanceCriteria: criteriaText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      });
      onTaskCreated(res.task, res.emailDelivered);
      setTitle('');
      setDescription('');
      setShowCreate(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Collaborative Engineering Tasks</h1>
          <p>
            Assign tasks to any software engineer. Assigning emails the engineer from{' '}
            <code className="mono">tracker@uhurued.com</code> and opens a collaborative thread for progress writeups, questions, and suggestions.
          </p>
        </div>
        <div className="heading-actions">
          <button type="button" className="primary" onClick={() => setShowCreate((v) => !v)}>
            <Plus size={16} />
            <span>{showCreate ? 'Close Task Form' : 'New Engineering Task'}</span>
          </button>
        </div>
      </div>

      {showCreate && (
        <section className="panel" aria-label="Create and assign task">
          <div className="panel-header">
            <h2>Assign New Engineering Task</h2>
            <span className="muted mono">Notifies assignee via tracker@uhurued.com</span>
          </div>
          <form className="form-stack" onSubmit={handleCreate}>
            <div className="grid-2">
              <div>
                <label htmlFor="new-task-title">Task title</label>
                <input
                  id="new-task-title"
                  type="text"
                  placeholder="Implement WebSocket reconnect handler in client"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="new-task-project">Repository / Project</label>
                <select
                  id="new-task-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label htmlFor="new-task-assignee">Assign to engineer email (or pick team member)</label>
                <input
                  id="new-task-assignee"
                  type="email"
                  list="team-emails-list"
                  placeholder="engineer@uhurued.com"
                  value={assigneeEmail}
                  onChange={(e) => setAssigneeEmail(e.target.value)}
                />
                <datalist id="team-emails-list">
                  {users.map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.name}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="grid-2">
                <div>
                  <label htmlFor="new-task-priority">Priority</label>
                  <select
                    id="new-task-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="new-task-path">Repo file / path hint</label>
                  <input
                    id="new-task-path"
                    type="text"
                    value={repoPathHint}
                    onChange={(e) => setRepoPathHint(e.target.value)}
                    placeholder="src/App.tsx"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="new-task-desc">Detailed technical specification</label>
              <textarea
                id="new-task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe architecture context, files to modify, and expected behavior..."
                required
              />
            </div>

            <div>
              <label htmlFor="new-task-criteria">Acceptance criteria (one per line)</label>
              <textarea
                id="new-task-criteria"
                value={criteriaText}
                onChange={(e) => setCriteriaText(e.target.value)}
                style={{ minHeight: 80 }}
              />
            </div>

            <div className="heading-actions">
              <button type="submit" className="primary" disabled={submitting}>
                {submitting ? <LoaderCircle className="spin" size={16} /> : <Send size={15} />}
                <span>Create &amp; Email Assignee (tracker@uhurued.com)</span>
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="status-tabs" role="tablist" aria-label="Task status filter">
        {(['all', 'todo', 'in_progress', 'in_review', 'blocked', 'done'] as const).map((st) => (
          <button
            key={st}
            type="button"
            role="tab"
            aria-selected={statusFilter === st}
            onClick={() => setStatusFilter(st)}
          >
            <span>{st === 'all' ? 'All Tasks' : statusLabel(st)}</span>
            <span className="tab-count">
              {st === 'all' ? tasks.length : tasks.filter((t) => t.status === st).length}
            </span>
          </button>
        ))}
      </div>

      <section className="queue-section">
        <div className="queue-toolbar">
          <div className="search-box">
            <Search size={16} className="muted" />
            <input
              type="search"
              placeholder="Search tasks, specs, or assignee email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search tasks"
            />
          </div>
          <div className="filter-row">
            <select
              aria-label="Filter by repository"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">All Repositories</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Repository</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Writeups / Q&amp;A</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <button type="button" className="task-row-btn" onClick={() => onOpenTask(t.id)}>
                      <strong>{t.title}</strong>
                      <span>{t.description.replace(/#+\s*/g, '')}</span>
                    </button>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {t.projectName}
                  </td>
                  <td>
                    <div>
                      <strong>{t.assigneeName || 'Unassigned'}</strong>
                      {t.assigneeEmail && (
                        <div className="muted mono" style={{ fontSize: 11 }}>
                          {t.assigneeEmail}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge status-${t.priority}`}>{t.priority.toUpperCase()}</span>
                  </td>
                  <td>
                    <span className={`badge status-${t.status}`}>
                      <span className="status-dot" />
                      {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className="mono">{t.updates.length} entries</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function TaskDetailView({
  api,
  task,
  users,
  projects,
  onBack,
  onTaskUpdated,
}: {
  api: TrackerApiClient;
  task: TaskItem;
  users: UserAccount[];
  projects: ProjectItem[];
  onBack: () => void;
  onTaskUpdated: (task: TaskItem, message?: string) => void;
}) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeEmail, setAssigneeEmail] = useState(task.assigneeEmail);
  const [savingMeta, setSavingMeta] = useState(false);

  const [updateKind, setUpdateKind] = useState<UpdateKind>('progress');
  const [updateContent, setUpdateContent] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [askingAi, setAskingAi] = useState(false);

  const project = projects.find((p) => p.id === task.projectId);

  async function handleSaveMeta(e: FormEvent) {
    e.preventDefault();
    setSavingMeta(true);
    try {
      const res = await api.updateTask(task.id, {
        status,
        priority,
        assigneeEmail: assigneeEmail.trim().toLowerCase(),
      });
      onTaskUpdated(
        res.task,
        res.emailDelivered
          ? `Task updated and assignment email sent from tracker@uhurued.com to ${res.task.assigneeEmail}.`
          : 'Task status and assignment updated.',
      );
    } finally {
      setSavingMeta(false);
    }
  }

  async function handlePostUpdate(e: FormEvent) {
    e.preventDefault();
    if (!updateContent.trim() || postingUpdate) return;
    setPostingUpdate(true);
    try {
      const res = await api.postTaskUpdate(task.id, updateKind, updateContent.trim());
      setUpdateContent('');
      onTaskUpdated(res.task, `Posted ${updateKind} writeup to task thread.`);
    } finally {
      setPostingUpdate(false);
    }
  }

  async function handleAskAi() {
    if (askingAi) return;
    setAskingAi(true);
    try {
      const res = await api.askAiOnTask(
        task.id,
        aiPrompt.trim() ||
          'Provide concrete code changes, file paths, and verification commands for this task.',
      );
      setAiPrompt('');
      onTaskUpdated(res.task, `Local ${res.model} (${res.endpointUsed}) posted guidance.`);
    } finally {
      setAskingAi(false);
    }
  }

  return (
    <div className="review-page">
      <button type="button" className="text-button" onClick={onBack} style={{ marginBottom: 14 }}>
        <ArrowLeft size={15} />
        <span>Back to tasks</span>
      </button>

      <div className="page-heading">
        <div>
          <h1>{task.title}</h1>
          <p className="mono">
            Repository: {task.projectName} · Path hint: {task.repoPathHint} · Assigned by: {task.assignedBy}
          </p>
        </div>
        <div className="heading-actions">
          <span className={`badge status-${task.priority}`}>{task.priority.toUpperCase()}</span>
          <span className={`badge status-${task.status}`}>
            <span className="status-dot" />
            {statusLabel(task.status)}
          </span>
        </div>
      </div>

      <div className="review-grid">
        <div className="evidence-column">
          <section className="evidence-section">
            <h2>
              <FileText size={17} />
              <span>Detailed Technical Specification</span>
            </h2>
            <div className="spec-box">{task.description}</div>
          </section>

          {task.acceptanceCriteria.length > 0 && (
            <section className="evidence-section">
              <h2>
                <Check size={17} />
                <span>Acceptance Criteria</span>
              </h2>
              <ul className="criteria-list">
                {task.acceptanceCriteria.map((item, idx) => (
                  <li key={idx}>
                    <Check size={15} style={{ color: 'var(--green)', marginTop: 2 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {project && (
            <section className="evidence-section">
              <h2>
                <FolderGit2 size={17} />
                <span>Repository Clone &amp; Onboarding</span>
              </h2>
              <p className="muted" style={{ fontSize: 13 }}>
                GitHub:{' '}
                <a href={project.repoUrl} target="_blank" rel="noreferrer" className="text-button">
                  {project.repoUrl}
                </a>
              </p>
              <pre className="code-block">{project.cloneCommand}</pre>
            </section>
          )}

          <section className="evidence-section">
            <h2>
              <MessageSquarePlus size={17} />
              <span>Engineer Progress Writeups, Questions &amp; Suggestions ({task.updates.length})</span>
            </h2>

            {task.updates.length === 0 ? (
              <p className="muted" style={{ marginBottom: 14 }}>
                No writeups or questions yet. Share your progress writeup, ask a question, or propose a suggestion below.
              </p>
            ) : (
              <ul className="messages" style={{ marginBottom: 18 }}>
                {task.updates.map((u) => (
                  <li key={u.id}>
                    <div>
                      <strong>{u.authorName}</strong>
                      <span
                        className={`badge ${
                          u.kind === 'ai_note'
                            ? 'status-in_progress'
                            : u.kind === 'question'
                              ? 'status-open'
                              : u.kind === 'suggestion'
                                ? 'status-in_review'
                                : 'status-done'
                        }`}
                      >
                        {u.kind === 'progress'
                          ? 'Progress Writeup'
                          : u.kind === 'question'
                            ? 'Question'
                            : u.kind === 'suggestion'
                              ? 'Suggestion'
                              : 'Qwen3.6-Heretic AI'}
                      </span>
                      <time className="mono muted" style={{ fontSize: 11 }}>
                        {formatDate(u.createdAt)}
                      </time>
                    </div>
                    <p>{u.content}</p>
                  </li>
                ))}
              </ul>
            )}

            <form className="form-stack" onSubmit={handlePostUpdate}>
              <div className="grid-2">
                <div>
                  <label htmlFor="update-kind">Entry type</label>
                  <select
                    id="update-kind"
                    value={updateKind}
                    onChange={(e) => setUpdateKind(e.target.value as UpdateKind)}
                  >
                    <option value="progress">Progress Writeup</option>
                    <option value="question">Technical Question</option>
                    <option value="suggestion">Architecture / Code Suggestion</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="update-content">
                  Write your progress update, implementation notes, question, or suggestion
                </label>
                <textarea
                  id="update-content"
                  placeholder="Share what you implemented, test output, blockers, or questions for Kusi & the team..."
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  required
                />
              </div>
              <div className="heading-actions">
                <button type="submit" className="primary" disabled={postingUpdate}>
                  {postingUpdate ? <LoaderCircle className="spin" size={16} /> : <Send size={15} />}
                  <span>Post to Task Thread</span>
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="decision-panel">
          <h2>Task Assignment &amp; Status</h2>
          <form className="form-stack" onSubmit={handleSaveMeta}>
            <div>
              <label htmlFor="detail-status">Status</label>
              <select
                id="detail-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label htmlFor="detail-priority">Priority</label>
              <select
                id="detail-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label htmlFor="detail-assignee">Assigned Engineer (emails via tracker@uhurued.com)</label>
              <input
                id="detail-assignee"
                type="email"
                list="detail-team-emails"
                value={assigneeEmail}
                onChange={(e) => setAssigneeEmail(e.target.value)}
                placeholder="engineer@uhurued.com"
              />
              <datalist id="detail-team-emails">
                {users.map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.name}
                  </option>
                ))}
              </datalist>
            </div>

            <button type="submit" className="primary" disabled={savingMeta}>
              {savingMeta ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
              <span>Save &amp; Notify Assignee</span>
            </button>
          </form>

          <div style={{ borderTop: '1px solid var(--line)', marginTop: 22, paddingTop: 18 }}>
            <h2>Ask Local Qwen3.6-Heretic (8083)</h2>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              Query the uncensored local model connected to this workspace to write implementation code, debug steps, or answer questions on this task.
            </p>
            <textarea
              placeholder="Optional question for Qwen3.6-Heretic (or leave blank for a full implementation guide)..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              style={{ minHeight: 80, marginBottom: 10 }}
            />
            <button
              type="button"
              className="secondary"
              style={{ width: '100%' }}
              disabled={askingAi}
              onClick={handleAskAi}
            >
              {askingAi ? <LoaderCircle className="spin" size={16} /> : <Bot size={16} />}
              <span>Generate AI Implementation Note</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TranscriptStudioSection({
  api,
  projects,
  users,
  aiHealth,
  onTasksCreated,
  onOpenTask,
}: {
  api: TrackerApiClient;
  projects: ProjectItem[];
  users: UserAccount[];
  aiHealth: AiHealth | null;
  onTasksCreated: (tasks: TaskItem[]) => void;
  onOpenTask: (id: string) => void;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id || 'proj_task_tracker');
  const [defaultAssignee, setDefaultAssignee] = useState(users[0]?.email || 'fkusiapp@oberlin.edu');
  const [transcript, setTranscript] = useState('');
  const [synthesizing, setSynthesizing] = useState(false);
  const [drafts, setDrafts] = useState<SynthesizedTaskDraft[]>([]);
  const [modelUsed, setModelUsed] = useState('');
  const [endpointUsed, setEndpointUsed] = useState('');
  const [assigningIdx, setAssigningIdx] = useState<number | null>(null);
  const [recentlyCreated, setRecentlyCreated] = useState<TaskItem[]>([]);

  async function handleSynthesize(autoCreate: boolean) {
    if (!transcript.trim() || synthesizing) return;
    setSynthesizing(true);
    try {
      const res = await api.synthesizeTranscript({
        transcript: transcript.trim(),
        projectId,
        assigneeEmail: defaultAssignee.trim().toLowerCase(),
        autoCreate,
      });
      setModelUsed(res.model);
      setEndpointUsed(res.endpointUsed);
      if (autoCreate && res.createdTasks.length > 0) {
        setRecentlyCreated(res.createdTasks);
        setDrafts([]);
        onTasksCreated(res.createdTasks);
      } else {
        setDrafts(
          res.drafts.map((d) => ({
            ...d,
            suggestedAssigneeEmail: d.suggestedAssigneeEmail || defaultAssignee,
          })),
        );
      }
    } finally {
      setSynthesizing(false);
    }
  }

  async function handleAssignSingleDraft(draft: SynthesizedTaskDraft, index: number) {
    setAssigningIdx(index);
    try {
      const res = await api.createTask({
        projectId,
        title: draft.title,
        description: draft.description,
        acceptanceCriteria: draft.acceptanceCriteria,
        priority: draft.priority,
        assigneeEmail: (draft.suggestedAssigneeEmail || defaultAssignee || '').trim().toLowerCase(),
        repoPathHint: draft.repoPathHint,
        tags: draft.tags,
        sourceTranscript: transcript,
      });
      setRecentlyCreated((prev) => [res.task, ...prev]);
      setDrafts((prev) => prev.filter((_, i) => i !== index));
      onTasksCreated([res.task]);
    } finally {
      setAssigningIdx(null);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>AI Transcript-to-Task Studio</h1>
          <p>
            Paste any voice/meeting transcript or rough notes. Your local uncensored model (
            <code className="mono">{aiHealth?.model || 'qwen3.6-35b-a3b-heretic'}</code> on{' '}
            <code className="mono">127.0.0.1:8083</code> / gateway) writes the detailed title, technical specification, and acceptance criteria so you can assign it to any user with one click.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="grid-2" style={{ marginBottom: 14 }}>
          <div>
            <label htmlFor="studio-project">Target Repository</label>
            <select
              id="studio-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="studio-assignee">Default Assignee Email (notified via tracker@uhurued.com)</label>
            <input
              id="studio-assignee"
              type="email"
              list="studio-team-list"
              value={defaultAssignee}
              onChange={(e) => setDefaultAssignee(e.target.value)}
              placeholder="engineer@uhurued.com"
            />
            <datalist id="studio-team-list">
              {users.map((u) => (
                <option key={u.email} value={u.email}>
                  {u.name}
                </option>
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label htmlFor="studio-transcript">Paste meeting transcript, voice dump, or rough engineering notes</label>
          <textarea
            id="studio-transcript"
            style={{ minHeight: 160 }}
            placeholder="Example: Hey team, first we need Kwaku to add rate limiting and retry backoff to the Resend email webhook in server/email.ts. Also assign Frank to update the .env vault export so engineers cloning out-there get the staging URLs automatically..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
        </div>

        <div className="heading-actions" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="primary"
            disabled={synthesizing || !transcript.trim()}
            onClick={() => handleSynthesize(false)}
          >
            {synthesizing ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
            <span>Synthesize Detailed Tasks (Review Before Assigning)</span>
          </button>
          <button
            type="button"
            className="secondary"
            disabled={synthesizing || !transcript.trim()}
            onClick={() => handleSynthesize(true)}
          >
            <Send size={15} />
            <span>Synthesize &amp; Auto-Assign Immediately</span>
          </button>
        </div>
      </section>

      {drafts.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2>
              Synthesized Task Drafts ({drafts.length}) — Generated by {modelUsed} ({endpointUsed})
            </h2>
          </div>
          <div className="form-stack">
            {drafts.map((d, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: 16,
                  background: 'var(--bg)',
                }}
              >
                <div className="grid-2" style={{ marginBottom: 10 }}>
                  <div>
                    <label>Task Title</label>
                    <input
                      type="text"
                      value={d.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDrafts((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, title: val } : item)),
                        );
                      }}
                    />
                  </div>
                  <div className="grid-2">
                    <div>
                      <label>Assign To (Email)</label>
                      <input
                        type="email"
                        list="studio-team-list"
                        value={d.suggestedAssigneeEmail || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDrafts((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, suggestedAssigneeEmail: val } : item,
                            ),
                          );
                        }}
                      />
                    </div>
                    <div>
                      <label>Priority</label>
                      <select
                        value={d.priority}
                        onChange={(e) => {
                          const val = e.target.value as TaskPriority;
                          setDrafts((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, priority: val } : item)),
                          );
                        }}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label>Detailed Technical Specification</label>
                  <textarea
                    value={d.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDrafts((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, description: val } : item)),
                      );
                    }}
                    style={{ minHeight: 110 }}
                  />
                </div>

                <div className="heading-actions" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="primary"
                    disabled={assigningIdx === idx}
                    onClick={() => handleAssignSingleDraft(d, idx)}
                  >
                    {assigningIdx === idx ? (
                      <LoaderCircle className="spin" size={15} />
                    ) : (
                      <Send size={15} />
                    )}
                    <span>
                      Assign to {d.suggestedAssigneeEmail || defaultAssignee} &amp; Send Email
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {recentlyCreated.length > 0 && (
        <section className="panel">
          <h2>Recently Synthesized &amp; Assigned Tasks</h2>
          <div className="table-scroll" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentlyCreated.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.title}</strong>
                    </td>
                    <td className="mono">{t.assigneeEmail || 'Unassigned'}</td>
                    <td>
                      <span className={`badge status-${t.priority}`}>{t.priority.toUpperCase()}</span>
                    </td>
                    <td>
                      <button type="button" className="text-button" onClick={() => onOpenTask(t.id)}>
                        Open task spec
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function ReposAndEnvSection({
  api,
  projects,
  onProjectUpdated,
}: {
  api: TrackerApiClient;
  projects: ProjectItem[];
  onProjectUpdated: (proj: ProjectItem, msg: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id || 'proj_task_tracker');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [editingEnv, setEditingEnv] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddRepo, setShowAddRepo] = useState(false);

  const [newName, setNewName] = useState('');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newLocalPath, setNewLocalPath] = useState('');
  const [newCloneCmd, setNewCloneCmd] = useState('');
  const [newSetup, setNewSetup] = useState('');
  const [newEnv, setNewEnv] = useState('');

  const activeProject = projects.find((p) => p.id === selectedId) || projects[0];

  function downloadEnvFile(proj: ProjectItem) {
    const content = (editingEnv[proj.id] ?? proj.envContent).replace(/\r\n/g, '\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.slug}.env.local`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleSaveEnv(proj: ProjectItem) {
    const content = editingEnv[proj.id] ?? proj.envContent;
    setSavingId(proj.id);
    try {
      const res = await api.saveProjectEnv(proj.id, content);
      onProjectUpdated(res.project, `Updated shared .env vault for ${proj.name}.`);
    } finally {
      setSavingId(null);
    }
  }

  async function handleAddRepo(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newRepoUrl.trim()) return;
    const res = await api.upsertProject({
      name: newName.trim(),
      description: 'Collaborative engineering repository',
      repoUrl: newRepoUrl.trim(),
      localPath: newLocalPath.trim(),
      cloneCommand: newCloneCmd.trim(),
      setupInstructions: newSetup.trim(),
      envContent: newEnv,
    });
    onProjectUpdated(res.project, `Linked repository ${res.project.name}.`);
    setSelectedId(res.project.id);
    setShowAddRepo(false);
    setNewName('');
    setNewRepoUrl('');
    setNewLocalPath('');
    setNewCloneCmd('');
    setNewSetup('');
    setNewEnv('');
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>GitHub Repositories, Clone Onboarding &amp; Shared .env Vault</h1>
          <p>
            Everything engineers need to clone repositories, configure local <code className="mono">.env</code> files, and run verification suites.
          </p>
        </div>
        <div className="heading-actions">
          <button type="button" className="primary" onClick={() => setShowAddRepo((v) => !v)}>
            <Plus size={16} />
            <span>{showAddRepo ? 'Close Form' : 'Link GitHub Repository'}</span>
          </button>
        </div>
      </div>

      {showAddRepo && (
        <section className="panel">
          <h2>Link New GitHub Repository &amp; .env Bundle</h2>
          <form className="form-stack" style={{ marginTop: 12 }} onSubmit={handleAddRepo}>
            <div className="grid-2">
              <div>
                <label htmlFor="repo-name">Project / Repository Name</label>
                <input
                  id="repo-name"
                  type="text"
                  placeholder="Uhurued Pay API"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="repo-url">GitHub Repository URL</label>
                <input
                  id="repo-url"
                  type="url"
                  placeholder="https://github.com/2024frank/uhurupay"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid-2">
              <div>
                <label htmlFor="repo-clone">Clone &amp; Install Command</label>
                <input
                  id="repo-clone"
                  type="text"
                  placeholder="git clone https://github.com/2024frank/uhurupay.git && cd uhurupay && npm install"
                  value={newCloneCmd}
                  onChange={(e) => setNewCloneCmd(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="repo-local">Local Host Path (for DeepSeek Harness agent)</label>
                <input
                  id="repo-local"
                  type="text"
                  placeholder="/home/kusi/Desktop/Dev/Uhurued/uhurupay"
                  value={newLocalPath}
                  onChange={(e) => setNewLocalPath(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="repo-setup">Setup &amp; Test Instructions</label>
              <textarea
                id="repo-setup"
                value={newSetup}
                onChange={(e) => setNewSetup(e.target.value)}
                placeholder="1. Copy .env.local\n2. Run npm install\n3. Run npm test"
              />
            </div>
            <div>
              <label htmlFor="repo-env">Shared .env File Contents</label>
              <textarea
                id="repo-env"
                className="mono"
                value={newEnv}
                onChange={(e) => setNewEnv(e.target.value)}
                placeholder="DATABASE_URL=...\nVITE_API_URL=..."
              />
            </div>
            <div className="heading-actions">
              <button type="submit" className="primary">
                <FolderGit2 size={15} />
                <span>Save Repository &amp; .env Bundle</span>
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="status-tabs" role="tablist" aria-label="Select repository">
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={activeProject?.id === p.id}
            onClick={() => setSelectedId(p.id)}
          >
            <GitBranch size={14} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      {activeProject && (
        <div className="grid-2" style={{ marginTop: 16 }}>
          <section className="panel" style={{ marginTop: 0 }}>
            <div className="panel-header">
              <h2>Repository Clone &amp; Engineer Instructions</h2>
              <a
                href={activeProject.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <span>Open on GitHub</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
            <p className="muted" style={{ marginBottom: 12 }}>
              {activeProject.description}
            </p>

            <label>One-Line Clone &amp; Install Command</label>
            <pre className="code-block">{activeProject.cloneCommand}</pre>
            <div className="heading-actions" style={{ marginTop: 10, marginBottom: 18 }}>
              <button
                type="button"
                className="secondary"
                onClick={() => navigator.clipboard.writeText(activeProject.cloneCommand)}
              >
                <Copy size={14} />
                <span>Copy Clone Command</span>
              </button>
            </div>

            <label>Step-by-Step Setup &amp; Test Workflow</label>
            <div className="spec-box" style={{ marginTop: 6 }}>
              {activeProject.setupInstructions}
            </div>
            {activeProject.localPath && (
              <p className="muted mono" style={{ fontSize: 12, marginTop: 12 }}>
                Local Workspace Path: {activeProject.localPath}
              </p>
            )}
          </section>

          <section className="panel" style={{ marginTop: 0 }}>
            <div className="panel-header">
              <h2>
                Shared <code className="mono">.env</code> Configuration Vault
              </h2>
              <div className="heading-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setRevealedIds((prev) => ({
                      ...prev,
                      [activeProject.id]: !prev[activeProject.id],
                    }))
                  }
                >
                  {revealedIds[activeProject.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{revealedIds[activeProject.id] ? 'Mask Values' : 'Reveal .env'}</span>
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      editingEnv[activeProject.id] ?? activeProject.envContent,
                    )
                  }
                >
                  <Copy size={14} />
                  <span>Copy .env</span>
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => downloadEnvFile(activeProject)}
                >
                  <Download size={14} />
                  <span>Download .env</span>
                </button>
              </div>
            </div>

            <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              Last updated by <strong className="mono">{activeProject.envUpdatedBy}</strong> on{' '}
              {formatDate(activeProject.envUpdatedAt)}.
            </p>

            {revealedIds[activeProject.id] ? (
              <textarea
                aria-label="Editable .env file contents"
                className="mono"
                style={{ minHeight: 220, fontSize: 12.5 }}
                value={editingEnv[activeProject.id] ?? activeProject.envContent}
                onChange={(e) =>
                  setEditingEnv((prev) => ({ ...prev, [activeProject.id]: e.target.value }))
                }
              />
            ) : (
              <pre className="code-block" style={{ minHeight: 220 }}>
                {maskEnvContent(editingEnv[activeProject.id] ?? activeProject.envContent)}
              </pre>
            )}

            <div className="heading-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="primary"
                disabled={savingId === activeProject.id}
                onClick={() => handleSaveEnv(activeProject)}
              >
                {savingId === activeProject.id ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <KeyRound size={15} />
                )}
                <span>Save Shared .env Bundle</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function BugsSection({
  api,
  bugs,
  projects,
  aiHealth,
  onOpenBug,
  onBugCreated,
}: {
  api: TrackerApiClient;
  bugs: BugReportItem[];
  projects: ProjectItem[];
  aiHealth: AiHealth | null;
  onOpenBug: (id: string) => void;
  onBugCreated: (bug: BugReportItem, dshWoken: boolean) => void;
}) {
  const [showReportForm, setShowReportForm] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id || 'proj_task_tracker');
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('high');
  const [filePaths, setFilePaths] = useState('');
  const [description, setDescription] = useState('');
  const [reproSteps, setReproSteps] = useState('');
  const [stackTrace, setStackTrace] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateBug(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.createBug({
        projectId,
        title: title.trim(),
        description: description.trim(),
        severity,
        filePaths: filePaths.trim(),
        reproSteps: reproSteps.trim(),
        stackTrace: stackTrace.trim(),
      });
      onBugCreated(res.bug, res.dshWoken);
      setTitle('');
      setDescription('');
      setReproSteps('');
      setStackTrace('');
      setFilePaths('');
      setShowReportForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Bug Reports &amp; DeepSeek Harness Autonomous Auto-Fix</h1>
          <p>
            Bugs reported here are immediately triaged by your local uncensored model (
            <code className="mono">{aiHealth?.model || 'qwen3.6-35b-a3b-heretic'}</code> on port{' '}
            <code className="mono">8083</code>) and dispatched to the DeepSeek Harness (<code className="mono">dsh</code> on port{' '}
            <code className="mono">3080</code>) <code className="mono">task-tracker-ops</code> automation to patch and test locally.
          </p>
        </div>
        <div className="heading-actions">
          <button type="button" className="primary" onClick={() => setShowReportForm((v) => !v)}>
            <Bug size={16} />
            <span>{showReportForm ? 'Close Bug Form' : 'Report Bug & Trigger Auto-Fix'}</span>
          </button>
        </div>
      </div>

      {showReportForm && (
        <section className="panel">
          <div className="panel-header">
            <h2>File Bug Report for Autonomous DeepSeek Harness Triage &amp; Testing</h2>
            <span className="badge status-in_progress">DSH Watcher + Qwen3.6-Heretic (8083)</span>
          </div>
          <form className="form-stack" onSubmit={handleCreateBug}>
            <div className="grid-2">
              <div>
                <label htmlFor="bug-title">Bug summary</label>
                <input
                  id="bug-title"
                  type="text"
                  placeholder="Null pointer when parsing empty transcript array"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid-2">
                <div>
                  <label htmlFor="bug-project">Repository</label>
                  <select
                    id="bug-project"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bug-severity">Severity</label>
                  <select
                    id="bug-severity"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="bug-files">Suspected file paths (optional)</label>
              <input
                id="bug-files"
                type="text"
                placeholder="server/ai.ts, src/App.tsx"
                value={filePaths}
                onChange={(e) => setFilePaths(e.target.value)}
              />
            </div>

            <div className="grid-2">
              <div>
                <label htmlFor="bug-desc">What went wrong?</label>
                <textarea
                  id="bug-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe expected vs actual behavior..."
                  required
                />
              </div>
              <div>
                <label htmlFor="bug-repro">Reproduction steps</label>
                <textarea
                  id="bug-repro"
                  value={reproSteps}
                  onChange={(e) => setReproSteps(e.target.value)}
                  placeholder="1. Open Transcript Studio\n2. Submit input\n3. Observe error..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="bug-stack">Stack trace or terminal error output (optional)</label>
              <textarea
                id="bug-stack"
                className="mono"
                value={stackTrace}
                onChange={(e) => setStackTrace(e.target.value)}
                placeholder="TypeError: Cannot read properties of undefined..."
                style={{ minHeight: 90 }}
              />
            </div>

            <div className="heading-actions">
              <button type="submit" className="primary" disabled={submitting}>
                {submitting ? <LoaderCircle className="spin" size={16} /> : <Wrench size={16} />}
                <span>Submit Bug &amp; Wake DeepSeek Harness Agent</span>
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="queue-section">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Bug Report</th>
                <th>Repository</th>
                <th>Severity</th>
                <th>Agent Status</th>
                <th>Assigned Agent</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {bugs.map((b) => (
                <tr key={b.id}>
                  <td>
                    <button type="button" className="task-row-btn" onClick={() => onOpenBug(b.id)}>
                      <strong>{b.title}</strong>
                      <span>{b.description}</span>
                    </button>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {b.projectName}
                  </td>
                  <td>
                    <span className={`badge status-${b.severity}`}>{b.severity.toUpperCase()}</span>
                  </td>
                  <td>
                    <span className={`badge status-${b.status}`}>
                      <span className="status-dot" />
                      {statusLabel(b.status)}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {b.agentAssigned}
                  </td>
                  <td className="mono muted">{formatDate(b.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function BugDetailView({
  api,
  bug,
  onBack,
  onBugUpdated,
}: {
  api: TrackerApiClient;
  bug: BugReportItem;
  onBack: () => void;
  onBugUpdated: (bug: BugReportItem, msg?: string) => void;
}) {
  const [status, setStatus] = useState<BugStatus>(bug.status);
  const [fixSummary, setFixSummary] = useState(bug.agentFixSummary);
  const [testOutput, setTestOutput] = useState(bug.agentTestOutput);
  const [dispatching, setDispatching] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleDispatch() {
    setDispatching(true);
    try {
      const res = await api.dispatchBugToDsh(bug.id);
      setFixSummary(res.bug.agentFixSummary);
      setStatus(res.bug.status);
      onBugUpdated(
        res.bug,
        `Dispatched to DeepSeek Harness (3080) & ${res.model} (8083).`,
      );
    } finally {
      setDispatching(false);
    }
  }

  async function handleSaveBug(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateBug(bug.id, {
        status,
        agentFixSummary: fixSummary,
        agentTestOutput: testOutput,
      });
      onBugUpdated(res.bug, 'Updated bug resolution and test log.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="review-page">
      <button type="button" className="text-button" onClick={onBack} style={{ marginBottom: 14 }}>
        <ArrowLeft size={15} />
        <span>Back to bug reports</span>
      </button>

      <div className="page-heading">
        <div>
          <h1>{bug.title}</h1>
          <p className="mono">
            Repository: {bug.projectName} · Reported by {bug.reporterName} ({bug.reporterEmail}) · Files:{' '}
            {bug.filePaths || 'repo-wide'}
          </p>
        </div>
        <div className="heading-actions">
          <span className={`badge status-${bug.severity}`}>{bug.severity.toUpperCase()}</span>
          <span className={`badge status-${bug.status}`}>
            <span className="status-dot" />
            {statusLabel(bug.status)}
          </span>
        </div>
      </div>

      <div className="review-grid">
        <div className="evidence-column">
          <section className="evidence-section">
            <h2>
              <Bug size={17} />
              <span>Bug Description &amp; Reproduction Steps</span>
            </h2>
            <div className="spec-box">{bug.description}</div>
            {bug.reproSteps && (
              <>
                <h3 style={{ marginTop: 14, marginBottom: 6 }}>Reproduction Steps</h3>
                <div className="spec-box">{bug.reproSteps}</div>
              </>
            )}
          </section>

          {bug.stackTrace && (
            <section className="evidence-section">
              <h2>
                <Terminal size={17} />
                <span>Stack Trace / Error Output</span>
              </h2>
              <pre className="code-block">{bug.stackTrace}</pre>
            </section>
          )}

          <section className="evidence-section">
            <h2>
              <Bot size={17} />
              <span>Qwen3.6-Heretic (8083) &amp; DeepSeek Harness Fix Analysis</span>
            </h2>
            <div className="spec-box">
              {bug.agentFixSummary || 'Awaiting autonomous triage from local model...'}
            </div>
          </section>

          {bug.agentTestOutput && (
            <section className="evidence-section">
              <h2>
                <Code2 size={17} />
                <span>Automated Verification &amp; Test Suite Output</span>
              </h2>
              <pre className="code-block">{bug.agentTestOutput}</pre>
            </section>
          )}
        </div>

        <aside className="decision-panel">
          <h2>Autonomous Bug Ops</h2>
          <button
            type="button"
            className="primary"
            style={{ width: '100%', marginBottom: 18 }}
            disabled={dispatching}
            onClick={handleDispatch}
          >
            {dispatching ? <LoaderCircle className="spin" size={16} /> : <Wrench size={16} />}
            <span>Run Qwen3.6-Heretic + DSH Auto-Fix</span>
          </button>

          <form className="form-stack" onSubmit={handleSaveBug}>
            <div>
              <label htmlFor="bug-detail-status">Bug Status</label>
              <select
                id="bug-detail-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as BugStatus)}
              >
                <option value="open">Open</option>
                <option value="triaging">AI Triaging</option>
                <option value="fixing">DSH Fixing</option>
                <option value="testing">Running Tests</option>
                <option value="resolved">Resolved</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>
            <div>
              <label htmlFor="bug-detail-summary">Fix Summary / Root Cause Writeup</label>
              <textarea
                id="bug-detail-summary"
                value={fixSummary}
                onChange={(e) => setFixSummary(e.target.value)}
                style={{ minHeight: 100 }}
              />
            </div>
            <div>
              <label htmlFor="bug-detail-test">Test Verification Output</label>
              <textarea
                id="bug-detail-test"
                className="mono"
                value={testOutput}
                onChange={(e) => setTestOutput(e.target.value)}
                placeholder="npm test output..."
                style={{ minHeight: 80 }}
              />
            </div>
            <button type="submit" className="secondary" disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
              <span>Save Bug Resolution</span>
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function TeamSection({
  api,
  user,
  users,
  tasks,
  onUserAdded,
  onProfileUpdated,
}: {
  api: TrackerApiClient;
  user: UserAccount;
  users: UserAccount[];
  tasks: TaskItem[];
  onUserAdded: (member: UserAccount) => void;
  onProfileUpdated: (user: UserAccount) => void;
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteGithub, setInviteGithub] = useState('');
  const [inviting, setInviting] = useState(false);

  const [myName, setMyName] = useState(user.name);
  const [myGithub, setMyGithub] = useState(user.githubHandle);
  const [myBio, setMyBio] = useState(user.bio);
  const [savingProfile, setSavingProfile] = useState(false);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    try {
      const res = await api.inviteEngineer({
        email: inviteEmail.trim().toLowerCase(),
        name: inviteName.trim() || undefined,
        githubHandle: inviteGithub.trim() || undefined,
      });
      onUserAdded(res.member);
      setInviteEmail('');
      setInviteName('');
      setInviteGithub('');
    } finally {
      setInviting(false);
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.updateProfile({
        name: myName.trim(),
        githubHandle: myGithub.trim(),
        bio: myBio.trim(),
      });
      onProfileUpdated(res.user);
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Engineering Team &amp; Collaborators</h1>
          <p>
            Registered engineers can receive assigned tasks via <code className="mono">tracker@uhurued.com</code>, post progress writeups, access shared <code className="mono">.env</code> files, and trigger local AI bug fixes.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel" style={{ marginTop: 0 }}>
          <h2>Add / Pre-Register Collaborator</h2>
          <form className="form-stack" style={{ marginTop: 12 }} onSubmit={handleInvite}>
            <div>
              <label htmlFor="invite-email">Engineer Email</label>
              <input
                id="invite-email"
                type="email"
                placeholder="collaborator@uhurued.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid-2">
              <div>
                <label htmlFor="invite-name">Full Name</label>
                <input
                  id="invite-name"
                  type="text"
                  placeholder="Kwaku Boateng"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="invite-gh">GitHub Handle</label>
                <input
                  id="invite-gh"
                  type="text"
                  placeholder="kwaku-dev"
                  value={inviteGithub}
                  onChange={(e) => setInviteGithub(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="primary" disabled={inviting}>
              {inviting ? <LoaderCircle className="spin" size={15} /> : <Users size={15} />}
              <span>Register Engineer in Workspace</span>
            </button>
          </form>
        </section>

        <section className="panel" style={{ marginTop: 0 }}>
          <h2>Your Engineer Profile ({user.email})</h2>
          <form className="form-stack" style={{ marginTop: 12 }} onSubmit={handleSaveProfile}>
            <div className="grid-2">
              <div>
                <label htmlFor="prof-name">Display Name</label>
                <input
                  id="prof-name"
                  type="text"
                  value={myName}
                  onChange={(e) => setMyName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="prof-gh">GitHub Username</label>
                <input
                  id="prof-gh"
                  type="text"
                  value={myGithub}
                  onChange={(e) => setMyGithub(e.target.value)}
                  placeholder="2024frank"
                />
              </div>
            </div>
            <div>
              <label htmlFor="prof-bio">Focus / Engineering Role</label>
              <input
                id="prof-bio"
                type="text"
                value={myBio}
                onChange={(e) => setMyBio(e.target.value)}
                placeholder="Systems & Full-Stack Engineering"
              />
            </div>
            <button type="submit" className="secondary" disabled={savingProfile}>
              {savingProfile ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
              <span>Save Profile</span>
            </button>
          </form>
        </section>
      </div>

      <section className="queue-section" style={{ marginTop: 20 }}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Engineer</th>
                <th>Email</th>
                <th>GitHub</th>
                <th>Role</th>
                <th>Assigned Tasks</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const count = tasks.filter(
                  (t) => t.assigneeEmail.toLowerCase() === u.email.toLowerCase(),
                ).length;
                return (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      {u.bio && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {u.bio}
                        </div>
                      )}
                    </td>
                    <td className="mono">{u.email}</td>
                    <td className="mono">
                      {u.githubHandle ? (
                        <a
                          href={`https://github.com/${u.githubHandle}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-button"
                        >
                          @{u.githubHandle}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className="badge status-in_progress">{u.role.toUpperCase()}</span>
                    </td>
                    <td className="mono">{count} tasks</td>
                    <td className="mono muted">{formatDate(u.lastSeenAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
