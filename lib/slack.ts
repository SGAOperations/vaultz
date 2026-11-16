export type SlackResult = { ok: true } | { ok: false; error: string };

async function callSlack<T extends object>(
  method: string,
  params: Record<string, string>,
): Promise<({ ok: true } & T) | { ok: false; error: string }> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return { ok: false, error: 'SLACK_BOT_TOKEN is not configured.' };

  try {
    const response = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json()) as { ok: boolean; error?: string } & T;
    if (!body.ok)
      return { ok: false, error: `Slack error: ${body.error ?? 'unknown'}` };
    return body as { ok: true } & T;
  } catch (error) {
    return {
      ok: false,
      error: `Could not reach Slack: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Posting to a user id opens (or reuses) the SGAssist bot's DM with that user.
async function sendDm(channel: string, text: string): Promise<SlackResult> {
  const result = await callSlack('chat.postMessage', {
    channel,
    text,
    unfurl_links: 'false',
  });
  return result.ok ? { ok: true } : result;
}

// DMs whoever owns this email in Slack. Needs the users:read.email scope.
export async function sendSlackMessageToEmail(
  email: string,
  text: string,
): Promise<SlackResult> {
  const lookup = await callSlack<{ user: { id: string } }>(
    'users.lookupByEmail',
    { email },
  );
  if (!lookup.ok) return lookup;
  return sendDm(lookup.user.id, text);
}

// Slack mrkdwn treats &, < and > as control characters.
export function escapeSlackText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
