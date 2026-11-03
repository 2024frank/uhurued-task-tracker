import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Bug,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  FolderGit2,
  GitBranch,
  KeyRound,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Terminal,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import {
  defaultTrackerApi,
  type BugReportItem,
  type BugSeverity,
  type BugStatus,
  type ProjectItem,
  type SynthesizedTaskDraft,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
  type TrackerApiClient,
  type UpdateKind,
  type UserAccount,
  type WorkspacePayload,
} from './api';

type PortalTab = 'my_space' | 'all_tasks' | 'transcript_ai' | 'repos_env' | 'bugs' | 'team';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  blocked: 'Blocked',
  done: 'Done',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const UPDATE_KIND_LABELS: Record<UpdateKind, string> = {
  progress: 'Progress Writeup',
  question: 'Question',
  suggestion: 'Suggestion',
  ai_note: 'Local AI Note',
};

const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  open: 'Open',
  triaging: 'AI Triaging',
  fixing: 'DSH Auto-Fixing',
  testing: 'Running Tests',
  resolved: 'Resolved & Verified',
  ignored: 'Ignored',
};

const SAMPLE_TRANSCRIPT = `Kusi (Engineering Sync):
1. On task.uhurued.com, make sure the Out There one-tone email template (#122218 forest green + #FFD75B gold) sends all sign-in codes and task assignment notices from Out There <task@uhurued.com> with automatic Resend key failover.
2. In the .env Vault section, allow engineers to copy or download the shared .env file with one click and view the git clone + setup instructions for each repository.
3. Connect the bug report queue to DeepSeek Harness (port 3080) and local Qwen3.6-35B-A3B-Heretic (port 8083) so new bug reports are triaged, patched, and tested automatically.`;

function formatShortTime(iso?: string | null): string {
  if (!iso) return 'Just now';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="Out There Task Tracker home">
      <b>out</b>
      <span>
        there<b>.</b>
      </span>
    </a>
  );
}

function PortalHeader({ aiOnline, modelName }: { aiOnline?: boolean; modelName?: string }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <div className="header-meta-group">
          <span className="pilot-pill">
            <Cpu size={14} /> {modelName || 'qwen3.6-35b-a3b-heretic'} {aiOnline === false ? '(Connecting)' : '(Port 8083 Live)'}
          </span>
          <span className="role-pill">task@uhurued.com</span>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <Brand />
        <a href="mailto:task@uhurued.com">task@uhurued.com</a>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Out There · Engineering Task Tracker (task.uhurued.com)</p>
        <nav aria-label="Footer">
          <a href="https://github.com/2024frank/uhurued-task-tracker" target="_blank" rel="noreferrer">
            GitHub Repository (Open Source)
          </a>
          <a href="https://ot.uhurued.com" target="_blank" rel="noreferrer">
            Out There
          </a>
          <a href="mailto:task@uhurued.com">task@uhurued.com</a>
        </nav>
      </div>
    </footer>
  );
}

