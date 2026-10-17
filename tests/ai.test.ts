import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { aiEnabled, complete } from '../lib/ai';

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  vi.stubEnv('GEMINI_API_KEY', 'fixture-gemini-key');
  vi.stubEnv('GROQ_API_KEY', 'fixture-groq-key');
  vi.stubEnv('GEMINI_MODEL', 'gemini-flash-lite-latest');
  vi.stubEnv('GROQ_MODEL', 'openai/gpt-oss-20b');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('uses Gemini when it answers and avoids a second paid provider request', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ candidates: [{ content: { parts: [{ text: ' A catalogue answer. ' }] } }] }));
  expect(await complete('Use supplied shop data.', 'Find a lamp.')).toEqual({ text: 'A catalogue answer.', provider: 'gemini' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('falls back to Groq for a failed, empty or timed-out Gemini request', async () => {
  for (const failure of ['http', 'empty', 'timeout']) {
    fetchMock.mockReset();
    if (failure === 'timeout') fetchMock.mockRejectedValueOnce(new DOMException('Timeout', 'TimeoutError'));
    else fetchMock.mockResolvedValueOnce(failure === 'http' ? new Response('Private provider diagnostic', { status: 429 }) : Response.json({ candidates: [] }));
    fetchMock.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: 'Available products.' } }] }));
    expect(await complete('Use supplied data.', 'Find headphones.')).toEqual({ text: 'Available products.', provider: 'groq' });
    const request = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(request.reasoning_effort).toBe('low');
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  }
});

it('does not include provider response bodies or API keys in failures', async () => {
  fetchMock.mockResolvedValue(new Response('fixture-gemini-key provider-private-details', { status: 503 }));
  await expect(complete('System', 'Prompt')).rejects.toThrow('Gemini request failed (503)');
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response('fixture-groq-key provider-private-details', { status: 503 }));
  try { await complete('System', 'Prompt'); } catch (error) {
    expect(String(error)).not.toContain('fixture-groq-key');
    expect(String(error)).not.toContain('provider-private-details');
  }
});

it('supports Groq alone and explicitly fails without a configured provider', async () => {
  vi.stubEnv('GEMINI_API_KEY', '');
  fetchMock.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: 'Groq answer.' } }] }));
  expect((await complete('System', 'Prompt')).provider).toBe('groq');
  vi.stubEnv('GROQ_API_KEY', '');
  expect(aiEnabled()).toBe(false);
  await expect(complete('System', 'Prompt')).rejects.toThrow('No AI provider configured');
});
