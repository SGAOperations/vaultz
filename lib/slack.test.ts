import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { escapeSlackText, sendSlackMessageToSgauthUser } from '@/lib/slack';

const fetchMock = vi.fn();
const SGAUTH_USER = '00000000-0000-4000-8000-000000000001';

function reply(body: object, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function call(index: number) {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string> };
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('SLACK_BOT_TOKEN', 'xoxb-test');
  vi.stubEnv('SGAUTH_URL', 'https://auth.example.edu/');
  vi.stubEnv('SGAUTH_PRODUCT_API_KEY', 'sgak_test');
  vi.stubEnv('SLACK_TEAM_ID', 'T0123');
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('sendSlackMessageToSgauthUser', () => {
  it('asks SGAuth for the linked Slack account, then DMs it', async () => {
    fetchMock
      .mockReturnValueOnce(
        reply({
          identities: [
            { userId: SGAUTH_USER, slackTeamId: 'T0123', slackUserId: 'U0456' },
          ],
        }),
      )
      .mockReturnValueOnce(reply({ ok: true }));

    await expect(
      sendSlackMessageToSgauthUser(SGAUTH_USER, 'hello'),
    ).resolves.toEqual({ ok: true });

    const lookup = call(0);
    expect(lookup.url).toBe(
      'https://auth.example.edu/api/products/slack/lookup',
    );
    expect(lookup.init.method).toBe('POST');
    expect(lookup.headers.Authorization).toBe('Bearer sgak_test');
    expect(JSON.parse(lookup.init.body as string)).toEqual({
      slackTeamId: 'T0123',
      userIds: [SGAUTH_USER],
    });

    const post = call(1);
    expect(post.url).toBe('https://slack.com/api/chat.postMessage');
    expect(post.headers.Authorization).toBe('Bearer xoxb-test');
    expect(
      Object.fromEntries(new URLSearchParams(post.init.body as string)),
    ).toMatchObject({ channel: 'U0456', text: 'hello' });
  });

  it("fails without posting when the person hasn't linked Slack", async () => {
    fetchMock.mockReturnValueOnce(reply({ identities: [] }));

    const result = await sendSlackMessageToSgauthUser(SGAUTH_USER, 'hello');

    expect(result).toEqual({
      ok: false,
      error:
        "hasn't linked Slack in SGAuth (Connect Slack on their SGAuth account page).",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('names every missing setting and calls nothing', async () => {
    vi.stubEnv('SGAUTH_PRODUCT_API_KEY', '');
    vi.stubEnv('SLACK_TEAM_ID', '');

    await expect(
      sendSlackMessageToSgauthUser(SGAUTH_USER, 'hello'),
    ).resolves.toEqual({
      ok: false,
      error: 'SGAUTH_PRODUCT_API_KEY, SLACK_TEAM_ID not configured.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'SGAuth refused the product API key.'],
    [403, 'SLACK_TEAM_ID is not the SGA workspace.'],
    [500, 'SGAuth Slack lookup failed (HTTP 500).'],
  ])('reports an SGAuth %i', async (status, error) => {
    fetchMock.mockReturnValueOnce(reply({ error: 'x' }, status));

    await expect(
      sendSlackMessageToSgauthUser(SGAUTH_USER, 'hello'),
    ).resolves.toEqual({ ok: false, error });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports when SGAuth is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));

    await expect(
      sendSlackMessageToSgauthUser(SGAUTH_USER, 'hello'),
    ).resolves.toEqual({ ok: false, error: 'Could not reach SGAuth: boom' });
  });

  it('surfaces a failed Slack post after a successful lookup', async () => {
    fetchMock
      .mockReturnValueOnce(
        reply({ identities: [{ userId: SGAUTH_USER, slackUserId: 'U0456' }] }),
      )
      .mockReturnValueOnce(reply({ ok: false, error: 'channel_not_found' }));

    await expect(
      sendSlackMessageToSgauthUser(SGAUTH_USER, 'hello'),
    ).resolves.toEqual({ ok: false, error: 'Slack error: channel_not_found' });
  });

  it('does not post without a bot token', async () => {
    vi.stubEnv('SLACK_BOT_TOKEN', '');
    fetchMock.mockReturnValueOnce(
      reply({ identities: [{ userId: SGAUTH_USER, slackUserId: 'U0456' }] }),
    );

    await expect(
      sendSlackMessageToSgauthUser(SGAUTH_USER, 'hello'),
    ).resolves.toEqual({
      ok: false,
      error: 'SLACK_BOT_TOKEN is not configured.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('escapeSlackText', () => {
  it('escapes Slack control characters', () => {
    expect(escapeSlackText('<b> & <@U1>')).toBe('&lt;b&gt; &amp; &lt;@U1&gt;');
  });
});
