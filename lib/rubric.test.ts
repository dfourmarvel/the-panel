// The engine's claims, checked rather than asserted. No dependencies: Node 24
// strips the types and runs this directly.
//
//   npm test
//
// The point of these is narrow. They do not check that the rubric encodes good
// values — that is a design argument, not a testable one. They check that the
// mechanical guarantees the README makes are actually true of the code: the
// allocation is exactly 5 and exactly 2, a job guarantee only ever goes to
// someone who also has a seat, the 2-probe gate is structural, and the same
// evidence produces the same score no matter what order it arrived in.

import test from "node:test";
import assert from "node:assert/strict";

import {
  scoreRecord,
  allocate,
  TRAINING_SPOTS,
  PLACEMENT_SPOTS,
  type Evidence,
  type Record_,
} from "./rubric.ts";

function record(
  applicantId: string,
  evidence: Evidence[],
  probeCount = 3
): Record_ {
  return { applicantId, transcript: [], evidence, flags: [], probeCount };
}

const ev = (
  dimension: Evidence["dimension"],
  delta: number,
  verified = true
): Evidence => ({ dimension, delta, because: "test", verified });

/** Nine applicants on a descending gradient, all past the probe gate. */
function nineApplicants() {
  return Array.from({ length: 9 }, (_, i) =>
    scoreRecord(
      record(`a${i}`, [
        ev("marginalImpact", 4 - i * 0.5),
        ev("verification", 3 - i * 0.3),
        ev("employmentNeed", i % 3),
        ev("cannotSelfPlace", (i * 2) % 5),
      ])
    )
  );
}

test("allocates exactly 5 seats and exactly 2 guarantees", () => {
  const { training, placement } = allocate(nineApplicants());
  assert.equal(training.length, TRAINING_SPOTS);
  assert.equal(placement.length, PLACEMENT_SPOTS);
});

test("a job guarantee never goes to someone without a seat", () => {
  const { training, placement } = allocate(nineApplicants());
  for (const id of placement) assert.ok(training.includes(id));
});

test("the 2-probe minimum is a gate, not a preference", () => {
  // Overwhelming evidence, one follow-up. Cannot be seated at any score.
  const starved = scoreRecord(
    record("starved", [ev("marginalImpact", 5), ev("verification", 5)], 1)
  );
  assert.equal(starved.eligible, false);

  const { training, rejected } = allocate([starved, ...nineApplicants()]);
  assert.ok(!training.includes("starved"));
  assert.match(
    rejected.find((r) => r.id === "starved")!.reason,
    /below the 2-probe minimum/
  );
});

test("the same evidence scores the same in any order", () => {
  // Saturating evidence: this is the case that breaks if the score is clamped
  // as it accumulates rather than once at the end.
  const items = [
    ev("completion", 4),
    ev("completion", 4),
    ev("completion", -5),
  ];
  const forward = scoreRecord(record("x", items));
  const reverse = scoreRecord(record("x", [...items].reverse()));
  assert.equal(forward.dims.completion, reverse.dims.completion);
  assert.equal(forward.trainingScore, reverse.trainingScore);
});

test("unverified claims are discounted, not discarded", () => {
  const claimed = scoreRecord(record("x", [ev("verification", 3, false)]));
  const shown = scoreRecord(record("y", [ev("verification", 3, true)]));
  assert.ok(claimed.dims.verification > 0);
  assert.ok(claimed.dims.verification < shown.dims.verification);
});

test("the top training score does not entitle you to a guarantee", () => {
  // Best overall, but could obviously get hired without the guarantee.
  const strong = scoreRecord(
    record("strong", [ev("marginalImpact", 5), ev("cannotSelfPlace", -5)])
  );
  const needy = Array.from({ length: 4 }, (_, i) =>
    scoreRecord(
      record(`needy${i}`, [ev("marginalImpact", 2), ev("cannotSelfPlace", 4)])
    )
  );
  const { training, placement } = allocate([strong, ...needy]);
  assert.ok(training.includes("strong"));
  assert.ok(!placement.includes("strong"));
});
