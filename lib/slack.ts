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

type LinkedSlackUser =
  | { ok: true; slackUserId: string }
  | { ok: false; error: string };

// Asks SGAuth which Slack account this SGAuth user linked (SGAuth's
// docs/integration/slack.md). Recipients who haven't linked Slack there can't
// be messaged.
async function lookupLinkedSlackUser(
  sgauthUserId: string,
): Promise<LinkedSlackUser> {
  const baseUrl = process.env.SGAUTH_URL;
  const apiKey = process.env.SGAUTH_PRODUCT_API_KEY;
  const slackTeamId = process.env.SLACK_TEAM_ID;
  const missing = [
    !baseUrl && 'SGAUTH_URL',
    !apiKey && 'SGAUTH_PRODUCT_API_KEY',
    !slackTeamId && 'SLACK_TEAM_ID',
  ].filter(Boolean);
  if (missing.length > 0)
    return { ok: false, error: `${missing.join(', ')} not configured.` };

  try {
    const response = await fetch(
      `${baseUrl!.replace(/\/+$/, '')}/api/products/slack/lookup`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slackTeamId, userIds: [sgauthUserId] }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status === 401)
      return { ok: false, error: 'SGAuth refused the product API key.' };
    if (response.status === 403)
      return { ok: false, error: 'SLACK_TEAM_ID is not the SGA workspace.' };
    if (!response.ok)
      return {
        ok: false,
        error: `SGAuth Slack lookup failed (HTTP ${response.status}).`,
      };

    const body = (await response.json()) as {
      identities?: { userId: string; slackUserId: string }[];
    };
    const identity = body.identities?.find((i) => i.userId === sgauthUserId);
    return identity
      ? { ok: true, slackUserId: identity.slackUserId }
      : {
          ok: false,
          error:
            "hasn't linked Slack in SGAuth (Connect Slack on their SGAuth account page).",
        };
  } catch (error) {
    return {
      ok: false,
      error: `Could not reach SGAuth: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// DMs the Slack account this SGAuth user linked in SGAuth.
export async function sendSlackMessageToSgauthUser(
  sgauthUserId: string,
  text: string,
): Promise<SlackResult> {
  const linked = await lookupLinkedSlackUser(sgauthUserId);
  if (!linked.ok) return linked;
  return sendDm(linked.slackUserId, text);
}

// Slack mrkdwn treats &, < and > as control characters.
export function escapeSlackText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
