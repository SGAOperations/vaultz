import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  escapeSlackText,
  sendSlackMessageTo,
  sendSlackMessageToEmail,
} from '@/lib/slack';

const fetchMock = vi.fn();

function slackReply(body: object) {
  return Promise.resolve(new Response(JSON.stringify(body)));
}

function callAt(index: number) {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
  return {
    url,
    params: Object.fromEntries(new URLSearchParams(init.body as string)),
    auth: (init.headers as Record<string, string>).Authorization,
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('SLACK_BOT_TOKEN', 'xoxb-test');
  vi.stubEnv('SLACK_VPOA_USER_ID', 'U_VPOA');
  vi.stubEnv('SLACK_COMPTROLLER_USER_ID', 'U_COMP');
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('sendSlackMessageTo', () => {
  it('posts to the configured Comptroller member id', async () => {
    fetchMock.mockReturnValueOnce(slackReply({ ok: true }));

    await expect(sendSlackMessageTo('comptroller', 'hi')).resolves.toEqual({
      ok: true,
    });
    const call = callAt(0);
    expect(call.url).toBe('https://slack.com/api/chat.postMessage');
    expect(call.auth).toBe('Bearer xoxb-test');
    expect(call.params).toMatchObject({ channel: 'U_COMP', text: 'hi' });
  });

  it('fails without calling Slack when the member id is missing', async () => {
    vi.stubEnv('SLACK_COMPTROLLER_USER_ID', '');

    await expect(sendSlackMessageTo('comptroller', 'hi')).resolves.toEqual({
      ok: false,
      error: 'SLACK_COMPTROLLER_USER_ID is not configured.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces a Slack API error', async () => {
    fetchMock.mockReturnValueOnce(
      slackReply({ ok: false, error: 'channel_not_found' }),
    );

    await expect(sendSlackMessageTo('vpoa', 'hi')).resolves.toEqual({
      ok: false,
      error: 'Slack error: channel_not_found',
    });
  });

  it('reports a network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));

    await expect(sendSlackMessageTo('vpoa', 'hi')).resolves.toEqual({
      ok: false,
      error: 'Could not reach Slack: boom',
    });
  });
});

describe('sendSlackMessageToEmail', () => {
  it('looks the user up by email, then DMs them', async () => {
    fetchMock
      .mockReturnValueOnce(slackReply({ ok: true, user: { id: 'U_REQ' } }))
      .mockReturnValueOnce(slackReply({ ok: true }));

    await expect(
      sendSlackMessageToEmail('vp@northeastern.edu', 'decided'),
    ).resolves.toEqual({ ok: true });
    expect(callAt(0).url).toBe('https://slack.com/api/users.lookupByEmail');
    expect(callAt(0).params).toEqual({ email: 'vp@northeastern.edu' });
    expect(callAt(1).params).toMatchObject({
      channel: 'U_REQ',
      text: 'decided',
    });
  });

  it('stops when the email has no Slack user', async () => {
    fetchMock.mockReturnValueOnce(
      slackReply({ ok: false, error: 'users_not_found' }),
    );

    await expect(
      sendSlackMessageToEmail('nobody@northeastern.edu', 'decided'),
    ).resolves.toEqual({ ok: false, error: 'Slack error: users_not_found' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('escapeSlackText', () => {
  it('escapes Slack control characters', () => {
    expect(escapeSlackText('<b> & <@U1>')).toBe('&lt;b&gt; &amp; &lt;@U1&gt;');
  });
});
