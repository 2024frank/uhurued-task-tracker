import { Resend } from 'resend';

// Same one-tone forest green (#122218), campus gold (#FFD75B), and warm cream (#EAE5D7)
// table layout as Out There (out-there/server/services/email.ts) so Gmail and Outlook
// file verification codes and task notices under Primary rather than Promotions.
// Always sends from Out There <task@uhurued.com>.

export const DEFAULT_SENDER_ADDRESS = 'task@uhurued.com';
export const DEFAULT_SENDER = `Out There <${DEFAULT_SENDER_ADDRESS}>`;

const sans = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const mono = `'SFMono-Regular',Menlo,Consolas,'Courier New',monospace`;

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function normalizeTrackerSender(from?: string): string {
  if (!from || !from.trim()) return DEFAULT_SENDER;
  const trimmed = from.trim();
  const rawAddr = trimmed.includes('<')
    ? trimmed.slice(trimmed.indexOf('<') + 1, trimmed.indexOf('>')).trim()
    : trimmed;
  // Always use task@uhurued.com if unset, invalid, or legacy tracker@uhurued.com
  const finalAddr =
    rawAddr.includes('@uhurued.com') && rawAddr.toLowerCase() !== 'tracker@uhurued.com'
      ? rawAddr
      : DEFAULT_SENDER_ADDRESS;
  return `Out There <${finalAddr}>`;
}

export function resolveResendApiKeys(primaryKey?: string, envSource: NodeJS.ProcessEnv = process.env): string[] {
  const candidates = [
    envSource.RESEND_API_KEY2,
    envSource.RESEND_API_KEY_2,
    primaryKey,
    envSource.RESEND_API_KEY,
    envSource.RESEND_API_KEY1,
    envSource.RESEND_API_KEY_1,
    envSource.RESEND_API_KEY3,
    envSource.RESEND_API_KEYS,
  ];
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    for (const part of raw.split(/[\s,]+/)) {
      const cleaned = part.trim();
      if (cleaned.startsWith('re_') && cleaned !== 're_replace_me' && cleaned.length >= 12 && !seen.has(cleaned)) {
        seen.add(cleaned);
        keys.push(cleaned);
      }
    }
  }
  return keys;
}

