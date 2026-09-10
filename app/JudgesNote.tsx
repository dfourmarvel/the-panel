"use client";

import { DIMENSIONS, PLACEMENT_DIMENSIONS } from "@/lib/rubric";

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
  {
    path: "lib/rubric.ts",
    what: "the decision engine — weights, scoring, allocation, flip points",
  },
  {
    path: "lib/applicants.ts",
    what: "nine applicants, their files, and their scripted turns",
  },
  {
    path: "lib/prompts.ts",
    what: "both system prompts, shown verbatim in the Prompt tab",
  },
  {
    path: "app/api/probe/route.ts",
    what: "interviewing, evidence extraction, and the whitelist that guards the engine",
  },
];

/** The three claims the rest of this page is evidence for. */
const CLAIMS: { head: string; sub: string }[] = [
  {
    head: "The model interviews.",
    sub: "It asks follow-ups, presses vague claims, and records what an answer established. It never scores and never allocates.",
  },
  {
    head: "Arithmetic decides.",
    sub: "A weighted rubric in plain TypeScript picks the five and the two. No model call happens anywhere in the decision path.",
  },
  {
    head: "The same inputs return the same five people.",
    sub: "Every time. Press Reset and run it again — interview order has no effect on any score.",
  },
];

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-rule-soft bg-panel px-1.5 py-0.5 font-mono text-[11px] text-muted">
      {children}
    </span>
  );
}