export function App({ api = defaultTrackerApi }: { api?: TrackerApiClient }) {
  const [authStep, setAuthStep] = useState<'email' | 'code'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [githubInput, setGithubInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(() => api.hasSession());
  const [activeTab, setActiveTab] = useState<PortalTab>('my_space');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj_task_tracker');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Task creation modal/inline form
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskCriteria, setNewTaskCriteria] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('high');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPathHint, setNewTaskPathHint] = useState('src/');
  const [creatingTask, setCreatingTask] = useState(false);

  // Task progress writeup / question / suggestion state
  const [updateKind, setUpdateKind] = useState<UpdateKind>('progress');
  const [updateContent, setUpdateContent] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [aiQuestionPrompt, setAiQuestionPrompt] = useState('');
  const [askingAi, setAskingAi] = useState(false);

  // Transcript-to-task studio state
  const [transcriptText, setTranscriptText] = useState(SAMPLE_TRANSCRIPT);
  const [transcriptAssignee, setTranscriptAssignee] = useState('');
  const [synthesizing, setSynthesizing] = useState(false);
  const [drafts, setDrafts] = useState<SynthesizedTaskDraft[]>([]);
  const [assigningDraftIdx, setAssigningDraftIdx] = useState<number | null>(null);

  // Repo & .env vault state
  const [envDraft, setEnvDraft] = useState('');
  const [savingEnv, setSavingEnv] = useState(false);
  const [showAddRepoForm, setShowAddRepoForm] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoLocalPath, setNewRepoLocalPath] = useState('');
  const [newRepoInstructions, setNewRepoInstructions] = useState('');

  // Bug reporting & DSH auto-fix state
  const [showBugForm, setShowBugForm] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugSeverity, setBugSeverity] = useState<BugSeverity>('high');
  const [bugStack, setBugStack] = useState('');
  const [bugRepro, setBugRepro] = useState('');
  const [bugFiles, setBugFiles] = useState('');
  const [submittingBug, setSubmittingBug] = useState(false);
  const [dispatchingBugId, setDispatchingBugId] = useState<string | null>(null);

  // Team invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteGithub, setInviteGithub] = useState('');
  const [inviting, setInviting] = useState(false);

  function showToastMessage(msg: string) {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? '' : prev));
    }, 5000);
  }

  async function copyText(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  async function refreshWorkspace(silent = false) {
    if (!silent) setLoadingWorkspace(true);
    setErrorBanner('');
    try {
      const data = await api.loadWorkspace();
      setWorkspace(data);
      if (data.projects.length > 0 && !data.projects.some((p) => p.id === selectedProjectId)) {
        setSelectedProjectId(data.projects[0]!.id);
      }
      const activeProj = data.projects.find((p) => p.id === selectedProjectId) || data.projects[0];
      if (activeProj) {
        setEnvDraft(activeProj.envContent);
      }
      if (!selectedTaskId && data.tasks.length > 0) {
        setSelectedTaskId(data.tasks[0]!.id);
      }
    } catch (err) {
      api.setToken(null);
      setWorkspace(null);
      if (!silent) setAuthError((err as Error).message || 'Session expired. Sign in again.');
    } finally {
      if (!silent) setLoadingWorkspace(false);
    }
  }

  useEffect(() => {
    if (api.hasSession()) {
      void refreshWorkspace();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!workspace) return;
    const proj = workspace.projects.find((p) => p.id === selectedProjectId);
    if (proj) setEnvDraft(proj.envContent);
  }, [selectedProjectId, workspace]);

  async function handleRequestCode(e?: FormEvent) {
    e?.preventDefault();
    if (authBusy) return;
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Enter a valid email address.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    try {
      const res = await api.requestCode(cleanEmail);
      setPreviewCode(res.previewCode || null);
      if (res.previewCode) {
        setCodeInput(res.previewCode);
      }
      setAuthStep('code');
    } catch (err) {
      setAuthError((err as Error).message || 'Could not send sign-in code.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setAuthError('');
    try {
      await api.verifyCode({
        email: emailInput.trim().toLowerCase(),
        code: codeInput.trim(),
        name: nameInput.trim() || undefined,
        githubHandle: githubInput.trim() || undefined,
      });
      await refreshWorkspace();
    } catch (err) {
      setAuthError((err as Error).message || 'Invalid or expired 6-digit code.');
    } finally {
      setAuthBusy(false);
    }
  }

  function handleSignOut() {
    api.setToken(null);
    setWorkspace(null);
    setAuthStep('email');
    setCodeInput('');
    setPreviewCode(null);
  }

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || creatingTask) return;
    setCreatingTask(true);
    setErrorBanner('');
    try {
      const criteria = newTaskCriteria
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const res = await api.createTask({
        projectId: selectedProjectId,
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        acceptanceCriteria: criteria,
        priority: newTaskPriority,
        assigneeEmail: newTaskAssignee.trim().toLowerCase() || workspace?.user.email,
        repoPathHint: newTaskPathHint.trim() || 'src/',
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskCriteria('');
      setShowNewTaskForm(false);
      setSelectedTaskId(res.task.id);
      await refreshWorkspace(true);
      showToastMessage(
        res.emailDelivered
          ? `Assigned "${res.task.title}" and emailed ${res.task.assigneeEmail} from task@uhurued.com.`
          : `Created task "${res.task.title}".`,
      );
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleStatusOrAssigneeChange(
    task: TaskItem,
    patch: { status?: TaskStatus; priority?: TaskPriority; assigneeEmail?: string },
  ) {
    try {
      const res = await api.updateTask(task.id, patch);
      await refreshWorkspace(true);
      if (patch.assigneeEmail && patch.assigneeEmail !== task.assigneeEmail) {
        showToastMessage(
          res.emailDelivered
            ? `Assigned to ${res.task.assigneeEmail} (emailed from task@uhurued.com).`
            : `Assigned to ${res.task.assigneeEmail}.`,
        );
      } else {
        showToastMessage(`Updated "${res.task.title}".`);
      }
    } catch (err) {
      setErrorBanner((err as Error).message);
    }
  }

  async function handlePostUpdate(e: FormEvent, taskId: string) {
    e.preventDefault();
    if (!updateContent.trim() || postingUpdate) return;
    setPostingUpdate(true);
    try {
      await api.postTaskUpdate(taskId, updateKind, updateContent.trim());
      setUpdateContent('');
      await refreshWorkspace(true);
      showToastMessage(`Posted ${UPDATE_KIND_LABELS[updateKind].toLowerCase()}.`);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setPostingUpdate(false);
    }
  }

  async function handleAskLocalAi(taskId: string) {
    if (askingAi) return;
    setAskingAi(true);
    try {
      const res = await api.askAiOnTask(
        taskId,
        aiQuestionPrompt.trim() ||
          'Give me a concrete implementation plan, exact file paths to edit, and test commands for this task.',
      );
      setAiQuestionPrompt('');
      await refreshWorkspace(true);
      showToastMessage(`Local model (${res.model}) posted an implementation note.`);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setAskingAi(false);
    }
  }

  async function handleSynthesizeTranscript(autoCreate: boolean) {
    if (!transcriptText.trim() || synthesizing) return;
    setSynthesizing(true);
    setErrorBanner('');
    try {
      const res = await api.synthesizeTranscript({
        transcript: transcriptText.trim(),
        projectId: selectedProjectId,
        assigneeEmail: transcriptAssignee.trim().toLowerCase() || undefined,
        autoCreate,
      });
      setDrafts(res.drafts);
      if (autoCreate && res.createdTasks.length > 0) {
        await refreshWorkspace(true);
        setSelectedTaskId(res.createdTasks[0]!.id);
        showToastMessage(
          `Synthesized and assigned ${res.createdTasks.length} task(s) via ${res.model} (emailed from task@uhurued.com).`,
        );
      } else {
        showToastMessage(`Local model (${res.model}) generated ${res.drafts.length} detailed task spec(s).`);
      }
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setSynthesizing(false);
    }
  }

  async function handleAssignSynthesizedDraft(draft: SynthesizedTaskDraft, index: number, assigneeOverride?: string) {
    setAssigningDraftIdx(index);
    try {
      const targetEmail = (assigneeOverride || draft.suggestedAssigneeEmail || transcriptAssignee || workspace?.user.email || '')
        .trim()
        .toLowerCase();
      const res = await api.createTask({
        projectId: selectedProjectId,
        title: draft.title,
        description: draft.description,
        acceptanceCriteria: draft.acceptanceCriteria,
        priority: draft.priority,
        assigneeEmail: targetEmail,
        repoPathHint: draft.repoPathHint,
        tags: draft.tags,
        sourceTranscript: transcriptText,
      });
      await refreshWorkspace(true);
      setSelectedTaskId(res.task.id);
      showToastMessage(
        res.emailDelivered
          ? `Assigned "${res.task.title}" to ${targetEmail} (emailed from task@uhurued.com).`
          : `Created & assigned "${res.task.title}" to ${targetEmail}.`,
      );
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setAssigningDraftIdx(null);
    }
  }

  async function handleSaveEnv(project: ProjectItem) {
    if (savingEnv) return;
    setSavingEnv(true);
    try {
      await api.saveProjectEnv(project.id, envDraft);
      await refreshWorkspace(true);
      showToastMessage(`Saved shared .env vault for ${project.name}.`);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setSavingEnv(false);
    }
  }

  function handleDownloadEnv(project: ProjectItem) {
    const normalized = (envDraft || project.envContent || '').replace(/\r\n/g, '\n');
    const blob = new Blob([normalized], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `.env.${project.slug || 'local'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToastMessage(`Downloaded .env.${project.slug || 'local'}.`);
  }

  async function handleAddRepo(e: FormEvent) {
    e.preventDefault();
    if (!newRepoName.trim() || !newRepoUrl.trim()) return;
    try {
      const res = await api.upsertProject({
        name: newRepoName.trim(),
        repoUrl: newRepoUrl.trim(),
        description: newRepoDesc.trim(),
        localPath: newRepoLocalPath.trim(),
        setupInstructions: newRepoInstructions.trim(),
      });
      setSelectedProjectId(res.project.id);
      setShowAddRepoForm(false);
      setNewRepoName('');
      setNewRepoUrl('');
      setNewRepoDesc('');
      setNewRepoLocalPath('');
      setNewRepoInstructions('');
      await refreshWorkspace(true);
      showToastMessage(`Added repository "${res.project.name}".`);
    } catch (err) {
      setErrorBanner((err as Error).message);
    }
  }

  async function handleCreateBug(e: FormEvent) {
    e.preventDefault();
    if (!bugTitle.trim() || submittingBug) return;
    setSubmittingBug(true);
    try {
      const res = await api.createBug({
        projectId: selectedProjectId,
        title: bugTitle.trim(),
        description: bugDesc.trim(),
        severity: bugSeverity,
        stackTrace: bugStack.trim(),
        reproSteps: bugRepro.trim(),
        filePaths: bugFiles.trim(),
      });
      setBugTitle('');
      setBugDesc('');
      setBugStack('');
      setBugRepro('');
      setBugFiles('');
      setShowBugForm(false);
      await refreshWorkspace(true);
      showToastMessage(
        res.dshWoken
          ? `Bug triaged by ${res.model} and dispatched to DeepSeek Harness (port 3080).`
          : `Bug triaged by ${res.model} and queued for DeepSeek Harness auto-fix.`,
      );
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setSubmittingBug(false);
    }
  }

  async function handleDispatchDsh(bug: BugReportItem) {
    setDispatchingBugId(bug.id);
    try {
      const res = await api.dispatchBugToDsh(bug.id);
      await refreshWorkspace(true);
      showToastMessage(`Dispatched "${bug.title}" to ${res.model} + DeepSeek Harness.`);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setDispatchingBugId(null);
    }
  }

  async function handleUpdateBugStatus(bug: BugReportItem, status: BugStatus) {
    try {
      await api.updateBug(bug.id, { status });
      await refreshWorkspace(true);
      showToastMessage(`Marked bug "${bug.title}" as ${BUG_STATUS_LABELS[status]}.`);
    } catch (err) {
      setErrorBanner((err as Error).message);
    }
  }

  async function handleInviteMember(e: FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    try {
      const res = await api.inviteTeamMember({
        email: inviteEmail.trim().toLowerCase(),
        name: inviteName.trim() || undefined,
        githubHandle: inviteGithub.trim() || undefined,
      });
      setInviteEmail('');
      setInviteName('');
      setInviteGithub('');
      await refreshWorkspace(true);
      showToastMessage(`Added ${res.member.name} (${res.member.email}) to the engineering team.`);
    } catch (err) {
      setErrorBanner((err as Error).message);
    } finally {
      setInviting(false);
    }
  }

  // Signed-out / restoring view — exact OrganizerPortal.tsx structure
  if (loadingWorkspace) {
    return (
      <>
        <PortalHeader />
        <main id="main" className="portal-page">
          <section className="portal-card">
            <p>Restoring your engineering workspace session...</p>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (!workspace) {
    return (
      <>
        <PortalHeader />
        <main id="main" className="portal-page">
          <div className="portal-breadcrumb">
            <a className="text-link" href="https://ot.uhurued.com">
              <ArrowLeft size={16} /> Back to Out There
            </a>
            <span className="portal-muted">task.uhurued.com · Powered by Local Qwen3.6-Heretic</span>
          </div>

          <div className="signin-container">
            <div className="portal-hero">
              <span className="pilot-pill">Out There Engineering Space</span>
              <h1>Engineering Workspace Sign-In</h1>
              <p className="portal-lead">
                Sign in or create your engineering account with your email address. We&apos;ll send you a 6-digit code
                from <strong>task@uhurued.com</strong> to access your assigned tasks, AI transcript studio, shared{' '}
                <code>.env</code> vaults, and automated bug-fix agents.
              </p>
            </div>

            <section className="portal-card signin-card">
              {authError && (
                <div className="portal-alert" role="alert">
                  {authError}
                </div>
              )}

              {authStep === 'email' ? (
                <form className="portal-form" onSubmit={handleRequestCode}>
                  <label>
                    Work or university email
                    <input
                      type="email"
                      autoComplete="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="engineer@uhurued.com"
                      required
                      disabled={authBusy}
                    />
                  </label>

                  <details className="optional-fields-disclosure">
                    <summary>New here? Add your name &amp; GitHub username (optional)</summary>
                    <div className="optional-fields-body">
                      <div className="form-grid-2">
                        <label>
                          Your name (optional)
                          <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            placeholder="Frank Kusi Appiah"
                            disabled={authBusy}
                          />
                        </label>
                        <label>
                          GitHub username (optional)
                          <input
                            type="text"
                            value={githubInput}
                            onChange={(e) => setGithubInput(e.target.value)}
                            placeholder="2024frank"
                            disabled={authBusy}
                          />
                        </label>
                      </div>
                    </div>
                  </details>

                  <button type="submit" className="button button-primary submit-wide" disabled={authBusy}>
                    <Mail size={18} /> {authBusy ? 'Sending code...' : 'Email a 6-digit sign-in code'}
                  </button>
                </form>
              ) : (
                <form className="portal-form" onSubmit={handleVerifyCode}>
                  <p className="portal-muted">
                    Enter the 6-digit code sent from <strong>Out There &lt;task@uhurued.com&gt;</strong> to{' '}
                    <strong>{emailInput.trim().toLowerCase()}</strong>.
                  </p>

                  {previewCode && (
                    <div className="student-callout">
                      <KeyRound size={18} className="accent-icon" />
                      <div>
                        <strong>Instant code preview:</strong> <code>{previewCode}</code>
                      </div>
                    </div>
                  )}

                  <label>
                    6-digit verification code
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      required
                      autoFocus
                      disabled={authBusy}
                    />
                  </label>

                  <button
                    type="submit"
                    className="button button-primary submit-wide"
                    disabled={authBusy || codeInput.length !== 6}
                  >
                    {authBusy ? 'Signing in...' : 'Enter Engineering Space'} <ArrowRight size={18} />
                  </button>

                  <div className="signin-footer-links">
                    <button
                      type="button"
                      className="button-ghost"
                      disabled={authBusy}
                      onClick={() => {
                        setAuthStep('email');
                        setCodeInput('');
                        setAuthError('');
                      }}
                    >
                      Use a different email
                    </button>
                    <button
                      type="button"
                      className="button-ghost"
                      disabled={authBusy}
                      onClick={() => void handleRequestCode()}
                    >
                      Resend code
                    </button>
                  </div>
                </form>
              )}

              <p className="signin-request-prompt">
                Open-source repository:{' '}
                <a
                  className="text-link"
                  href="https://github.com/2024frank/uhurued-task-tracker"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/2024frank/uhurued-task-tracker
                </a>
              </p>
            </section>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const activeProject =
    workspace.projects.find((p) => p.id === selectedProjectId) || workspace.projects[0]!;
  const myTasks = workspace.tasks.filter(
    (t) => t.assigneeEmail.toLowerCase() === workspace.user.email.toLowerCase(),
  );
  const projectTasks = workspace.tasks.filter(
    (t) => selectedProjectId === 'all' || t.projectId === selectedProjectId,
  );
  const displayedTasks = activeTab === 'my_space' ? (myTasks.length > 0 ? myTasks : workspace.tasks) : projectTasks;
  const activeTask =
    workspace.tasks.find((t) => t.id === selectedTaskId) || displayedTasks[0] || workspace.tasks[0] || null;
  const openBugsCount = workspace.bugs.filter((b) => b.status !== 'resolved' && b.status !== 'ignored').length;

  return (
    <>
      <PortalHeader aiOnline={workspace.aiHealth.online} modelName={workspace.aiHealth.model} />
      <main id="main" className="portal-page">
        <div className="portal-breadcrumb">
          <a className="text-link" href="https://github.com/2024frank/uhurued-task-tracker" target="_blank" rel="noreferrer">
            <FolderGit2 size={16} /> 2024frank/uhurued-task-tracker
          </a>
          <div className="portal-user-bar">
            <span className="role-pill">{workspace.user.role === 'admin' ? 'Workspace Admin' : 'Software Engineer'}</span>
            <span className="portal-muted">
              {workspace.user.name} ({workspace.user.email})
            </span>
            <button type="button" className="button-ghost" onClick={() => void refreshWorkspace(true)}>
              <RefreshCw size={15} /> Sync
            </button>
            <button type="button" className="button-ghost" onClick={handleSignOut}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>

        <div className="dashboard-shell">
          {/* Top Organization / Workspace Header Card (exact OrganizerDashboard pattern) */}
          <div className="org-header-card portal-card">
            <div className="org-header-top">
              <div>
                <div className="org-badges">
                  <span className="pilot-pill">
                    <Sparkles size={13} /> Engineering Space
                  </span>
                  <span className="status-pill is-published">
                    <Bot size={13} /> {workspace.aiHealth.model} · Always-On Gateway
                  </span>
                  <span className="role-pill">Emails: Out There &lt;task@uhurued.com&gt;</span>
                </div>
                <h1>{activeProject?.name || 'Out There Engineering Workspace'}</h1>
                <p className="portal-muted">
                  {activeProject?.description ||
                    'Collaborative task assignment, transcript-to-task AI synthesis, shared .env vaults, and DeepSeek Harness automated bug fixing.'}
                </p>
              </div>

              <label className="org-switcher">
                Active repository / project
                <select
                  value={activeProject?.id || ''}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  {workspace.projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <nav className="portal-tabs" aria-label="Workspace sections">
              <button
                type="button"
                className={activeTab === 'my_space' ? 'is-active' : ''}
                onClick={() => setActiveTab('my_space')}
              >
                <UserCheck size={17} /> My Space ({myTasks.length})
              </button>
              <button
                type="button"
                className={activeTab === 'all_tasks' ? 'is-active' : ''}
                onClick={() => setActiveTab('all_tasks')}
              >
                <ClipboardList size={17} /> All Tasks ({workspace.tasks.length})
              </button>
              <button
                type="button"
                className={activeTab === 'transcript_ai' ? 'is-active' : ''}
                onClick={() => setActiveTab('transcript_ai')}
              >
                <Sparkles size={17} /> AI Transcript Studio
              </button>
              <button
                type="button"
                className={activeTab === 'repos_env' ? 'is-active' : ''}
                onClick={() => setActiveTab('repos_env')}
              >
                <KeyRound size={17} /> Repos &amp; .env Vault ({workspace.projects.length})
              </button>
              <button
                type="button"
                className={activeTab === 'bugs' ? 'is-active' : ''}
                onClick={() => setActiveTab('bugs')}
              >
                <Bug size={17} /> Bug Reports &amp; Auto-Fix ({workspace.bugs.length})
              </button>
              <button
                type="button"
                className={activeTab === 'team' ? 'is-active' : ''}
                onClick={() => setActiveTab('team')}
              >
                <Users size={17} /> Team ({workspace.users.length})
              </button>
            </nav>
          </div>

          {errorBanner && (
            <div className="portal-alert" role="alert">
              {errorBanner}
            </div>
          )}

          {/* 4-Card Summary Strip (exact Out There analytics-grid + metric-card) */}
          <div className="analytics-grid" aria-label="Workspace summary">
            <div className="metric-card">
              <span className="metric-label">
                <UserCheck size={16} /> Assigned to You
              </span>
              <strong>{myTasks.length}</strong>
              <small>Tasks assigned by Kusi or {workspace.aiHealth.model}</small>
            </div>
            <div className="metric-card">
              <span className="metric-label">
                <ClipboardList size={16} /> Total Workspace Tasks
              </span>
              <strong>{workspace.tasks.length}</strong>
              <small>With progress writeups, questions &amp; suggestions</small>
            </div>
            <div className="metric-card">
              <span className="metric-label">
                <FolderGit2 size={16} /> Repos &amp; .env Vaults
              </span>
              <strong>{workspace.projects.length}</strong>
              <small>Git clone instructions &amp; shared .env configs</small>
            </div>
            <div className="metric-card">
              <span className="metric-label">
                <Wrench size={16} /> Bug Auto-Fix Queue
              </span>
              <strong>{openBugsCount}</strong>
              <small>Triaged &amp; tested by DeepSeek Harness + Local AI</small>
            </div>
          </div>

          {/* TAB 1 & 2: MY SPACE / ALL TASKS */}
          {(activeTab === 'my_space' || activeTab === 'all_tasks') && (
            <div className="portal-stack">
              {showNewTaskForm && (
                <section className="portal-card">
                  <div className="section-title-row">
                    <h2>Assign a new engineering task</h2>
                    <button type="button" className="button-ghost" onClick={() => setShowNewTaskForm(false)}>
                      Cancel
                    </button>
                  </div>
                  <p className="portal-muted" style={{ marginBottom: '16px' }}>
                    Assigning a task emails the engineer immediately from <strong>Out There &lt;task@uhurued.com&gt;</strong>.
                  </p>
                  <form className="portal-form" onSubmit={handleCreateTask}>
                    <label>
                      Task title
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="e.g. Implement WebSocket reconnection backoff in server/app.ts"
                        required
                      />
                    </label>
                    <div className="form-grid-3">
                      <label>
                        Assign to engineer (email)
                        <input
                          type="email"
                          list="engineer-emails"
                          value={newTaskAssignee}
                          onChange={(e) => setNewTaskAssignee(e.target.value)}
                          placeholder={workspace.user.email}
                        />
                        <datalist id="engineer-emails">
                          {workspace.users.map((u) => (
                            <option key={u.id} value={u.email}>
                              {u.name}
                            </option>
                          ))}
                        </datalist>
                      </label>
                      <label>
                        Priority
                        <select
                          value={newTaskPriority}
                          onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </label>
                      <label>
                        Target files / directory
                        <input
                          type="text"
                          value={newTaskPathHint}
                          onChange={(e) => setNewTaskPathHint(e.target.value)}
                          placeholder="src/App.tsx, server/app.ts"
                        />
                      </label>
                    </div>
                    <label>
                      Detailed technical specification
                      <textarea
                        rows={4}
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                        placeholder="Describe architecture context, edge cases, and implementation details..."
                        required
                      />
                    </label>
                    <label>
                      Acceptance criteria (one per line)
                      <textarea
                        rows={3}
                        value={newTaskCriteria}
                        onChange={(e) => setNewTaskCriteria(e.target.value)}
                        placeholder={'Unit tests pass via npm test\nProduction build succeeds'}
                      />
                    </label>
                    <div className="portal-actions">
                      <button type="submit" className="button button-primary" disabled={creatingTask}>
                        <Send size={17} /> {creatingTask ? 'Assigning & emailing...' : 'Assign task & send email'}
                      </button>
                    </div>
                  </form>
                </section>
              )}

              <section className="portal-card">
                <div className="section-title-row">
                  <div>
                    <h2>{activeTab === 'my_space' ? 'Tasks in your space' : 'All workspace tasks'}</h2>
                    <p className="portal-muted">
                      Click any task to post progress writeups, ask questions, share suggestions, or ask the local{' '}
                      <code>{workspace.aiHealth.model}</code> agent.
                    </p>
                  </div>
                  <div className="portal-actions" style={{ marginTop: 0 }}>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={() => setActiveTab('transcript_ai')}
                    >
                      <Sparkles size={16} /> Generate from Transcript
                    </button>
                    {!showNewTaskForm && (
                      <button
                        type="button"
                        className="button button-primary button-compact"
                        onClick={() => setShowNewTaskForm(true)}
                      >
                        <Plus size={18} /> Assign new task
                      </button>
                    )}
                  </div>
                </div>

                {displayedTasks.length === 0 ? (
                  <p className="portal-muted" style={{ marginTop: '16px' }}>
                    No tasks found in this view yet. Use &ldquo;Assign new task&rdquo; or &ldquo;Generate from Transcript&rdquo; above.
                  </p>
                ) : (
                  <ul className="org-event-list">
                    {displayedTasks.map((task) => {
                      const isExpanded = activeTask?.id === task.id;
                      return (
                        <li
                          key={task.id}
                          className={`org-event-card ${isExpanded ? 'is-selected' : ''}`}
                        >
                          <div className="org-event-head">
                            <h3>{task.title}</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                              <span className={`status-pill is-${task.priority}`}>
                                {PRIORITY_LABELS[task.priority]} Priority
                              </span>
                              <span className={`status-pill is-${task.status === 'done' ? 'published' : task.status}`}>
                                {STATUS_LABELS[task.status]}
                              </span>
                            </div>
                          </div>

                          <p className="org-event-meta">
                            <Users size={15} /> Assigned to <strong>{task.assigneeName || task.assigneeEmail || 'Unassigned'}</strong>{' '}
                            ({task.assigneeEmail || 'unassigned'}) · By {task.assignedBy}
                          </p>
                          <p className="org-event-meta">
                            <FolderGit2 size={15} /> {task.projectName || activeProject?.name} · Path:{' '}
                            <code>{task.repoPathHint}</code> · <Clock size={14} /> Updated {formatShortTime(task.updatedAt)}
                          </p>

                          <div className="task-body-text">{task.description}</div>

                          {task.acceptanceCriteria.length > 0 && (
                            <ul className="criteria-checklist" aria-label="Acceptance criteria">
                              {task.acceptanceCriteria.map((criterion, idx) => (
                                <li key={idx}>
                                  <CheckCircle2 size={16} className="accent-icon" style={{ marginTop: '2px' }} />
                                  <span>{criterion}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Quick controls for Status & Reassignment (emails from task@uhurued.com) */}
                          <div className="moderation-controls">
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '.875rem', fontWeight: 600 }}>
                              Status:
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  void handleStatusOrAssigneeChange(task, { status: e.target.value as TaskStatus })
                                }
                              >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="in_review">In Review</option>
                                <option value="blocked">Blocked</option>
                                <option value="done">Done</option>
                              </select>
                            </label>

                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '.875rem', fontWeight: 600 }}>
                              Assign to:
                              <select
                                value={task.assigneeEmail}
                                onChange={(e) =>
                                  void handleStatusOrAssigneeChange(task, { assigneeEmail: e.target.value })
                                }
                              >
                                {workspace.users.map((u) => (
                                  <option key={u.id} value={u.email}>
                                    {u.name} ({u.email})
                                  </option>
                                ))}
                              </select>
                            </label>

                            <button
                              type="button"
                              className="button-ghost"
                              onClick={() => setSelectedTaskId(isExpanded ? null : task.id)}
                            >
                              <MessageSquare size={15} /> {task.updates.length} Writeups / Questions / AI Notes
                            </button>
                          </div>

                          {/* Writeups, Questions, Suggestions & Local AI Assist Thread */}
                          {isExpanded && (
                            <div className="writeup-thread">
                              <h4>Progress Writeups, Questions &amp; Suggestions ({task.updates.length})</h4>
                              {task.updates.map((upd) => (
                                <div
                                  key={upd.id}
                                  className={`writeup-item ${upd.kind === 'ai_note' ? 'is-ai' : ''}`}
                                >
                                  <div className="writeup-head">
                                    <strong>
                                      {upd.authorName} ({upd.authorEmail})
                                    </strong>
                                    <span className="pilot-pill">{UPDATE_KIND_LABELS[upd.kind]}</span>
                                    <span>{formatShortTime(upd.createdAt)}</span>
                                  </div>
                                  <div className="task-body-text">{upd.content}</div>
                                </div>
                              ))}

                              <form
                                className="portal-form"
                                style={{ marginTop: '8px' }}
                                onSubmit={(e) => void handlePostUpdate(e, task.id)}
                              >
                                <div className="form-grid-2">
                                  <label>
                                    Entry type
                                    <select
                                      value={updateKind}
                                      onChange={(e) => setUpdateKind(e.target.value as UpdateKind)}
                                    >
                                      <option value="progress">Progress Writeup</option>
                                      <option value="question">Engineering Question</option>
                                      <option value="suggestion">Architecture Suggestion</option>
                                    </select>
                                  </label>
                                  <label>
                                    Ask Local Uncensored AI ({workspace.aiHealth.model})
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <input
                                        type="text"
                                        value={aiQuestionPrompt}
                                        onChange={(e) => setAiQuestionPrompt(e.target.value)}
                                        placeholder="Ask local model for code pointers or tests..."
                                      />
                                      <button
                                        type="button"
                                        className="button-ghost"
                                        disabled={askingAi}
                                        onClick={() => void handleAskLocalAi(task.id)}
                                      >
                                        <Bot size={16} /> {askingAi ? 'Thinking...' : 'Ask AI'}
                                      </button>
                                    </div>
                                  </label>
                                </div>
                                <label>
                                  Your progress writeup, question, or suggestion
                                  <textarea
                                    rows={3}
                                    value={updateContent}
                                    onChange={(e) => setUpdateContent(e.target.value)}
                                    placeholder="Share what you shipped, paste a PR link, ask a question, or propose a suggestion..."
                                    required
                                  />
                                </label>
                                <div className="portal-actions" style={{ marginTop: 0 }}>
                                  <button
                                    type="submit"
                                    className="button button-primary button-compact"
                                    disabled={postingUpdate}
                                  >
                                    <Send size={16} /> {postingUpdate ? 'Posting...' : `Post ${UPDATE_KIND_LABELS[updateKind]}`}
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* TAB 3: AI TRANSCRIPT STUDIO */}
          {activeTab === 'transcript_ai' && (
            <div className="portal-stack">
              <section className="portal-card">
                <div className="section-title-row">
                  <div>
                    <h2>Transcript-to-Task AI Studio</h2>
                    <p className="portal-muted">
                      Paste a meeting transcript, voice memo, or rough notes. Your local uncensored model (
                      <code>{workspace.aiHealth.model}</code> on port <code>8083</code> via{' '}
                      <code>{workspace.aiHealth.activeEndpoint}</code>) will write detailed titles, technical specs, and
                      acceptance criteria that you can assign to any user with one click.
                    </p>
                  </div>
                </div>

                <div className="portal-form" style={{ marginTop: '16px' }}>
                  <div className="form-grid-2">
                    <label>
                      Target repository
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                      >
                        {workspace.projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Default assignee email (optional — emails from task@uhurued.com)
                      <input
                        type="email"
                        list="engineer-emails-transcript"
                        value={transcriptAssignee}
                        onChange={(e) => setTranscriptAssignee(e.target.value)}
                        placeholder={workspace.user.email}
                      />
                      <datalist id="engineer-emails-transcript">
                        {workspace.users.map((u) => (
                          <option key={u.id} value={u.email}>
                            {u.name}
                          </option>
                        ))}
                      </datalist>
                    </label>
                  </div>

                  <label>
                    Meeting transcript or raw engineering notes
                    <textarea
                      rows={6}
                      value={transcriptText}
                      onChange={(e) => setTranscriptText(e.target.value)}
                      placeholder="Paste your voice transcript, Slack thread, or architecture notes here..."
                    />
                  </label>

                  <div className="portal-actions">
                    <button
                      type="button"
                      className="button button-primary"
                      disabled={synthesizing}
                      onClick={() => void handleSynthesizeTranscript(false)}
                    >
                      <Sparkles size={18} />{' '}
                      {synthesizing ? 'Synthesizing with Local Qwen3.6-Heretic...' : 'Draft Detailed Tasks with Local AI'}
                    </button>
                    <button
                      type="button"
                      className="button button-surface"
                      disabled={synthesizing}
                      onClick={() => void handleSynthesizeTranscript(true)}
                    >
                      <Send size={17} /> Synthesize &amp; Auto-Assign All Immediately
                    </button>
                  </div>
                </div>
              </section>

              {drafts.length > 0 && (
                <section className="portal-card">
                  <h2>Generated Task Specifications ({drafts.length})</h2>
                  <p className="portal-muted">
                    Review the generated tasks below and assign each one to any engineer (sends an Out There email from{' '}
                    <code>task@uhurued.com</code>).
                  </p>
                  <ul className="org-event-list">
                    {drafts.map((draft, idx) => (
                      <li key={idx} className="org-event-card">
                        <div className="org-event-head">
                          <h3>{draft.title}</h3>
                          <span className={`status-pill is-${draft.priority}`}>
                            {PRIORITY_LABELS[draft.priority]} Priority
                          </span>
                        </div>
                        <p className="org-event-meta">
                          <FolderGit2 size={15} /> Path hint: <code>{draft.repoPathHint}</code>
                        </p>
                        <div className="task-body-text">{draft.description}</div>
                        {draft.acceptanceCriteria.length > 0 && (
                          <ul className="criteria-checklist">
                            {draft.acceptanceCriteria.map((c, cIdx) => (
                              <li key={cIdx}>
                                <CheckCircle2 size={16} className="accent-icon" />
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="org-event-actions">
                          <button
                            type="button"
                            className="button button-primary button-compact"
                            disabled={assigningDraftIdx === idx}
                            onClick={() => void handleAssignSynthesizedDraft(draft, idx)}
                          >
                            <Send size={15} />{' '}
                            {assigningDraftIdx === idx
                              ? 'Assigning & Emailing...'
                              : `Assign to ${draft.suggestedAssigneeEmail || transcriptAssignee || workspace.user.email}`}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {/* TAB 4: REPOS & .ENV VAULT */}
          {activeTab === 'repos_env' && activeProject && (
            <div className="portal-stack">
              <section className="portal-card">
                <div className="section-title-row">
                  <div>
                    <h2>{activeProject.name} — GitHub Clone &amp; Setup</h2>
                    <p className="portal-muted">{activeProject.description}</p>
                  </div>
                  <div className="portal-actions" style={{ marginTop: 0 }}>
                    <a
                      className="button-ghost"
                      href={activeProject.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={15} /> Open on GitHub
                    </a>
                    <button
                      type="button"
                      className="button button-primary button-compact"
                      onClick={() => setShowAddRepoForm((v) => !v)}
                    >
                      <Plus size={17} /> {showAddRepoForm ? 'Close form' : 'Link another repo'}
                    </button>
                  </div>
                </div>

                {showAddRepoForm && (
                  <form
                    className="portal-form"
                    style={{ marginTop: '18px', paddingBottom: '18px', borderBottom: '1px solid var(--line)' }}
                    onSubmit={handleAddRepo}
                  >
                    <div className="form-grid-2">
                      <label>
                        Repository / project name
                        <input
                          type="text"
                          value={newRepoName}
                          onChange={(e) => setNewRepoName(e.target.value)}
                          placeholder="e.g. Uhurued Core API"
                          required
                        />
                      </label>
                      <label>
                        GitHub repository URL
                        <input
                          type="url"
                          value={newRepoUrl}
                          onChange={(e) => setNewRepoUrl(e.target.value)}
                          placeholder="https://github.com/2024frank/repo"
                          required
                        />
                      </label>
                    </div>
                    <div className="form-grid-2">
                      <label>
                        Short description
                        <input
                          type="text"
                          value={newRepoDesc}
                          onChange={(e) => setNewRepoDesc(e.target.value)}
                          placeholder="Service description"
                        />
                      </label>
                      <label>
                        Local path on Kusi&apos;s machine (for DeepSeek Harness)
                        <input
                          type="text"
                          value={newRepoLocalPath}
                          onChange={(e) => setNewRepoLocalPath(e.target.value)}
                          placeholder="/home/kusi/Desktop/Dev/..."
                        />
                      </label>
                    </div>
                    <label>
                      Onboarding &amp; setup instructions
                      <textarea
                        rows={3}
                        value={newRepoInstructions}
                        onChange={(e) => setNewRepoInstructions(e.target.value)}
                        placeholder="1. git clone ...\n2. Copy .env.local\n3. npm install && npm run dev"
                      />
                    </label>
                    <div className="portal-actions">
                      <button type="submit" className="button button-primary button-compact">
                        Save repository
                      </button>
                    </div>
                  </form>
                )}

                <div style={{ display: 'grid', gap: '14px', marginTop: '18px' }}>
                  <div>
                    <div className="section-title-row">
                      <h3>
                        <Terminal size={16} /> One-line Git Clone Command
                      </h3>
                      <button
                        type="button"
                        className="button-ghost"
                        onClick={() => void copyText('clone-cmd', activeProject.cloneCommand)}
                      >
                        {copiedId === 'clone-cmd' ? (
                          <>
                            <Check size={15} /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={15} /> Copy command
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="code-box">{activeProject.cloneCommand}</pre>
                  </div>

                  <div>
                    <h3>
                      <GitBranch size={16} /> Engineer Setup Instructions (branch: {activeProject.defaultBranch})
                    </h3>
                    <pre className="code-box" style={{ marginTop: '8px' }}>
                      {activeProject.setupInstructions}
                    </pre>
                  </div>
                </div>
              </section>

              <section className="portal-card">
                <div className="section-title-row">
                  <div>
                    <h2>Shared .env Configuration Vault — {activeProject.name}</h2>
                    <p className="portal-muted">
                      Last updated {formatShortTime(activeProject.envUpdatedAt)} by {activeProject.envUpdatedBy}. Line
                      endings are automatically normalized to LF (<code>\n</code>).
                    </p>
                  </div>
                  <div className="portal-actions" style={{ marginTop: 0 }}>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={() => void copyText('env-vault', envDraft)}
                    >
                      {copiedId === 'env-vault' ? (
                        <>
                          <Check size={15} /> Copied .env
                        </>
                      ) : (
                        <>
                          <Copy size={15} /> Copy .env
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="button-ghost"
                      onClick={() => handleDownloadEnv(activeProject)}
                    >
                      <Download size={15} /> Download .env
                    </button>
                    <button
                      type="button"
                      className="button button-primary button-compact"
                      disabled={savingEnv}
                      onClick={() => void handleSaveEnv(activeProject)}
                    >
                      {savingEnv ? 'Saving...' : 'Save .env Vault'}
                    </button>
                  </div>
                </div>

                <div className="portal-form" style={{ marginTop: '14px' }}>
                  <label>
                    Environment variables (.env.local)
                    <textarea
                      className="env-textarea"
                      value={envDraft}
                      onChange={(e) => setEnvDraft(e.target.value)}
                      rows={10}
                    />
                  </label>
                </div>
              </section>
            </div>
          )}

          {/* TAB 5: BUG REPORTS & DEEPSEEK HARNESS AUTO-FIX */}
          {activeTab === 'bugs' && (
            <div className="portal-stack">
              <section className="portal-card">
                <div className="section-title-row">
                  <div>
                    <h2>Bug Reports &amp; DeepSeek Harness Autonomous Agent</h2>
                    <p className="portal-muted">
                      Filing a bug report immediately runs root-cause triage on your local uncensored model (
                      <code>{workspace.aiHealth.model}</code> on port <code>8083</code>) and wakes the{' '}
                      <code>task-tracker-ops</code> plugin inside DeepSeek Harness (port <code>3080</code>) to patch the
                      code, run tests, and post the verification output here.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button-primary button-compact"
                    onClick={() => setShowBugForm((v) => !v)}
                  >
                    <Plus size={18} /> {showBugForm ? 'Close form' : 'Report a bug'}
                  </button>
                </div>

                {showBugForm && (
                  <form className="portal-form" style={{ marginTop: '18px' }} onSubmit={handleCreateBug}>
                    <div className="form-grid-2">
                      <label>
                        Bug title
                        <input
                          type="text"
                          value={bugTitle}
                          onChange={(e) => setBugTitle(e.target.value)}
                          placeholder="e.g. Race condition when refreshing token on slow 3G"
                          required
                        />
                      </label>
                      <label>
                        Severity
                        <select
                          value={bugSeverity}
                          onChange={(e) => setBugSeverity(e.target.value as BugSeverity)}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      What happened?
                      <textarea
                        rows={3}
                        value={bugDesc}
                        onChange={(e) => setBugDesc(e.target.value)}
                        placeholder="Describe expected vs. actual behavior..."
                        required
                      />
                    </label>
                    <div className="form-grid-2">
                      <label>
                        Suspected file paths (optional)
                        <input
                          type="text"
                          value={bugFiles}
                          onChange={(e) => setBugFiles(e.target.value)}
                          placeholder="server/app.ts, src/App.tsx"
                        />
                      </label>
                      <label>
                        Reproduction steps (optional)
                        <input
                          type="text"
                          value={bugRepro}
                          onChange={(e) => setBugRepro(e.target.value)}
                          placeholder="1. Open /api/workspace 2. Trigger concurrent requests"
                        />
                      </label>
                    </div>
                    <label>
                      Stack trace or terminal log (optional)
                      <textarea
                        rows={3}
                        value={bugStack}
                        onChange={(e) => setBugStack(e.target.value)}
                        placeholder="Paste stack trace or error output..."
                      />
                    </label>
                    <div className="portal-actions">
                      <button type="submit" className="button button-primary" disabled={submittingBug}>
                        <Wrench size={17} />{' '}
                        {submittingBug
                          ? 'Triaging with Local Qwen3.6-Heretic...'
                          : 'Submit Bug & Trigger Autonomous Fix'}
                      </button>
                    </div>
                  </form>
                )}

                <ul className="org-event-list">
                  {workspace.bugs.map((bug) => (
                    <li key={bug.id} className="org-event-card">
                      <div className="org-event-head">
                        <h3>{bug.title}</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <span className={`status-pill is-${bug.severity}`}>{bug.severity}</span>
                          <span className={`status-pill is-${bug.status === 'resolved' ? 'published' : bug.status}`}>
                            {BUG_STATUS_LABELS[bug.status]}
                          </span>
                        </div>
                      </div>
                      <p className="org-event-meta">
                        <FolderGit2 size={15} /> {bug.projectName} · Reported by {bug.reporterName} ({bug.reporterEmail}) ·
                        Agent: <code>{bug.agentAssigned}</code>
                      </p>
                      <div className="task-body-text">{bug.description}</div>

                      {bug.agentFixSummary && (
                        <div className="writeup-item is-ai">
                          <div className="writeup-head">
                            <strong>
                              <Bot size={14} /> Automated Triage &amp; Fix Plan ({workspace.aiHealth.model})
                            </strong>
                            <span>Updated {formatShortTime(bug.updatedAt)}</span>
                          </div>
                          <div className="task-body-text">{bug.agentFixSummary}</div>
                        </div>
                      )}

                      {bug.agentTestOutput && (
                        <div>
                          <strong style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
                            Automated Test Verification Output:
                          </strong>
                          <pre className="code-box" style={{ marginTop: '6px' }}>
                            {bug.agentTestOutput}
                          </pre>
                        </div>
                      )}

                      <div className="org-event-actions">
                        <button
                          type="button"
                          className="button button-primary button-compact"
                          disabled={dispatchingBugId === bug.id}
                          onClick={() => void handleDispatchDsh(bug)}
                        >
                          <Wrench size={15} />{' '}
                          {dispatchingBugId === bug.id
                            ? 'Running Local AI & DSH...'
                            : 'Re-Run DeepSeek Harness Auto-Fix'}
                        </button>
                        {bug.status !== 'resolved' && (
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() => void handleUpdateBugStatus(bug, 'resolved')}
                          >
                            <CheckCircle2 size={15} /> Mark Resolved
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {/* TAB 6: TEAM ACCESS */}
          {activeTab === 'team' && (
            <div className="portal-stack">
              <section className="portal-card">
                <h2>Engineering Team &amp; Collaborators</h2>
                <p className="portal-muted">
                  Add engineers so you or the local AI can assign tasks to them and send notifications from{' '}
                  <strong>Out There &lt;task@uhurued.com&gt;</strong>.
                </p>

                <form className="portal-form" style={{ marginTop: '18px' }} onSubmit={handleInviteMember}>
                  <div className="form-grid-3">
                    <label>
                      Engineer email
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="engineer@uhurued.com"
                        required
                      />
                    </label>
                    <label>
                      Display name
                      <input
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="Ada Lovelace"
                      />
                    </label>
                    <label>
                      GitHub handle
                      <input
                        type="text"
                        value={inviteGithub}
                        onChange={(e) => setInviteGithub(e.target.value)}
                        placeholder="adalovelace"
                      />
                    </label>
                  </div>
                  <div className="portal-actions">
                    <button type="submit" className="button button-primary button-compact" disabled={inviting}>
                      <Plus size={17} /> {inviting ? 'Adding...' : 'Add engineer to workspace'}
                    </button>
                  </div>
                </form>

                <ul className="member-list">
                  {workspace.users.map((member) => (
                    <li key={member.id} className="member-row">
                      <div>
                        <strong>{member.name}</strong>
                        <span className="portal-muted"> · {member.email}</span>
                        {member.githubHandle && (
                          <span className="portal-muted"> · @{member.githubHandle}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="role-pill">{member.role === 'admin' ? 'Admin' : 'Engineer'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          <section className="portal-card definitions-strip" aria-label="Local AI and email configuration">
            <p>
              <strong>Always-On Local Uncensored AI:</strong> Connected to{' '}
              <em>{workspace.aiHealth.model}</em> on port <code>8083</code> via{' '}
              <code>{workspace.aiHealth.activeEndpoint}</code>.
            </p>
            <p>
              <strong>Outbound Email &amp; DeepSeek Harness:</strong> Sign-in codes and task assignments are sent from{' '}
              <em>Out There &lt;task@uhurued.com&gt;</em> using the Out There one-tone forest green &amp; gold template.
              Bug reports wake the <code>task-tracker-ops</code> plugin on DeepSeek Harness (port <code>3080</code>).
            </p>
          </section>
        </div>

        {toast && (
          <div className="portal-snackbar" role="status" aria-live="polite">
            <CheckCircle2 size={18} /> {toast}
            <button type="button" aria-label="Dismiss" onClick={() => setToast('')}>
              ×
            </button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
export default App;
