// Keep both attempts within the assistant request's time budget.
const providerTimeoutMs = 8_000;
async function gemini(system: string, prompt: string): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
    }),
    signal: AbortSignal.timeout(providerTimeoutMs),
  });
  if (!res.ok) throw new Error(`Gemini request failed (${res.status})`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
}
async function groq(system: string, prompt: string): Promise<string> {
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      ...(model.startsWith('openai/gpt-oss-') ? { reasoning_effort: 'low' } : {}),
      temperature: 0.2,
      max_tokens: 1024,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(providerTimeoutMs),
  });
  if (!res.ok) throw new Error(`Groq request failed (${res.status})`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}
const providers = () => [
  ...(process.env.GEMINI_API_KEY ? [{ name: 'gemini', run: gemini }] : []),
  ...(process.env.GROQ_API_KEY ? [{ name: 'groq', run: groq }] : []),
];
export const aiEnabled = () => providers().length > 0;
export async function complete(system: string, prompt: string) {
  const errors: string[] = [];
  for (const p of providers()) {
    try {
      const text = (await p.run(system, prompt)).trim();
      if (text) return { text, provider: p.name };
      errors.push(`${p.name}: empty`);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `${p.name} failed`);
    }
  }
  throw new Error(errors.join(' | ') || 'No AI provider configured');
}
