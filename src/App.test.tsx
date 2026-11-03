import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTrackerApp } from '../server/app';
import { MemoryTrackerStore } from '../server/store';
import { codeEmailHtml, DEFAULT_SENDER, normalizeTrackerSender, taskAssignedEmailHtml } from '../server/email';
import { App } from './App';
import { TrackerApiClient } from './api';

describe('Out There Task Tracker — Email Template & API (task@uhurued.com)', () => {
  it('formats sign-in and task assignment emails using Out There one-tone #122218/#FFD75B layout from task@uhurued.com', () => {
    expect(DEFAULT_SENDER).toBe('Out There <task@uhurued.com>');
    expect(normalizeTrackerSender('anything@example.com')).toBe('Out There <task@uhurued.com>');
    expect(normalizeTrackerSender('Uhurued Tracker <tracker@uhurued.com>')).toBe('Out There <task@uhurued.com>');

    const otpHtml = codeEmailHtml('654321');
    expect(otpHtml).toContain('#122218');
    expect(otpHtml).toContain('#FFD75B');
    expect(otpHtml).toContain('654321');
    expect(otpHtml).toContain('task.uhurued.com');

    const assignedHtml = taskAssignedEmailHtml({
      toEmail: 'engineer@uhurued.com',
      taskTitle: 'Migrate WebSocket handler',
      taskDescription: 'Update connection pool retry logic.',
      priority: 'high',
      projectName: 'Out There',
      repoUrl: 'https://github.com/Sankofa-Robotics/out-there',
      assignedBy: 'fkusiapp@oberlin.edu',
    });
    expect(assignedHtml).toContain('Migrate WebSocket handler');
    expect(assignedHtml).toContain('task@uhurued.com');
    expect(assignedHtml).toContain('https://github.com/Sankofa-Robotics/out-there');
  });

  it('supports email-code signup, transcript-to-task synthesis, progress writeups, .env sharing, and bug triage', async () => {
    const store = new MemoryTrackerStore();
    const sentEmails: string[] = [];
    const app = createTrackerApp({
      store,
      mailer: {
        async sendCode(_email, code) {
          return { delivered: false, previewCode: code };
        },
        async sendTaskAssigned(notice) {
          sentEmails.push(notice.toEmail);
          return { delivered: true };
        },
      },
    });

    // 1. Request OTP code
    const reqRes = await app.request('/api/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'collab@uhurued.com' }),
    });
    expect(reqRes.status).toBe(200);
    const reqBody = await reqRes.json();
    expect(reqBody.sender).toBe('Out There <task@uhurued.com>');
    expect(reqBody.previewCode).toMatch(/^\d{6}$/);

    // 2. Verify OTP and create session
    const verRes = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'collab@uhurued.com',
        code: reqBody.previewCode,
        name: 'Kwaku Collaborator',
        githubHandle: 'kwaku-dev',
      }),
    });
    expect(verRes.status).toBe(200);
    const { token, user } = await verRes.json();
    expect(user.name).toBe('Kwaku Collaborator');

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 3. Create & assign a task and verify email notice is triggered
    const taskRes = await app.request('/api/tasks', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        projectId: 'proj_task_tracker',
        title: 'Add .env vault encryption check',
        description: 'Ensure .env files normalize line endings before download.',
        priority: 'high',
        assigneeEmail: 'collab@uhurued.com',
      }),
    });
    expect(taskRes.status).toBe(200);
    const taskData = await taskRes.json();
    expect(taskData.task.title).toBe('Add .env vault encryption check');
    expect(sentEmails).toContain('collab@uhurued.com');

    // 4. Post a progress writeup & question on the task
    const updRes = await app.request(`/api/tasks/${taskData.task.id}/updates`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        kind: 'progress',
        content: 'Implemented LF normalization and added unit test coverage.',
      }),
    });
    expect(updRes.status).toBe(200);
    const updData = await updRes.json();
    expect(updData.task.updates).toHaveLength(1);
    expect(updData.task.updates[0].content).toContain('Implemented LF normalization');

    // 5. Update shared .env vault
    const envRes = await app.request('/api/projects/proj_task_tracker/env', {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        envContent: 'VITE_API_URL=https://task.uhurued.com/api\r\nLOCAL_MODEL_ID=qwen3.6-35b-a3b-heretic',
      }),
    });
    expect(envRes.status).toBe(200);
    const envData = await envRes.json();
    expect(envData.project.envContent).toBe(
      'VITE_API_URL=https://task.uhurued.com/api\nLOCAL_MODEL_ID=qwen3.6-35b-a3b-heretic',
    );

    // 6. File a bug report and verify autonomous triage
    const bugRes = await app.request('/api/bugs', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        projectId: 'proj_task_tracker',
        title: 'Fix mobile table scroll overflow on 390px viewport',
        description: 'Task table overflows horizontally when long URLs are unbreakable.',
        severity: 'high',
        filePaths: 'src/styles.css',
      }),
    });
    expect(bugRes.status).toBe(200);
    const bugData = await bugRes.json();
    expect(bugData.bug.status).toBe('triaging');
    expect(bugData.bug.agentFixSummary.length).toBeGreaterThan(10);
  });

  it('renders the Out There sign-in flow and enters the collaborative workspace', async () => {
    const store = new MemoryTrackerStore();
    const honoApp = createTrackerApp({
      store,
      mailer: {
        async sendCode(_email, code) {
          return { delivered: false, previewCode: code };
        },
        async sendTaskAssigned() {
          return { delivered: true };
        },
      },
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith('/api')) {
        return honoApp.request(url, init);
      }
      return originalFetch(input as RequestInfo, init);
    };

    try {
      const api = new TrackerApiClient('/api');
      api.setToken(null);
      render(<App api={api} />);

      expect(screen.getByText(/Engineering Workspace Sign-In/i)).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/Work or university email/i);
      await userEvent.type(emailInput, 'fkusiapp@oberlin.edu');
      await userEvent.click(screen.getByRole('button', { name: /Email a 6-digit sign-in code/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /Enter Engineering Space/i }));

      await waitFor(() => {
        expect(screen.getByText(/Engineering Space/i)).toBeInTheDocument();
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
