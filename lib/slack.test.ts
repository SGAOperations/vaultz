import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { escapeSlackText, sendSlackMessageToEmail } from '@/lib/slack';

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
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
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

describe('Slack errors', () => {
  it('fails without calling Slack when the token is missing', async () => {
    vi.stubEnv('SLACK_BOT_TOKEN', '');

    await expect(sendSlackMessageToEmail('a@b.edu', 'hi')).resolves.toEqual({
      ok: false,
      error: 'SLACK_BOT_TOKEN is not configured.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces a failed post after a successful lookup', async () => {
    fetchMock
      .mockReturnValueOnce(slackReply({ ok: true, user: { id: 'U1' } }))
      .mockReturnValueOnce(slackReply({ ok: false, error: 'not_in_channel' }));

    await expect(sendSlackMessageToEmail('a@b.edu', 'hi')).resolves.toEqual({
      ok: false,
      error: 'Slack error: not_in_channel',
    });
  });

  it('reports a network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));

    await expect(sendSlackMessageToEmail('a@b.edu', 'hi')).resolves.toEqual({
      ok: false,
      error: 'Could not reach Slack: boom',
    });
  });
});

describe('escapeSlackText', () => {
  it('escapes Slack control characters', () => {
    expect(escapeSlackText('<b> & <@U1>')).toBe('&lt;b&gt; &amp; &lt;@U1&gt;');
  });
});
