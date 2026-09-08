import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL, ApiError, getAccessToken, getTokens, http, setTokens } from './http';

/**
 * These tests mock global fetch, so they exercise the client's own logic
 * (envelope handling, 401 handling, refresh, error mapping) rather than the
 * network.
 */
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  setTokens(null);
});

afterEach(() => {
  setTokens(null);
});

describe('http.get', () => {
  it('returns the parsed body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: '1' } }));
    await expect(http.get('/things')).resolves.toEqual({ data: { id: '1' } });
  });

  it('attaches the bearer token when signed in', async () => {
    setTokens({ access_token: 'abc', refresh_token: 'def', expires_at: new Date(Date.now() + 60_000).toISOString() });
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }));
    await http.get('/things');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('does not attach a token to anonymous requests', async () => {
    setTokens({ access_token: 'abc', refresh_token: 'def', expires_at: new Date().toISOString() });
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }));
    await http.get('/things', { authenticated: false });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.get('Authorization')).toBeNull();
  });

  it('returns undefined for 204 responses', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(http.delete('/things/1')).resolves.toBeUndefined();
  });
});

describe('error handling', () => {
  it('maps an API error response onto ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'not_found', message: 'That listing does not exist.' } }, 404)
    );

    await expect(http.get('/things/1')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'not_found',
      status: 404,
    });
  });

  it('clears tokens and notifies the app on an unrecoverable 401', async () => {
    setTokens({ access_token: 'abc', refresh_token: 'def', expires_at: new Date(Date.now() + 60_000).toISOString() });
    const listener = vi.fn();
    window.addEventListener('agently:unauthorized', listener);

    // The refresh attempt itself fails, so the 401 is terminal.
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'unauthorized', message: 'Sign in.' } }, 401));

    await expect(http.get('/me')).rejects.toBeInstanceOf(ApiError);
    expect(getTokens()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();

    window.removeEventListener('agently:unauthorized', listener);
  });

  it('retries once after a successful token refresh', async () => {
    setTokens({
      access_token: 'stale',
      refresh_token: 'refresh-me',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'unauthorized', message: 'expired' } }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            tokens: {
              access_token: 'fresh',
              refresh_token: 'refresh-me',
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            },
          },
        })
      )
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    await expect(http.get('/me')).resolves.toEqual({ data: { ok: true } });
    expect(getAccessToken()).toBe('fresh');
  });
});

describe('refresh coordination', () => {
  it('exchanges the refresh token once for concurrent 401s', async () => {
    setTokens({
      access_token: 'stale',
      refresh_token: 'refresh-me',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });

    let refreshCalls = 0;
    const served = new Set<string>();

    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).endsWith('/auth/refresh')) {
        refreshCalls += 1;
        // A slow refresh proves the second caller waits on the same promise
        // instead of starting its own exchange.
        await new Promise((resolve) => setTimeout(resolve, 20));
        return jsonResponse({
          data: {
            tokens: {
              access_token: 'fresh',
              refresh_token: 'refresh-me',
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            },
          },
        });
      }
      // First attempt per path fails; the retry after refreshing succeeds.
      if (!served.has(url)) {
        served.add(url);
        return jsonResponse({ error: { code: 'unauthorized', message: 'expired' } }, 401);
      }
      return jsonResponse({ data: { path: url } });
    });

    const results = await Promise.all([http.get('/a'), http.get('/b')]);

    expect(results).toEqual([{ data: { path: `${API_BASE_URL}/a` } }, { data: { path: `${API_BASE_URL}/b` } }]);
    expect(refreshCalls).toBe(1);
    expect(getAccessToken()).toBe('fresh');
  });
});
