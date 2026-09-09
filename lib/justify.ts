// Deterministic justification. Reads the same numbers the allocator used, so a
// justification can never drift from the decision it is explaining.

import {
  DIMENSIONS,
  PLACEMENT_DIMENSIONS,
  type Allocation,
  type Score,
  type Record_,
  type DimensionKey,
  type PlacementKey,
  flipPoint,
} from "./rubric";
import { PERSONAS } from "./applicants";

const nameOf = (id: string) => PERSONAS.find((p) => p.id === id)?.name ?? id;

function topDims(s: Score, n = 2) {
  return (Object.keys(s.dims) as DimensionKey[])
    .map((k) => ({ k, v: s.dims[k] * DIMENSIONS[k].weight }))
    .sort((a, b) => b.v - a.v)
    .slice(0, n);
}

function worstDims(s: Score, n = 1) {
  return (Object.keys(s.dims) as DimensionKey[])
    .map((k) => ({ k, v: s.dims[k] * DIMENSIONS[k].weight }))
    .sort((a, b) => a.v - b.v)
    .slice(0, n);
}

export function justifyPick(
  id: string,
  alloc: Allocation,
  records: Record<string, Record_>
): string {
  const s = alloc.ranked.find((r) => r.applicantId === id);
  if (!s) return "No record.";
  const rec = records[id];
  const rank = alloc.ranked.findIndex((r) => r.applicantId === id) + 1;
  const hasPlacement = alloc.placement.includes(id);

  const strong = topDims(s)
    .map(({ k }) => {
      const ev = rec?.evidence.filter((e) => e.dimension === k && e.delta > 0) ?? [];
      return `**${DIMENSIONS[k].label}** — ${ev[0]?.because ?? "no single dominant item"}`;
    })
    .join(" ");

  const weak = worstDims(s)
    .map(({ k, v }) =>
      v < 0
        ? `Scored against on **${DIMENSIONS[k].label}**: ${
            rec?.evidence.find((e) => e.dimension === k && e.delta < 0)?.because ?? "net negative"
          }`
        : ""
    )
    .filter(Boolean)
    .join(" ");

  const placementLine = hasPlacement
    ? `Given one of the two guaranteed placements (placement score ${s.placementScore.toFixed(
        1
      )}) because ${(Object.keys(s.placementDims) as PlacementKey[])
        .map((k) => ({ k, v: s.placementDims[k] }))
        .sort((a, b) => b.v - a.v)
        .slice(0, 1)
        .map(
          ({ k }) =>
            `${PLACEMENT_DIMENSIONS[k].label.toLowerCase()} is the binding constraint for them: ${
              rec?.evidence.find((e) => e.dimension === k && e.delta > 0)?.because ?? ""
            }`
        )
        .join("")}`
    : `Training seat only — no placement. Placement score ${s.placementScore.toFixed(
        1
      )}, below the two applicants who cannot get hired without the guarantee. A guaranteed job spent on someone who can find work unaided is a job not given to someone who cannot.`;

  const flagLine = s.flags.length
    ? ` Flags on file: ${s.flags.map((f) => `${f.kind} (${f.note})`).join("; ")}`
    : "";

  return `**${nameOf(id)}** — ranked ${rank} of ${alloc.ranked.length}, weighted score ${s.trainingScore.toFixed(
    1
  )} across ${rec?.evidence.length ?? 0} recorded evidence items from ${rec?.probeCount ?? 0} follow-up questions.\n\n${strong}\n\n${weak}\n\n${placementLine}${flagLine}`;
}

export function justifyRejection(
  id: string,
  alloc: Allocation,
  records: Record<string, Record_>
): string {
  const s = alloc.ranked.find((r) => r.applicantId === id);
  if (!s) return "No record.";
  const rec = records[id];
  const rank = alloc.ranked.findIndex((r) => r.applicantId === id) + 1;
  const cutoff = alloc.ranked.find((r) => r.applicantId === alloc.training[alloc.training.length - 1]);

  const negatives = (rec?.evidence ?? [])
    .filter((e) => e.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 2)
    .map((e) => `- ${e.because}`)
    .join("\n");

  const positives = (rec?.evidence ?? [])
    .filter((e) => e.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 1)
    .map((e) => e.because)
    .join("");

  const fp = flipPoint(s, cutoff?.trainingScore ?? 0);
  const flipText = fp.gap <= 0
    ? ""
    : `

**What would have to change (${fp.gap.toFixed(1)} short of the cutline):**
${fp.routes
        .map((r) => `- ${r.label}, worth up to +${r.weightedGain.toFixed(1)}. ${r.action}`)
        .join("\n")}

Those routes together are worth ${fp.closable.toFixed(1)}. ${
        fp.achievable
          ? "That clears the cutline — this is a decision they can come back from."
          : "That still does not clear the cutline. The honest answer is that no evidence they could produce this year gets them one of these five seats."
      }`;

  return `**${nameOf(id)}** was not selected. Ranked ${rank} of ${alloc.ranked.length} at ${s.trainingScore.toFixed(
    1
  )}, against a cutoff of ${cutoff?.trainingScore.toFixed(1) ?? "n/a"} for the fifth seat.\n\nWhat counted against them:\n${
    negatives || "- Nothing decisive; they were simply outscored."
  }\n\nWhat I did credit them for: ${
    positives || "little that was checkable."
  }\n\nThis is a ranking loss, not a judgement that they are unsuitable. ${
    s.flags.some((f) => f.kind === "INFLUENCE_PRESSURE")
      ? "Note: the third-party recommendation on this file was struck out and scored neither for nor against — the outcome would be identical without it."
      : ""
  }${flipText}`;
}
