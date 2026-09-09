// OpenRouter adapter. Everything here is best-effort: if the key is missing,
// every model is rate-limited, or the JSON comes back malformed, callers fall
// back to the scripted path and the app keeps working. No decision depends on
// this file.

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 15_000;

/**
 * Free models rate-limit hard and go down without warning, so we try several in
 * turn rather than trusting one. Ordered by measured latency on this workload;
 * all three return well-formed JSON and catch a contradiction against the file.
 */
const DEFAULT_MODELS = [
  "inclusionai/ling-3.0-flash-sante:free",
  "nex-agi/nex-n2.5-mini:free",
  "nex-agi/nex-n2.5-pro:free",
];

export const MODELS = (process.env.OPENROUTER_MODELS ?? "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean)
  .concat(DEFAULT_MODELS);

export function llmAvailable() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

async function once(
  model: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
  key: string
): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "The Panel",
      },
      // No response_format: several free models reject it outright, and the
      // parser below tolerates fences and surrounding prose anyway.
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function chat(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts: { json?: boolean; maxTokens?: number } = {}
): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  for (const model of MODELS) {
    const out = await once(model, messages, opts.maxTokens ?? 900, key);
    if (!out) continue;
    // When the caller needs JSON, a model that returned prose is a failed
    // attempt, not a result. Move to the next one.
    if (opts.json && parseJson(out) === null) continue;
    return out;
  }
  return null;
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
