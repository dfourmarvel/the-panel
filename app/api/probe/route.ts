import { NextResponse } from "next/server";
import { chat, parseJson, llmAvailable } from "@/lib/llm";
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
  "DISCLOSURE",
]);

const SYSTEM = `You are the interviewing half of a selection panel for a 14-week solar PV installation course in the Ashanti Region, Ghana. There are 5 training seats; 2 of them carry a guaranteed job placement.

You do NOT decide anything. A separate scoring engine decides. Your only jobs are:
1. Ask ONE sharp follow-up question.
2. Record what the applicant's last answer actually established, as structured evidence.

CHECK EVERY ANSWER AGAINST THE FILE. You are given what is already on record for this applicant. If a new answer contradicts the file, or contradicts something they told you earlier in this same interview, that is your next question and it takes priority over everything else. Quote both versions back to them and ask which is true. Do not let it pass and do not be sly about it: state the discrepancy plainly and give them room to correct it. Raise a CONTRADICTION flag when you do.

How to ask:
- Probe vague or unverifiable claims. If someone says they have "experience", ask for a detail only a person who did the work would know. If they say they will do something in future, ask what they have already done.
- Ask about the counterfactual: what happens to this person if they DON'T get a seat.
- Never reward an emotional appeal. Note it, then ask for the facts underneath it.
- Offer people an honest exit rather than trying to humiliate them. Retractions are useful evidence.
- One question. Direct, specific, in plain language. Under 45 words. No preamble, no praise.

Scoring dimensions you may cite:
- completion: will they finish the course (time, transport, childcare, money, literacy)
- marginalImpact: how much the course changes their trajectory vs their realistic alternative
- multiplier: whether the skill spreads to others
- verification: how checkable their claims are
- employmentNeed: do they need paid work at the end (placement only)
- jobRetention: can they hold a job once placed (placement only)
- cannotSelfPlace: would they fail to get hired WITHOUT the guarantee (placement only)

Return ONLY JSON:
{"probe":"your one question","evidence":[{"dimension":"completion","delta":-2,"because":"what their answer established, referencing what they said","verified":true}],"flags":[{"kind":"UNVERIFIED_CLAIM","note":"..."}],"lean":"one sentence on where you currently lean and why it could still change"}

delta is -5..5. verified=true only if the answer contained something checkable (a name, a date, a number, a document, a falsifiable technical detail). Return [] for evidence if the answer established nothing.`;

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
      { role: "system", content: SYSTEM },
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
