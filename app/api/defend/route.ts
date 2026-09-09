import { NextResponse } from "next/server";
import { chat, llmAvailable } from "@/lib/llm";
import { PERSONAS } from "@/lib/applicants";
import type { Allocation, Record_ } from "@/lib/rubric";
import { justifyPick, justifyRejection } from "@/lib/justify";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { question, alloc, records } = (await req.json()) as {
    question: string;
    alloc: Allocation;
    records: Record<string, Record_>;
  };

  const nameOf = (id: string) => PERSONAS.find((p) => p.id === id)?.name ?? id;

  // Deterministic ground truth. The model may only phrase this, never revise it.
  const facts = [
    `SELECTED (5): ${alloc.training.map(nameOf).join(", ")}`,
    `GUARANTEED PLACEMENT (2): ${alloc.placement.map(nameOf).join(", ")}`,
    `FULL RANKING: ${alloc.ranked
      .map(
        (s, i) =>
          `${i + 1}. ${nameOf(s.applicantId)} training=${s.trainingScore.toFixed(
            1
          )} placement=${s.placementScore.toFixed(1)}`
      )
      .join(" | ")}`,
    ...alloc.training.map((id) => justifyPick(id, alloc, records)),
    ...alloc.rejected.map((r) => justifyRejection(r.id, alloc, records)),
  ].join("\n\n");

  const fallback = () => {
    const q = question.toLowerCase();
    const hit =
      PERSONAS.find((p) => q.includes(p.name.split(" ")[0].toLowerCase())) ??
      PERSONAS.find((p) => q.includes(p.id));
    if (hit) {
      return alloc.training.includes(hit.id)
        ? justifyPick(hit.id, alloc, records)
        : justifyRejection(hit.id, alloc, records);
    }
    return facts;
  };

  if (!llmAvailable()) {
    return NextResponse.json({ answer: fallback(), source: "deterministic" });
  }

  const raw = await chat([
    {
      role: "system",
      content: `You are defending a selection decision to a sceptical panel member. The decision was produced by a scoring engine, not by you — you may explain and contextualise it, but you may NOT change it, apologise for it, or concede that a different applicant should have been picked. If challenged, give the actual reason from the record.

Rules: never say everyone deserves a spot. Never justify by sympathy. Cite the specific evidence and the score. If the challenge is fair, say which part of the record is genuinely thin rather than pretending certainty. Answer in under 180 words, plain language, no bullet-point padding.

THE RECORD (ground truth — do not contradict any number here):
${facts}`,
    },
    { role: "user", content: String(question).slice(0, 800) },
  ]);

  return NextResponse.json({
    answer: raw ?? fallback(),
    source: raw ? "llm" : "deterministic",
  });
}
