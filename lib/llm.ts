// OpenRouter adapter. Everything here is best-effort: if the key is missing,
// the model is slow, or the JSON comes back malformed, callers fall back to the
// scripted path and the app keeps working. No decision depends on this file.

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 20_000;

export const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5";

export function llmAvailable() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function chat(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts: { json?: boolean; maxTokens?: number } = {}
): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "Five Spots",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.4,
        max_tokens: opts.maxTokens ?? 900,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Models wrap JSON in prose or fences more often than they should. */
export function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
