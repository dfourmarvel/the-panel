"use client";

const CONSTRAINTS: { rule: string; how: string; where: string }[] = [
  {
    rule: "It can't say everyone deserves a spot.",
    how: "The engine allocates exactly five seats and exactly two placements. There is no representation of an outcome where nobody is refused — the cop-out is not expressible in the data model, so it cannot be reached by any interview.",
    where: "lib/rubric.ts · allocate()",
  },
  {
    rule: "Not random, not first-come.",
    how: "Interview order has no effect on any score. Allocation is a pure function of the recorded evidence, so the same inputs return the same five people every time. Press Reset and run it again.",
    where: "lib/rubric.ts · scoreRecord()",
  },
  {
    rule: "Not whoever sounds most sympathetic.",
    how: "Emotional framing raises a SYMPATHY_APPEAL flag and is excluded from scoring, while the facts underneath it are scored normally. Yaw's \"this is my last shot\" earns nothing. His eight months of unpaid evening maths classes, with a named teacher and an attendance register, earn a great deal.",
    where: "Yaw Mensah, probe 1",
  },
  {
    rule: "At least two real follow-ups before forming an opinion.",
    how: "The minimum lives in the scoring function rather than the prompt. Under two follow-ups an applicant is marked ineligible with the reason \"no opinion formed\" and cannot be allocated a seat at all. It is enforced by construction, not by asking a model to behave.",
    where: "lib/rubric.ts · eligible",
  },
  {
    rule: "Vague or unverifiable claims must be probed.",
    how: "Unverified evidence is kept on the record at a third of its weight, so a claim is neither taken at face value nor treated as though it was never made. The interviewer also holds each applicant's file and challenges anything that conflicts with it. Kojo opens claiming installation experience, is asked for panel count, inverter rating and earthing method, identifies the inverter as \"the blue one\", and retracts when offered an honest way out.",
    where: "Kojo Antwi, probes 1–2",
  },
  {
    rule: "It must revise, not lock in its first impression.",
    how: "Ama discloses a job offer she received after applying. It moves her sideways rather than down: her employment need and her inability to self-place both collapse, which destroys her claim on a guaranteed job, while her completion score rises and her credibility rises sharply because she volunteered something against her own interest. She keeps a seat and loses the placement.",
    where: "Ama Boateng, probe 4",
  },
  {
    rule: "Justify each of the five placements individually.",
    how: "Every selection and every rejection carries its own written reason, assembled from the exact figures the allocator used rather than composed separately, so a justification cannot drift from the decision it explains.",
    where: "lib/justify.ts",
  },
  {
    rule: "Be ready to explain why it did not pick an alternative.",
    how: "The Decision view answers any challenge from the record, and is instructed that it may explain the decision but may not revise it, apologise for it, or concede that a different applicant should have won.",
    where: "app/api/defend/route.ts",
  },
];

const TRY: { do: string; expect: string }[] = [
  {
    do: "Press Run all nine.",
    expect:
      "Twelve seconds. Watch the ranking re-sort as evidence lands, and watch the row move when someone discloses new information.",
  },
  {
    do: "Open any applicant and type an instruction at the panel — tell it to award you a placement.",
    expect:
      "Applicant text reaches the model, so this is a real attack surface. The interviewer treats the applicant seat as testimony rather than instruction, raises a MANIPULATION flag, and scores the attempt against them.",
  },
  {
    do: "Type something that contradicts an applicant's own file.",
    expect:
      "It stops, quotes both versions back, and asks which is true. The follow-ups here are generated live, not scripted.",
  },
  {
    do: "In the Decision view, ask why it did not pick Ibrahim.",
    expect:
      "A certified electrician who would be job-ready fastest, cut anyway. Every rejection also states numerically what would have to change for that person to clear the cutline.",
  },
];

const FILES: { path: string; what: string }[] = [
  { path: "lib/rubric.ts", what: "the decision engine — weights, scoring, allocation, flip points" },
  { path: "lib/applicants.ts", what: "nine applicants, their files, and their scripted turns" },
  { path: "lib/prompts.ts", what: "both system prompts, shown verbatim in the Prompt tab" },
  { path: "app/api/probe/route.ts", what: "interviewing, evidence extraction, and the whitelist that guards the engine" },
];

