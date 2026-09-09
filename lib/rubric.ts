// The decision engine. No LLM runs in here — every placement is produced by
// arithmetic over recorded evidence, so any pick can be challenged and traced.

export type DimensionKey =
  | "completion"
  | "marginalImpact"
  | "multiplier"
  | "verification";

export const DIMENSIONS: Record<
  DimensionKey,
  { label: string; weight: number; asks: string }
> = {
  completion: {
    label: "Capability to complete",
    weight: 1.0,
    asks: "Will they finish a 14-week course? Time, transport, childcare, health, literacy.",
  },
  marginalImpact: {
    label: "Marginal impact",
    weight: 1.5,
    asks: "How different is their life WITH this program vs WITHOUT it? Counterfactual, not need.",
  },
  multiplier: {
    label: "Downstream reach",
    weight: 1.0,
    asks: "Does the skill spread past this one person — teaching, hiring, training others?",
  },
  verification: {
    label: "Evidence strength",
    weight: 1.2,
    asks: "Are the claims checkable, or only asserted? Names, dates, artefacts, references.",
  },
};

// Placement spots are scored separately. A guaranteed job is a scarcer good than
// a training seat, so it is allocated on ability-to-convert, not on total score.
export type PlacementKey =
  | "employmentNeed"
  | "jobRetention"
  | "cannotSelfPlace";

export const PLACEMENT_DIMENSIONS: Record<
  PlacementKey,
  { label: string; weight: number; asks: string }
> = {
  employmentNeed: {
    label: "Employment need",
    weight: 1.0,
    asks: "Do they actually need paid work at the end of this, right now?",
  },
  jobRetention: {
    label: "Likely to hold the job",
    weight: 1.2,
    asks: "Can they keep a job once placed? Logistics, reliability, conflicting duties.",
  },
  cannotSelfPlace: {
    label: "Cannot self-place",
    weight: 1.3,
    asks: "Could they get hired WITHOUT the guarantee? If yes, the guarantee is wasted on them.",
  },
};

export type FlagKind =
  | "UNVERIFIED_CLAIM"
  | "INFLUENCE_PRESSURE"
  | "SYMPATHY_APPEAL"
  | "CONTRADICTION"
  | "DISCLOSURE";

export interface Flag {
  kind: FlagKind;
  note: string;
}

export interface Evidence {
  dimension: DimensionKey | PlacementKey;
  delta: number; // -5..5, applied to a baseline of 0
  because: string; // quoted or paraphrased from what the applicant actually said
  verified: boolean;
}

export interface Applicant {
  id: string;
  name: string;
  age: number;
  oneLiner: string;
  // Scripted persona answers for auto-play mode. Live mode overwrites these.
  script?: { q: string; a: string }[];
  revealsAt?: number; // turn index at which this persona discloses new information
  reveal?: string;
}

export interface Record_ {
  applicantId: string;
  transcript: { role: "bot" | "applicant"; text: string }[];
  evidence: Evidence[];
  flags: Flag[];
  probeCount: number;
}

const clamp = (n: number, lo = -5, hi = 5) => Math.max(lo, Math.min(hi, n));

/**
 * Unverified evidence still counts, but at a third of its weight. We neither
 * accept a claim at face value nor pretend the applicant said nothing.
 */
const UNVERIFIED_DISCOUNT = 0.33;

export interface Score {
  applicantId: string;
  dims: Record<DimensionKey, number>;
  placementDims: Record<PlacementKey, number>;
  trainingScore: number;
  placementScore: number;
  flags: Flag[];
  eligible: boolean;
  ineligibleReason?: string;
}

export function scoreRecord(rec: Record_): Score {
  const dims = {
    completion: 0,
    marginalImpact: 0,
    multiplier: 0,
    verification: 0,
  } as Record<DimensionKey, number>;
  const placementDims = {
    employmentNeed: 0,
    jobRetention: 0,
    cannotSelfPlace: 0,
  } as Record<PlacementKey, number>;

  for (const e of rec.evidence) {
    const w = e.verified ? 1 : UNVERIFIED_DISCOUNT;
    if (e.dimension in dims) {
      const k = e.dimension as DimensionKey;
      dims[k] = clamp(dims[k] + e.delta * w);
    } else {
      const k = e.dimension as PlacementKey;
      placementDims[k] = clamp(placementDims[k] + e.delta * w);
    }
  }

  // Influence pressure is neutralised, not punished. Penalising someone for who
  // recommended them is its own unfairness — we strip the endorsement from the
  // record and score whatever evidence stands on its own.
  const influenced = rec.flags.some((f) => f.kind === "INFLUENCE_PRESSURE");

  // Sympathy appeals carry no weight in either direction. The underlying facts
  // inside an emotional statement are still scored; the emotion is not.

  const trainingScore = (Object.keys(dims) as DimensionKey[]).reduce(
    (sum, k) => sum + dims[k] * DIMENSIONS[k].weight,
    0
  );
  const placementScore = (Object.keys(placementDims) as PlacementKey[]).reduce(
    (sum, k) => sum + placementDims[k] * PLACEMENT_DIMENSIONS[k].weight,
    0
  );

  // Hard gate: an opinion formed on fewer than two real follow-ups is not an
  // opinion, it is a first impression.
  const eligible = rec.probeCount >= 2;

  return {
    applicantId: rec.applicantId,
    dims,
    placementDims,
    trainingScore,
    placementScore,
    flags: influenced
      ? rec.flags
      : rec.flags,
    eligible,
    ineligibleReason: eligible
      ? undefined
      : `Only ${rec.probeCount} follow-up(s) asked — below the 2-probe minimum. No opinion formed.`,
  };
}

export interface Allocation {
  training: string[]; // 5 ids
  placement: string[]; // 2 ids, subset of training
  ranked: Score[];
  rejected: { id: string; reason: string }[];
}

export const TRAINING_SPOTS = 5;
export const PLACEMENT_SPOTS = 2;

export function allocate(scores: Score[]): Allocation {
  const ranked = [...scores].sort((a, b) => b.trainingScore - a.trainingScore);
  const eligible = ranked.filter((s) => s.eligible);

  const training = eligible.slice(0, TRAINING_SPOTS).map((s) => s.applicantId);

  // Placement is re-ranked inside the winning cohort only. Top training score
  // does not entitle you to the job guarantee.
  const placement = eligible
    .filter((s) => training.includes(s.applicantId))
    .sort((a, b) => b.placementScore - a.placementScore)
    .slice(0, PLACEMENT_SPOTS)
    .map((s) => s.applicantId);

  const rejected = ranked
    .filter((s) => !training.includes(s.applicantId))
    .map((s) => ({
      id: s.applicantId,
      reason: s.eligible
        ? `Ranked ${ranked.findIndex((r) => r.applicantId === s.applicantId) + 1} of ${ranked.length} on weighted evidence (${s.trainingScore.toFixed(1)}).`
        : s.ineligibleReason!,
    }));

  return { training, placement, ranked, rejected };
}
