import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  escapeSlackText,
  sendSlackMessageToPositionHolders,
  sendSlackMessageToSgauthUser,
} from '@/lib/slack';

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

  it.each([
    [['SLACK_TEAM_ID'], 'SLACK_TEAM_ID not configured.'],
    [
      ['SGAUTH_URL', 'SGAUTH_PRODUCT_API_KEY'],
      'SGAUTH_URL, SGAUTH_PRODUCT_API_KEY not configured.',
    ],
  ])('names missing settings %j and calls nothing', async (unset, error) => {
    for (const name of unset) vi.stubEnv(name, '');

    await expect(
      sendSlackMessageToSgauthUser(SGAUTH_USER, 'hello'),
    ).resolves.toEqual({ ok: false, error });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'SGAuth refused the product API key.'],
    [403, 'SLACK_TEAM_ID is not the SGA workspace.'],
    [500, 'SGAuth request failed (HTTP 500).'],
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

describe('sendSlackMessageToPositionHolders', () => {
  const holder = (id: string, name: string) => ({
    id,
    email: `${name.toLowerCase()}@northeastern.edu`,
    name,
    preferredName: null,
  });

  it('asks SGAuth for the holders and DMs every linked one', async () => {
    fetchMock
      .mockReturnValueOnce(
        reply({
          positions: [
            {
              key: 'comptroller',
              name: 'Comptroller',
              holders: [holder('h1', 'Casey'), holder('h2', 'Jordan')],
            },
          ],
          unknownKeys: [],
        }),
      )
      .mockReturnValueOnce(
        reply({
          identities: [
            { userId: 'h1', slackUserId: 'U1' },
            { userId: 'h2', slackUserId: 'U2' },
          ],
        }),
      )
      .mockReturnValueOnce(reply({ ok: true }))
      .mockReturnValueOnce(reply({ ok: true }));

    await expect(
      sendSlackMessageToPositionHolders('comptroller', 'Comptroller', 'hi'),
    ).resolves.toEqual({ sent: 2, errors: [] });

    const holders = call(0);
    expect(holders.url).toBe(
      'https://auth.example.edu/api/products/positions/holders',
    );
    expect(holders.headers.Authorization).toBe('Bearer sgak_test');
    expect(JSON.parse(holders.init.body as string)).toEqual({
      keys: ['comptroller'],
    });
    expect(JSON.parse(call(1).init.body as string)).toEqual({
      slackTeamId: 'T0123',
      userIds: ['h1', 'h2'],
    });
    const channels = [2, 3].map((i) =>
      new URLSearchParams(call(i).init.body as string).get('channel'),
    );
    expect(channels).toEqual(['U1', 'U2']);
  });

  it('messages the linked holders and reports the unlinked ones', async () => {
    fetchMock
      .mockReturnValueOnce(
        reply({
          positions: [
            {
              key: 'comptroller',
              name: 'Comptroller',
              holders: [holder('h1', 'Casey'), holder('h2', 'Jordan')],
            },
          ],
        }),
      )
      .mockReturnValueOnce(
        reply({ identities: [{ userId: 'h1', slackUserId: 'U1' }] }),
      )
      .mockReturnValueOnce(reply({ ok: true }));

    await expect(
      sendSlackMessageToPositionHolders('comptroller', 'Comptroller', 'hi'),
    ).resolves.toEqual({
      sent: 1,
      errors: [
        "Jordan hasn't linked Slack in SGAuth (Connect Slack on their SGAuth account page).",
      ],
    });
  });

  it('reports a vacant position without a Slack lookup', async () => {
    fetchMock.mockReturnValueOnce(
      reply({
        positions: [{ key: 'comptroller', name: 'Comptroller', holders: [] }],
      }),
    );

    await expect(
      sendSlackMessageToPositionHolders('comptroller', 'Comptroller', 'hi'),
    ).resolves.toEqual({
      sent: 0,
      errors: ['No one holds the Comptroller position in SGAuth.'],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports a position SGAuth does not know', async () => {
    fetchMock.mockReturnValueOnce(
      reply({ positions: [], unknownKeys: ['comptroller'] }),
    );

    await expect(
      sendSlackMessageToPositionHolders('comptroller', 'Comptroller', 'hi'),
    ).resolves.toEqual({
      sent: 0,
      errors: ['SGAuth has no Comptroller position (comptroller).'],
    });
  });

  it('reports a refused product key', async () => {
    fetchMock.mockReturnValueOnce(reply({ error: 'unauthorized' }, 401));

    await expect(
      sendSlackMessageToPositionHolders('comptroller', 'Comptroller', 'hi'),
    ).resolves.toEqual({
      sent: 0,
      errors: ['SGAuth refused the product API key.'],
    });
  });
});

describe('escapeSlackText', () => {
  it('escapes Slack control characters', () => {
    expect(escapeSlackText('<b> & <@U1>')).toBe('&lt;b&gt; &amp; &lt;@U1&gt;');
  });
});