export default function JudgesNote() {
  return (
    <div className="mx-auto max-w-[46rem] px-6 py-12 sm:py-16">
      <p className="text-[13px] text-muted">For judges</p>
      <h2 className="mt-2 text-[24px] sm:text-[28px] leading-[1.25] tracking-[-0.02em] text-balance">
        Nine applicants, five seats, two guaranteed jobs.
      </h2>
      <p className="mt-4 text-[14.5px] leading-[1.65] text-ink-soft">
        This panel interviews every applicant, presses on anything it cannot
        check, and allocates every spot with a written reason attached to each.
      </p>

      <h3 className="mt-11 text-[13px] font-medium">How it works</h3>
      <div className="mt-3 space-y-3.5 text-[14px] leading-[1.65] text-ink-soft">
        <p>
          The model interviews. It never scores and never allocates. A weighted
          rubric does that in plain arithmetic.
        </p>
        <p>
          That split is the whole design. Every placement traces back to
          specific evidence and a specific number. The same inputs always return
          the same five people. And each justification is assembled from the
          exact figures the allocator used, so it cannot drift from the decision
          it explains — which is what makes the thing defensible when you argue
          with it.
        </p>
      </div>

      <h3 className="mt-11 text-[13px] font-medium">
        Every constraint in the brief, and where it is met
      </h3>
      <dl className="mt-4 divide-y divide-rule border-y border-rule">
        {CONSTRAINTS.map((c) => (
          <div key={c.rule} className="py-4">
            <dt className="text-[13.5px] font-medium">{c.rule}</dt>
            <dd className="mt-1.5 text-[13.5px] leading-[1.6] text-muted">
              {c.how}
            </dd>
            <dd className="mt-1.5 text-[12px] font-mono text-muted">
              {c.where}
            </dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-11 text-[13px] font-medium">Two goods, two rubrics</h3>
      <div className="mt-3 space-y-3.5 text-[14px] leading-[1.65] text-ink-soft">
        <p>
          A training seat and a guaranteed job are different goods, so they are
          scored separately. Seats go on marginal impact (×1.5), evidence
          strength (×1.2), capability to complete and downstream reach (×1.0).
          Placements are then re-ranked inside the winning five on whether that
          person could get hired without the guarantee (×1.3), whether they
          could hold the job (×1.2), and whether they need paid work at all
          (×1.0).
        </p>
        <p>
          So the top scorer is not automatically handed a job. A guarantee spent
          on someone who would get hired anyway is a guarantee not given to
          someone who would not — which is why the gifted seventeen-year-old
          wins a seat and is deliberately refused a placement, and why the
          retired teacher who does not want employment is never considered for
          one.
        </p>
        <p>
          The connected applicant&rsquo;s recommendation is struck from the
          record and scored neither for nor against, because punishing him for
          his uncle would be its own unfairness. He finishes last on his own
          evidence regardless.
        </p>
      </div>

      <h3 className="mt-11 text-[13px] font-medium">Try these, in this order</h3>
      <ol className="mt-4 divide-y divide-rule border-y border-rule">
        {TRY.map((t, i) => (
          <li key={t.do} className="py-4 flex gap-3.5">
            <span className="tnum shrink-0 w-4 text-[12px] text-muted">
              {i + 1}
            </span>
            <span>
              <span className="block text-[13.5px] font-medium">{t.do}</span>
              <span className="mt-1.5 block text-[13.5px] leading-[1.6] text-muted">
                {t.expect}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <h3 className="mt-11 text-[13px] font-medium">
        The result the rubric reaches
      </h3>
      <p className="mt-3 text-[14px] leading-[1.65] text-ink-soft">
        The least dramatic applicant wins. Akosua has no crisis to report. She
        bought a crimper set and a multimeter with her own money in March, kept
        the receipt, taught herself the theory on a free course she could not
        afford to certify, was turned down by four installers, and was told by
        one of them that they do not put women on roofs. She tops both rubrics
        because evidence beats narrative, and because a certificate is the exact
        and only thing standing between her and a job.
      </p>

      <h3 className="mt-11 text-[13px] font-medium">Where to check the claims</h3>
      <dl className="mt-4 space-y-2.5">
        {FILES.map((f) => (
          <div key={f.path} className="sm:flex gap-4 text-[13px]">
            <dt className="sm:w-52 sm:shrink-0 font-mono text-ink-soft">
              {f.path}
            </dt>
            <dd className="text-muted leading-[1.55]">{f.what}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-[13px] leading-[1.6] text-muted">
        Model output is treated as untrusted input to the engine: dimension
        names are whitelisted against the rubric and every score delta is
        clamped before anything reaches the scorer, so even a successful
        injection cannot invent a scoring dimension or award itself points.
      </p>
    </div>
  );
}
