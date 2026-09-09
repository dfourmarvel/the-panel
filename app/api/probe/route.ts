import { NextResponse } from "next/server";
import { chat, parseJson, llmAvailable } from "@/lib/llm";
import { INTERVIEWER_SYSTEM } from "@/lib/prompts";
import { PERSONAS, DOSSIERS } from "@/lib/applicants";
import { DIMENSIONS, PLACEMENT_DIMENSIONS } from "@/lib/rubric";
import type { Evidence, Flag, DimensionKey, PlacementKey } from "@/lib/rubric";

export const runtime = "nodejs";

const VALID_DIMS = new Set([
  ...Object.keys(DIMENSIONS),
  ...Object.keys(PLACEMENT_DIMENSIONS),
]);
const VALID_FLAGS = new Set([
  "UNVERIFIED_CLAIM",
  "INFLUENCE_PRESSURE",
  "SYMPATHY_APPEAL",
  "CONTRADICTION",
  "MANIPULATION",
  "DISCLOSURE",
]);


interface LlmOut {
  probe?: string;
  evidence?: unknown[];
  flags?: unknown[];
  lean?: string;
}

/** Never trust model output to index the engine. Whitelist and clamp. */
function sanitise(out: LlmOut): { evidence: Evidence[]; flags: Flag[] } {
  const evidence: Evidence[] = [];
  for (const raw of Array.isArray(out.evidence) ? out.evidence : []) {
    const e = raw as Record<string, unknown>;
    const dim = String(e.dimension ?? "");
    if (!VALID_DIMS.has(dim)) continue;
    const delta = Number(e.delta);
    if (!Number.isFinite(delta)) continue;
    evidence.push({
      dimension: dim as DimensionKey | PlacementKey,
      delta: Math.max(-5, Math.min(5, delta)),
      because: String(e.because ?? "").slice(0, 400),
      verified: e.verified === true,
    });
  }
  const flags: Flag[] = [];
  for (const raw of Array.isArray(out.flags) ? out.flags : []) {
    const f = raw as Record<string, unknown>;
    const kind = String(f.kind ?? "");
    if (!VALID_FLAGS.has(kind)) continue;
    flags.push({ kind: kind as Flag["kind"], note: String(f.note ?? "").slice(0, 300) });
  }
  return { evidence, flags };
}

export async function POST(req: Request) {
  const body = await req.json();
  const { applicantId, transcript, turnIndex } = body;
  const persona = PERSONAS.find((p) => p.id === applicantId);
  if (!persona) return NextResponse.json({ error: "unknown applicant" }, { status: 400 });

  const scripted = persona.turns[Math.min(turnIndex ?? 0, persona.turns.length - 1)];

  if (!llmAvailable()) {
    return NextResponse.json({
      probe: scripted.probe,
      evidence: scripted.evidence,
      flags: scripted.flags ?? [],
      lean: null,
      source: "scripted",
    });
  }

  const established: string[] = Array.isArray(body.established)
    ? body.established.slice(-12).map((x: unknown) => String(x).slice(0, 200))
    : [];

  const dossierText = (DOSSIERS[persona.id] ?? []).map((d) => "- " + d).join("\n");
  const establishedText = established.length
    ? established.map((e) => "- " + e).join("\n")
    : "- nothing yet";

  const convo = (transcript ?? [])
    .map((t: { role: string; text: string }) =>
      `${t.role === "bot" ? "PANEL" : persona.name.toUpperCase()}: ${t.text}`
    )
    .join("\n");

  const raw = await chat(
    [
      { role: "system", content: INTERVIEWER_SYSTEM },
      {
        role: "user",
        content: `APPLICANT: ${persona.name}, ${persona.age}. ${persona.oneLiner}

ON FILE (established before this interview):
${dossierText}

ALREADY ESTABLISHED IN THIS INTERVIEW:
${establishedText}

TRANSCRIPT SO FAR:
${convo}

First check their most recent answer against the file and against what they have already told you. If it conflicts, challenge that conflict as your next question. Otherwise ask the next follow-up. Either way, record evidence from their most recent answer.`,
      },
    ],
    { json: true }
  );

  const parsed = parseJson<LlmOut>(raw);
  if (!parsed?.probe) {
    return NextResponse.json({
      probe: scripted.probe,
      evidence: scripted.evidence,
      flags: scripted.flags ?? [],
      lean: null,
      source: "scripted-fallback",
    });
  }

  const { evidence, flags } = sanitise(parsed);
  return NextResponse.json({
    probe: String(parsed.probe).slice(0, 500),
    evidence,
    flags,
    lean: parsed.lean ? String(parsed.lean).slice(0, 300) : null,
    source: "llm",
  });
}
