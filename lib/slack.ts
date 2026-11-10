export type SlackResult = { ok: true } | { ok: false; error: string };

// Sends a direct message to the VPOA as the SGAssist bot. Posting to a user id
// opens (or reuses) the bot's DM with that user.
export async function sendVpoaSlackMessage(text: string): Promise<SlackResult> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_VPOA_USER_ID;
  if (!token || !channel)
    return {
      ok: false,
      error: 'SLACK_BOT_TOKEN or SLACK_VPOA_USER_ID is not configured.',
    };

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ channel, text, unfurl_links: false }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json()) as { ok: boolean; error?: string };
    if (!body.ok)
      return { ok: false, error: `Slack error: ${body.error ?? 'unknown'}` };
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `Could not reach Slack: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Slack mrkdwn treats &, < and > as control characters.
export function escapeSlackText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