function Section({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <p className="text-[10px] uppercase tracking-[0.13em] text-muted">
        {label}
      </p>
      <h3 className="mt-1.5 text-[19px] font-semibold leading-[1.3] tracking-[-0.015em]">
        {title}
      </h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function WeightTable({
  rows,
}: {
  rows: { label: string; weight: number; asks: string }[];
}) {
  return (
    <ul className="divide-y divide-rule-soft border-y border-rule-soft">
      {rows.map((r) => (
        <li key={r.label} className="flex gap-4 py-3">
          <span className="tnum w-10 shrink-0 font-mono text-[12.5px] text-accent">
            ×{r.weight.toFixed(1)}
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-medium">{r.label}</span>
            <span className="mt-0.5 block text-[13px] leading-[1.55] text-muted">
              {r.asks}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function JudgesNote() {
  return (
    <div className="mx-auto max-w-[50rem] px-6 py-12 sm:py-16">
      <p className="text-[10px] uppercase tracking-[0.13em] text-muted">
        For judges
      </p>
      <h2 className="mt-2 text-balance text-[26px] leading-[1.22] tracking-[-0.022em] sm:text-[30px]">
        Nine applicants, five seats, two guaranteed jobs.
      </h2>
      <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.65] text-ink-soft">
        This panel interviews every applicant, presses on anything it cannot
        check, and allocates every spot with a written reason attached to each.
      </p>

      {/* The whole argument, before any of the evidence for it. */}
      <ol className="mt-8 divide-y divide-rule rounded-xl border border-rule bg-surface">
        {CLAIMS.map((c, i) => (
          <li key={c.head} className="flex gap-4 px-5 py-4">
            <span className="tnum mt-0.5 shrink-0 font-mono text-[12px] text-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <span className="block text-[14.5px] font-medium">{c.head}</span>
              <span className="mt-1 block text-[13.5px] leading-[1.6] text-muted">
                {c.sub}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 max-w-[62ch] text-[13.5px] leading-[1.65] text-muted">
        That split is the whole design. Every placement traces back to specific
        evidence and a specific number, and each justification is assembled from
        the exact figures the allocator used, so it cannot drift from the
        decision it explains — which is what makes the thing defensible when you
        argue with it.
      </p>

      <Section
        label="8 of 8 met"
        title="Every constraint in the brief, and where it is met"
      >
        <p className="mb-4 text-[13px] text-muted">
          Each row opens onto how it is enforced. Nothing here is enforced by
          asking the model nicely.
        </p>
        <div className="divide-y divide-rule border-y border-rule">
          {CONSTRAINTS.map((c) => (
            <details key={c.rule} className="group">
              <summary className="flex cursor-pointer list-none items-start gap-3 py-3.5 [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-[17px] shrink-0 place-items-center rounded-full bg-place-soft text-[10px] font-semibold text-place"
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1 text-[14px] font-medium leading-[1.45]">
                  {c.rule}
                </span>
                <span
                  aria-hidden
                  className="mt-1 shrink-0 text-[11px] text-muted transition-transform group-open:rotate-180"
                >
                  ▾
                </span>
              </summary>
              <div className="pb-4 pl-[29px]">
                <p className="max-w-[62ch] text-[13.5px] leading-[1.62] text-ink-soft">
                  {c.how}
                </p>
                <p className="mt-2.5">
                  <Chip>{c.where}</Chip>
                </p>
              </div>
            </details>
          ))}
        </div>
      </Section>

      <Section label="Why two rubrics" title="Two goods, scored separately">
        <p className="max-w-[62ch] text-[14px] leading-[1.65] text-ink-soft">
          A training seat and a guaranteed job are different goods, so they are
          scored on different dimensions. These weights are read straight from
          the engine.
        </p>

        <p className="mb-3 mt-6 text-[11px] uppercase tracking-[0.11em] text-muted">
          A seat is scored on
        </p>
        <WeightTable rows={Object.values(DIMENSIONS)} />

        <p className="mb-3 mt-7 text-[11px] uppercase tracking-[0.11em] text-muted">
          A guaranteed job is re-ranked inside the winning five on
        </p>
        <WeightTable rows={Object.values(PLACEMENT_DIMENSIONS)} />

        <div className="mt-6 max-w-[62ch] space-y-3.5 text-[14px] leading-[1.65] text-ink-soft">
          <p>
            So the top scorer is not automatically handed a job. A guarantee
            spent on someone who would get hired anyway is a guarantee not given
            to someone who would not — which is why the gifted seventeen-year-old
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
      </Section>

      <Section label="Four minutes" title="Try these, in this order">
        <ol className="grid gap-3 sm:grid-cols-2">
          {TRY.map((t, i) => (
            <li
              key={t.do}
              className="rounded-xl border border-rule bg-surface px-5 py-4"
            >
              <span className="tnum font-mono text-[11.5px] text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mt-1.5 block text-[14px] font-medium leading-[1.45]">
                {t.do}
              </span>
              <span className="mt-2 block text-[13px] leading-[1.6] text-muted">
                {t.expect}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="The outcome" title="The least dramatic applicant wins">
        <p className="max-w-[62ch] border-l-2 border-accent pl-5 text-[14.5px] leading-[1.68] text-ink-soft">
          Akosua has no crisis to report. She bought a crimper set and a
          multimeter with her own money in March, kept the receipt, taught
          herself the theory on a free course she could not afford to certify,
          was turned down by four installers, and was told by one of them that
          they do not put women on roofs. She tops both rubrics because evidence
          beats narrative, and because a certificate is the exact and only thing
          standing between her and a job.
        </p>
      </Section>

      <Section label="Source" title="Where to check the claims">
        <dl className="divide-y divide-rule-soft border-y border-rule-soft">
          {FILES.map((f) => (
            <div key={f.path} className="gap-4 py-3 sm:flex">
              <dt className="shrink-0 font-mono text-[12.5px] text-ink-soft sm:w-52">
                {f.path}
              </dt>
              <dd className="mt-1 text-[13.5px] leading-[1.55] text-muted sm:mt-0">
                {f.what}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 max-w-[62ch] text-[13.5px] leading-[1.62] text-muted">
          Model output is treated as untrusted input to the engine: dimension
          names are whitelisted against the rubric and every score delta is
          clamped before anything reaches the scorer, so even a successful
          injection cannot invent a scoring dimension or award itself points.
        </p>
      </Section>
    </div>
  );
}
