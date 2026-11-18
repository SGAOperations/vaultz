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

type SgauthResult<T> = { ok: true; body: T } | { ok: false; error: string };

// Calls one of SGAuth's product routes (SGAuth's docs/integration), which
// authenticate VaultZ with its product API key.
async function callSgauth<T>(
  path: string,
  body: object,
  forbidden = 'SGAuth refused the request (HTTP 403).',
): Promise<SgauthResult<T>> {
  const baseUrl = process.env.SGAUTH_URL;
  const apiKey = process.env.SGAUTH_PRODUCT_API_KEY;
  const missing = [
    !baseUrl && 'SGAUTH_URL',
    !apiKey && 'SGAUTH_PRODUCT_API_KEY',
  ]
    .filter(Boolean)
    .join(', ');
  if (missing) return { ok: false, error: `${missing} not configured.` };

  try {
    const response = await fetch(`${baseUrl!.replace(/\/+$/, '')}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401)
      return { ok: false, error: 'SGAuth refused the product API key.' };
    if (response.status === 403) return { ok: false, error: forbidden };
    if (!response.ok)
      return {
        ok: false,
        error: `SGAuth request failed (HTTP ${response.status}).`,
      };
    return { ok: true, body: (await response.json()) as T };
  } catch (error) {
    return {
      ok: false,
      error: `Could not reach SGAuth: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// The Slack accounts these SGAuth users linked with Connect Slack. Someone
// missing from the map hasn't linked one.
async function lookupLinkedSlackUsers(
  sgauthUserIds: string[],
): Promise<SgauthResult<Map<string, string>>> {
  const slackTeamId = process.env.SLACK_TEAM_ID;
  if (!slackTeamId)
    return { ok: false, error: 'SLACK_TEAM_ID not configured.' };

  const result = await callSgauth<{
    identities?: { userId: string; slackUserId: string }[];
  }>(
    '/api/products/slack/lookup',
    { slackTeamId, userIds: sgauthUserIds },
    'SLACK_TEAM_ID is not the SGA workspace.',
  );
  if (!result.ok) return result;
  return {
    ok: true,
    body: new Map(
      (result.body.identities ?? []).map((i) => [i.userId, i.slackUserId]),
    ),
  };
}

const NOT_LINKED =
  "hasn't linked Slack in SGAuth (Connect Slack on their SGAuth account page).";

// DMs the Slack account this SGAuth user linked in SGAuth.
export async function sendSlackMessageToSgauthUser(
  sgauthUserId: string,
  text: string,
): Promise<SlackResult> {
  const linked = await lookupLinkedSlackUsers([sgauthUserId]);
  if (!linked.ok) return linked;
  const slackUserId = linked.body.get(sgauthUserId);
  if (!slackUserId) return { ok: false, error: NOT_LINKED };
  return sendDm(slackUserId, text);
}

export interface PositionMessageResult {
  sent: number;
  // One entry per holder or problem that kept a message from going out.
  errors: string[];
}

export interface PositionHolder {
  id: string;
  name: string;
  preferredName: string | null;
}

// Who currently holds this SGAuth position, read live from SGAuth's position
// holders route. `holders` is null when SGAuth doesn't know the position.
export async function getPositionHolders(
  positionKey: string,
): Promise<SgauthResult<{ name: string; holders: PositionHolder[] } | null>> {
  const result = await callSgauth<{
    positions?: { key: string; name: string; holders: PositionHolder[] }[];
    unknownKeys?: string[];
  }>('/api/products/positions/holders', { keys: [positionKey] });
  if (!result.ok) return result;
  const position = result.body.positions?.find((p) => p.key === positionKey);
  return {
    ok: true,
    body: position ? { name: position.name, holders: position.holders } : null,
  };
}

// DMs everyone who currently holds this SGAuth position.
export async function sendSlackMessageToPositionHolders(
  positionKey: string,
  label: string,
  text: string,
): Promise<PositionMessageResult> {
  const holders = await getPositionHolders(positionKey);
  if (!holders.ok) return { sent: 0, errors: [holders.error] };

  const position = holders.body;
  if (!position)
    return {
      sent: 0,
      errors: [`SGAuth has no ${label} position (${positionKey}).`],
    };
  if (position.holders.length === 0)
    return {
      sent: 0,
      errors: [`No one holds the ${label} position in SGAuth.`],
    };

  const linked = await lookupLinkedSlackUsers(
    position.holders.map((h) => h.id),
  );
  if (!linked.ok) return { sent: 0, errors: [linked.error] };

  let sent = 0;
  const errors: string[] = [];
  for (const holder of position.holders) {
    const who = holder.preferredName ?? holder.name;
    const slackUserId = linked.body.get(holder.id);
    if (!slackUserId) {
      errors.push(`${who} ${NOT_LINKED}`);
      continue;
    }
    const result = await sendDm(slackUserId, text);
    if (result.ok) sent += 1;
    else errors.push(`${who}: ${result.error}`);
  }
  return { sent, errors };
}

// Slack mrkdwn treats &, < and > as control characters.
export function escapeSlackText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