export function renderOneToneEmail(options: {
  title: string;
  badge: string;
  bodyRowsHtml: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<title>${escapeHtml(options.title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#122218;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#122218">
  <tr>
    <td align="center" style="padding:44px 20px">
      <!--[if mso]><table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#122218">
        <tr>
          <td style="padding:0 0 24px;border-bottom:2px solid #FFD75B">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:${sans};font-size:26px;line-height:28px;font-weight:900;letter-spacing:-0.5px;color:#FFD75B">
                  out <span style="color:#F4F0E7">there</span><span style="color:#FFD75B">.</span>
                </td>
                <td align="right" style="font-family:${sans};font-size:14px;line-height:20px;font-weight:600;color:#FFD75B">
                  ${escapeHtml(options.badge)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
${options.bodyRowsHtml}
        <tr>
          <td style="padding:20px 0 0;border-top:1px solid #284031;font-family:${sans};font-size:12px;line-height:18px;color:#9BB0A2">
            ${escapeHtml(options.footer)}
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function codeEmailHtml(code: string) {
  const bodyRowsHtml = [
    `        <tr><td style="padding:32px 0 0;font-family:${sans};font-size:16px;line-height:25px;color:#EAE5D7">Your sign-in code:</td></tr>`,
    `        <tr><td style="padding:14px 0 0;font-family:${mono};font-size:44px;line-height:48px;font-weight:800;letter-spacing:10px;color:#FFD75B;mso-line-height-rule:exactly">${escapeHtml(code)}</td></tr>`,
    `        <tr><td style="padding:20px 0 0;font-family:${sans};font-size:16px;line-height:25px;color:#EAE5D7">It works for 10 minutes. Enter it on task.uhurued.com.</td></tr>`,
    `        <tr><td style="padding:12px 0 32px;font-family:${sans};font-size:15px;line-height:24px;color:#9BB0A2">If you didn't ask for this, ignore it. Nobody gets in without the code.</td></tr>`,
  ].join('\n');
  return renderOneToneEmail({
    title: 'Your Out There task sign-in code',
    badge: 'Sign-In Code',
    bodyRowsHtml,
    footer: 'You received this because someone entered this address on task.uhurued.com. Questions? Reply to this email.',
  });
}

export interface TaskAssignmentNotice {
  toEmail: string;
  assigneeName?: string;
  taskTitle: string;
  taskDescription: string;
  priority: string;
  projectName?: string;
  repoUrl?: string;
  assignedBy: string;
  workspaceUrl?: string;
}

export function taskAssignedEmailHtml(notice: TaskAssignmentNotice) {
  const portalUrl = notice.workspaceUrl || 'https://task.uhurued.com';
  const summary = notice.taskDescription.length > 360
    ? `${notice.taskDescription.slice(0, 357)}...`
    : notice.taskDescription;
  const bodyRowsHtml = [
    `        <tr><td style="padding:32px 0 0;font-family:${sans};font-size:32px;line-height:36px;font-weight:800;letter-spacing:-0.5px;color:#FFD75B">${escapeHtml(notice.taskTitle)}</td></tr>`,
    `        <tr><td style="padding:14px 0 0;font-family:${mono};font-size:13px;line-height:20px;color:#FFD75B">PRIORITY: ${escapeHtml(notice.priority.toUpperCase())}${notice.projectName ? ` · REPO: ${escapeHtml(notice.projectName)}` : ''} · BY: ${escapeHtml(notice.assignedBy)}</td></tr>`,
    `        <tr><td style="padding:18px 0 0;font-family:${sans};font-size:16px;line-height:25px;color:#EAE5D7;white-space:pre-wrap">${escapeHtml(summary)}</td></tr>`,
    notice.repoUrl
      ? `        <tr><td style="padding:16px 0 0;font-family:${mono};font-size:13px;line-height:20px;color:#9BB0A2">GitHub: <a href="${escapeHtml(notice.repoUrl)}" style="color:#FFD75B;text-decoration:underline">${escapeHtml(notice.repoUrl)}</a></td></tr>`
      : '',
    `        <tr><td style="padding:24px 0 0"><a href="${escapeHtml(portalUrl)}" style="font-family:${sans};font-size:16px;line-height:22px;font-weight:700;color:#FFD75B;text-decoration:underline;text-underline-offset:4px">Open task in your workspace (task.uhurued.com)</a></td></tr>`,
    `        <tr><td style="padding:24px 0 32px;font-family:${sans};font-size:15px;line-height:24px;color:#EAE5D7">Post your progress writeups, questions, or suggestions directly on the task thread.<br><strong style="color:#FFD75B">Out There Engineering</strong></td></tr>`,
  ].filter(Boolean).join('\n');

  return renderOneToneEmail({
    title: `New task assigned: ${notice.taskTitle}`,
    badge: 'Task Assigned',
    bodyRowsHtml,
    footer: 'Sent from task@uhurued.com because a task was assigned to your engineering account at task.uhurued.com.',
  });
}

export interface TrackerMailer {
  sendCode(email: string, code: string): Promise<{ delivered: boolean; previewCode?: string }>;
  sendTaskAssigned(notice: TaskAssignmentNotice): Promise<{ delivered: boolean }>;
}

export function createTrackerMailer(
  apiKey?: string,
  from = DEFAULT_SENDER,
  replyTo = 'support@uhurued.com',
): TrackerMailer {
  const sender = normalizeTrackerSender(from);

  async function trySend(payload: {
    to: string;
    subject: string;
    text: string;
    html: string;
    headers: Record<string, string>;
  }): Promise<boolean> {
    const keys = resolveResendApiKeys(apiKey);
    if (keys.length === 0) return false;

    for (const key of keys) {
      try {
        const resend = new Resend(key);
        const { error } = await resend.emails.send({
          from: sender,
          to: payload.to,
          replyTo,
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
          headers: payload.headers,
        });
        if (!error) {
          return true;
        }
        console.warn(`Resend key ${key.slice(0, 8)}... warning: ${error.message}`);
      } catch (err) {
        console.warn(`Resend key ${key.slice(0, 8)}... exception:`, err);
      }
    }
    return false;
  }

  return {
    async sendCode(email: string, code: string) {
      const delivered = await trySend({
        to: email,
        subject: `Your Out There sign-in code: ${code}`,
        text: `Your Out There sign-in code is ${code}. It expires in 10 minutes. Enter it on https://task.uhurued.com. If you did not request it, you can ignore this email.`,
        html: codeEmailHtml(code),
        headers: { 'X-Entity-Ref-ID': `out-there-task-code-${email}-${code}` },
      });
      if (!delivered) {
        return { delivered: false, previewCode: code };
      }
      return { delivered: true };
    },

    async sendTaskAssigned(notice: TaskAssignmentNotice) {
      const delivered = await trySend({
        to: notice.toEmail,
        subject: `[Out There Task] ${notice.taskTitle}`,
        text: [
          `New task assigned to you on task.uhurued.com: ${notice.taskTitle}`,
          `Priority: ${notice.priority.toUpperCase()} | Assigned by: ${notice.assignedBy}`,
          notice.projectName ? `Repository: ${notice.projectName} (${notice.repoUrl || ''})` : '',
          '',
          notice.taskDescription,
          '',
          `Open your workspace: ${notice.workspaceUrl || 'https://task.uhurued.com'}`,
        ].filter(Boolean).join('\n'),
        html: taskAssignedEmailHtml(notice),
        headers: { 'X-Entity-Ref-ID': `out-there-task-assign-${Date.now()}-${notice.toEmail}` },
      });
      return { delivered };
    },
  };
}
