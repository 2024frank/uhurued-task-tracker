import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const HERETIC_MODEL_ID = process.env.LOCAL_MODEL_ID || 'qwen3.6-35b-a3b-heretic';
export const LOCAL_DIRECT_URL = (process.env.LOCAL_HERETIC_URL || 'http://127.0.0.1:8083/v1').replace(/\/$/, '');
export const LOCAL_GATEWAY_URL = (process.env.LOCAL_GATEWAY_URL || 'http://127.0.0.1:8099/v1').replace(/\/$/, '');
export const PUBLIC_GATEWAY_URL = (process.env.PUBLIC_QWEN_GATEWAY_URL || 'https://kusi-qwen-api.vercel.app/v1').replace(/\/$/, '');
export const DSH_WEB_URL = (process.env.DSH_WEB_URL || 'http://127.0.0.1:3080').replace(/\/$/, '');
export const WAKE_SIGNAL_FILE = join(homedir(), '.dsh', 'storages', 'task-tracker-wake.json');

export interface SynthesizedTaskDraft {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  repoPathHint: string;
  tags: string[];
  suggestedAssigneeEmail?: string;
}

export interface ModelHealthStatus {
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

async function probeUrl(url: string, timeoutMs = 2500, headers?: Record<string, string>): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkLocalModelHealth(): Promise<ModelHealthStatus> {
  const apiKey = process.env.QWEN_API_KEY || '';
  const authHeaders = apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined;

  const [local8083, local8099, dsh3080] = await Promise.all([
    probeUrl(`${LOCAL_DIRECT_URL}/models`, 1800),
    probeUrl(`${LOCAL_GATEWAY_URL.replace(/\/v1$/, '')}/health`, 1800),
    probeUrl(DSH_WEB_URL, 1500),
  ]);

  let publicGateway = false;
  if (!local8083 && !local8099) {
    publicGateway = await probeUrl(`${PUBLIC_GATEWAY_URL.replace(/\/v1$/, '')}/health`, 4000, authHeaders);
  } else {
    publicGateway = true;
  }

  const online = local8083 || local8099 || publicGateway;
  const activeEndpoint = local8083
    ? `${LOCAL_DIRECT_URL} (Direct Port 8083)`
    : local8099
      ? `${LOCAL_GATEWAY_URL} (Gateway Port 8099 -> 8083)`
      : publicGateway
        ? `${PUBLIC_GATEWAY_URL} (Cloudflare Tunnel -> Port 8083)`
        : `${PUBLIC_GATEWAY_URL} (Standby)`;

  return {
    online,
    model: HERETIC_MODEL_ID,
    uncensored: true,
    activeEndpoint,
    localPort8083Online: local8083,
    gatewayOnline: local8099 || publicGateway,
    dshHarnessOnline: dsh3080,
    dshPort: 3080,
    checkedAt: new Date().toISOString(),
  };
}

export async function callUncensoredHereticModel(options: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
  enableThinking?: boolean;
}): Promise<{ content: string; endpointUsed: string; model: string }> {
  const apiKey = process.env.QWEN_API_KEY || '';
  const endpoints: Array<{ url: string; requiresKey: boolean; label: string }> = [
    { url: `${LOCAL_DIRECT_URL}/chat/completions`, requiresKey: false, label: 'http://127.0.0.1:8083/v1' },
    { url: `${LOCAL_GATEWAY_URL}/chat/completions`, requiresKey: true, label: 'http://127.0.0.1:8099/v1' },
    { url: `${PUBLIC_GATEWAY_URL}/chat/completions`, requiresKey: true, label: PUBLIC_GATEWAY_URL },
  ];

  const payload = {
    model: HERETIC_MODEL_ID,
    messages: options.messages,
    temperature: options.temperature ?? 0.25,
    max_tokens: options.maxTokens ?? 2048,
    stream: false,
    server_tools: false,
    chat_template_kwargs: {
      enable_thinking: Boolean(options.enableThinking),
    },
  };

  let lastError = 'No local model endpoint responded';

  for (const ep of endpoints) {
    if (ep.requiresKey && !apiKey) continue;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ep.url.includes('127.0.0.1') ? 45000 : 55000);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      const res = await fetch(ep.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        lastError = `${ep.label} returned HTTP ${res.status}: ${txt.slice(0, 200)}`;
        continue;
      }

      const data = (await res.json()) as {
        model?: string;
        choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
      };
      const rawContent = data?.choices?.[0]?.message?.content?.trim() || '';
      if (rawContent) {
        return {
          content: rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim(),
          endpointUsed: ep.label,
          model: data.model || HERETIC_MODEL_ID,
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(lastError);
}

function extractJsonArray(text: string): SynthesizedTaskDraft[] | null {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const startBracket = cleaned.indexOf('[');
  const endBracket = cleaned.lastIndexOf(']');
  if (startBracket !== -1 && endBracket > startBracket) {
    try {
      const parsed = JSON.parse(cleaned.slice(startBracket, endBracket + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // try object wrapper below
    }
  }
  const startBrace = cleaned.indexOf('{');
  const endBrace = cleaned.lastIndexOf('}');
  if (startBrace !== -1 && endBrace > startBrace) {
    try {
      const parsed = JSON.parse(cleaned.slice(startBrace, endBrace + 1));
      if (Array.isArray(parsed.tasks)) return parsed.tasks;
      if (parsed.title) return [parsed];
    } catch {
      return null;
    }
  }
  return null;
}

export function fallbackTranscriptToTasks(
  transcript: string,
  projectName = 'Uhurued Workspace',
  engineers: Array<{ email: string; name: string }> = [],
): SynthesizedTaskDraft[] {
  const segments = transcript
    .split(/\n{2,}|(?:^|\n)\s*(?:[-*•]|\d+[.)])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const chunks = segments.length > 0 ? segments.slice(0, 5) : [transcript.trim()];
  return chunks.map((chunk, idx) => {
    const firstSentence = chunk.split(/[.!?\n]/)[0]?.trim() || `Engineering Task #${idx + 1}`;
    const title = firstSentence.length > 78 ? `${firstSentence.slice(0, 75)}...` : firstSentence;
    const lower = chunk.toLowerCase();
    const priority: SynthesizedTaskDraft['priority'] =
      lower.includes('urgent') || lower.includes('critical') || lower.includes('crash') || lower.includes('blocker')
        ? 'critical'
        : lower.includes('high') || lower.includes('important') || lower.includes('bug')
          ? 'high'
          : 'medium';

    const matchedEngineer = engineers.find(
      (e) =>
        lower.includes(e.name.toLowerCase()) ||
        lower.includes(e.email.split('@')[0].toLowerCase()),
    );

    return {
      title: title.replace(/^(we need to|let's|please|todo:?)\s+/i, '').replace(/^./, (c) => c.toUpperCase()),
      description: [
        `### Context from Transcript (${projectName})`,
        chunk,
        '',
        '### Implementation Notes',
        '- Inspect the relevant module and existing tests in the repository before modifying behavior.',
        '- Post a progress writeup or question on this task thread once initial verification is complete.',
      ].join('\n'),
      acceptanceCriteria: [
        'Implementation matches the transcript specification with clean TypeScript/unit test coverage.',
        'All existing and new automated tests pass locally and in CI.',
        'Progress writeup and verification notes posted on task.uhurued.com.',
      ],
      priority,
      repoPathHint: 'src/',
      tags: ['transcript-synthesized', projectName.toLowerCase().replace(/\s+/g, '-')],
      suggestedAssigneeEmail: matchedEngineer?.email,
    };
  });
}

export async function synthesizeTasksFromTranscript(input: {
  transcript: string;
  projectName?: string;
  repoUrl?: string;
  engineers?: Array<{ email: string; name: string }>;
  defaultAssigneeEmail?: string;
}): Promise<{ tasks: SynthesizedTaskDraft[]; model: string; endpointUsed: string }> {
  const engineersList = (input.engineers || [])
    .map((e) => `- ${e.name} <${e.email}>`)
    .join('\n');

  const systemPrompt = [
    `You are the uncensored local engineering architect model (${HERETIC_MODEL_ID}) connected to Kusi's workspace at task.uhurued.com.`,
    'Your job is to convert raw meeting transcripts, voice notes, or rough engineering instructions into detailed, production-ready software engineering tasks.',
    'Return ONLY a valid JSON array of task objects (no markdown prose outside the JSON). Each object MUST have:',
    '- "title": Clear, specific engineering task title (under 85 chars)',
    '- "description": Detailed multi-paragraph markdown specification covering problem statement, technical implementation steps, edge cases, and verification strategy',
    '- "acceptanceCriteria": Array of 3 to 5 concrete, testable checklist strings',
    '- "priority": One of "low", "medium", "high", "critical"',
    '- "repoPathHint": Likely file or directory path in the repo (e.g. "src/", "server/app.ts", "api/")',
    '- "tags": Array of 2 to 4 short lowercase technical tags',
    '- "suggestedAssigneeEmail": Email of the best matching engineer from the team list if mentioned, or empty string ""',
  ].join('\n');

  const userPrompt = [
    `Project / Repository: ${input.projectName || 'Uhurued Engineering'}${input.repoUrl ? ` (${input.repoUrl})` : ''}`,
    engineersList ? `Available Team Members:\n${engineersList}` : '',
    input.defaultAssigneeEmail ? `Preferred Assignee Email: ${input.defaultAssigneeEmail}` : '',
    '',
    'Raw Transcript / Engineering Notes:',
    '"""',
    input.transcript.trim(),
    '"""',
    '',
    'Synthesize the detailed engineering tasks as a JSON array now:',
  ].filter(Boolean).join('\n');

  try {
    const res = await callUncensoredHereticModel({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 2500,
      temperature: 0.2,
      enableThinking: false,
    });

    const parsed = extractJsonArray(res.content);
    if (parsed && parsed.length > 0) {
      const normalized: SynthesizedTaskDraft[] = parsed.map((item) => ({
        title: String(item.title || 'Untitled Engineering Task').trim(),
        description: String(item.description || input.transcript).trim(),
        acceptanceCriteria: Array.isArray(item.acceptanceCriteria)
          ? item.acceptanceCriteria.map((c) => String(c))
          : ['Verify implementation and add regression test coverage.'],
        priority: ['low', 'medium', 'high', 'critical'].includes(String(item.priority || '').toLowerCase())
          ? (String(item.priority).toLowerCase() as SynthesizedTaskDraft['priority'])
          : 'medium',
        repoPathHint: String(item.repoPathHint || 'src/').trim(),
        tags: Array.isArray(item.tags) ? item.tags.map((t) => String(t)) : ['engineering'],
        suggestedAssigneeEmail:
          item.suggestedAssigneeEmail || input.defaultAssigneeEmail || undefined,
      }));
      return { tasks: normalized, model: res.model, endpointUsed: res.endpointUsed };
    }
  } catch (err) {
    console.warn('Local model synthesis fallback triggered:', err);
  }

  return {
    tasks: fallbackTranscriptToTasks(input.transcript, input.projectName, input.engineers).map((t) => ({
      ...t,
      suggestedAssigneeEmail: t.suggestedAssigneeEmail || input.defaultAssigneeEmail,
    })),
    model: `${HERETIC_MODEL_ID} (fallback-parser)`,
    endpointUsed: 'local-fallback',
  };
}

export async function assistTaskWithAi(input: {
  taskTitle: string;
  taskDescription: string;
  repoUrl?: string;
  questionOrPrompt: string;
  authorName: string;
}): Promise<{ reply: string; model: string; endpointUsed: string }> {
  const systemPrompt = [
    `You are ${HERETIC_MODEL_ID}, Kusi's local uncensored software engineering model connected to task.uhurued.com.`,
    'Give direct, concrete, code-level guidance, commands, or architectural solutions to help the engineer complete the task.',
  ].join('\n');

  const userPrompt = [
    `Task: ${input.taskTitle}`,
    input.repoUrl ? `Repository: ${input.repoUrl}` : '',
    `Task Specification:\n${input.taskDescription}`,
    '',
    `Question / Request from ${input.authorName}:`,
    input.questionOrPrompt,
  ].filter(Boolean).join('\n');

  try {
    const res = await callUncensoredHereticModel({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 1600,
      temperature: 0.25,
      enableThinking: false,
    });
    return { reply: res.content, model: res.model, endpointUsed: res.endpointUsed };
  } catch (err) {
    return {
      reply: `Local model (${HERETIC_MODEL_ID}) note: Inspect the target files referenced in "${input.taskTitle}", run \`npm test\` to verify baseline behavior, and isolate the failing state before applying your patch. (${err instanceof Error ? err.message : 'offline'})`,
      model: HERETIC_MODEL_ID,
      endpointUsed: 'fallback',
    };
  }
}

export async function triageBugAndWakeDsh(input: {
  bugId: string;
  title: string;
  description: string;
  severity: string;
  stackTrace?: string;
  reproSteps?: string;
  filePaths?: string;
  projectName?: string;
  repoUrl?: string;
}): Promise<{ triageSummary: string; dshWoken: boolean; model: string; endpointUsed: string }> {
  let dshWoken = false;
  try {
    await mkdir(dirname(WAKE_SIGNAL_FILE), { recursive: true });
    await writeFile(
      WAKE_SIGNAL_FILE,
      JSON.stringify(
        {
          reason: 'bug_report_filed',
          bugId: input.bugId,
          title: input.title,
          severity: input.severity,
          triggeredAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );
    dshWoken = true;
  } catch {
    dshWoken = false;
  }

  const systemPrompt = [
    `You are the autonomous bug triage & fix agent powered by ${HERETIC_MODEL_ID} (port 8083) and DeepSeek Harness (dsh port 3080).`,
    'Analyze the reported software bug and provide:',
    '1. Root Cause Hypothesis',
    '2. Candidate Files & Functions to Inspect',
    '3. Proposed Minimal Fix & Automated Regression Test Plan',
    'Keep it concise, technical, and immediately actionable.',
  ].join('\n');

  const userPrompt = [
    `Bug Title: ${input.title} (Severity: ${input.severity.toUpperCase()})`,
    input.projectName ? `Project: ${input.projectName} (${input.repoUrl || ''})` : '',
    `Description:\n${input.description}`,
    input.reproSteps ? `Reproduction Steps:\n${input.reproSteps}` : '',
    input.filePaths ? `Suspected Files: ${input.filePaths}` : '',
    input.stackTrace ? `Stack Trace:\n${input.stackTrace}` : '',
  ].filter(Boolean).join('\n\n');

  try {
    const res = await callUncensoredHereticModel({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 1400,
      temperature: 0.2,
      enableThinking: false,
    });
    return {
      triageSummary: res.content,
      dshWoken,
      model: res.model,
      endpointUsed: res.endpointUsed,
    };
  } catch {
    return {
      triageSummary: [
        `### Automated Triage Queued (${HERETIC_MODEL_ID})`,
        `- **Target**: \`${input.filePaths || 'repository source'}\``,
        `- **Action**: Dispatched to DeepSeek Harness (\`127.0.0.1:3080\`) watcher plugin (\`task-tracker-ops\`) for local reproduction, patch synthesis, and \`npm test\` verification.`,
      ].join('\n'),
      dshWoken,
      model: HERETIC_MODEL_ID,
      endpointUsed: 'dsh-queue',
    };
  }
}
