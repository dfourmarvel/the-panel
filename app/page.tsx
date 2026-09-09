"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { PERSONAS } from "@/lib/applicants";
import {
  scoreRecord,
  allocate,
  DIMENSIONS,
  PLACEMENT_DIMENSIONS,
  TRAINING_SPOTS,
  PLACEMENT_SPOTS,
  type Record_,
  type Evidence,
  type Flag,
  type DimensionKey,
  type PlacementKey,
} from "@/lib/rubric";
import { justifyPick, justifyRejection } from "@/lib/justify";
import { INTERVIEWER_SYSTEM, PROMPT_NOTES, ENGINE_GUARD } from "@/lib/prompts";
import JudgesNote from "./JudgesNote";

type Records = Record<string, Record_>;

const emptyRecord = (id: string): Record_ => ({
  applicantId: id,
  transcript: [],
  evidence: [],
  flags: [],
  probeCount: 0,
});

const nameOf = (id: string) => PERSONAS.find((p) => p.id === id)?.name ?? id;
const first = (id: string) => nameOf(id).split(" ")[0];

const labelOf = (k: DimensionKey | PlacementKey) =>
  k in DIMENSIONS
    ? DIMENSIONS[k as DimensionKey].label
    : PLACEMENT_DIMENSIONS[k as PlacementKey].label;

/** Renders the **bold** spans the deterministic justifications emit. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
        chunk.startsWith("**") && chunk.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {chunk.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{chunk}</span>
        )
      )}
    </>
  );
}

function EvidenceRow({ e }: { e: Evidence }) {
  const pos = e.delta > 0;
  return (
    <li className="ev-in flex gap-2.5 py-1.5">
      <span
        className={`tnum shrink-0 w-9 text-right text-[12px] font-semibold ${
          pos ? "text-accent" : "text-against"
        }`}
      >
        {pos ? "+" : ""}
        {e.delta.toFixed(1)}
      </span>
      <span className="min-w-0">
        <span className="text-[12px] font-medium text-ink-soft">
          {labelOf(e.dimension)}
        </span>
        <span
          className={`ml-1.5 text-[10px] uppercase tracking-wide ${
            e.verified ? "text-place" : "text-mark"
          }`}
        >
          {e.verified ? "verified" : "asserted · ⅓ weight"}
        </span>
        <span className="block text-[12.5px] leading-[1.5] text-muted">
          {e.because}
        </span>
      </span>
    </li>
  );
}

function FlagRow({ f }: { f: Flag }) {
  return (
    <li className="ev-in flex gap-2.5 py-1.5">
      <span className="shrink-0 w-9 text-right text-[11px] font-semibold text-mark">
        flag
      </span>
      <span className="min-w-0">
        <span className="text-[12px] font-medium text-mark">{f.kind}</span>
        <span className="block text-[12.5px] leading-[1.5] text-muted">
          {f.note}
        </span>
      </span>
    </li>
  );
}

function Bar({ v, tone }: { v: number; tone: "accent" | "place" }) {
  const pos = v >= 0;
  return (
    <div className="relative h-[5px] flex-1 rounded-full bg-rule-soft">
      <div className="absolute inset-y-0 left-1/2 w-px bg-rule" />
      <div
        className={`bar-fill absolute inset-y-0 rounded-full ${
          pos
            ? tone === "place"
              ? "bg-place left-1/2"
              : "bg-accent left-1/2"
            : "bg-against right-1/2"
        }`}
        style={{ width: `${(Math.abs(v) / 5) * 50}%` }}
      />
    </div>
  );
}

export default function Page() {
  const [records, setRecords] = useState<Records>(() =>
    Object.fromEntries(PERSONAS.map((p) => [p.id, emptyRecord(p.id)]))
  );
  const [active, setActive] = useState(PERSONAS[0].id);
  const [busy, setBusy] = useState(false);
  const [liveInput, setLiveInput] = useState("");
  const [challenge, setChallenge] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [source, setSource] = useState<string>("");
  const [events, setEvents] = useState<string[]>([]);
  const [autoRunning, setAutoRunning] = useState(false);
  const [view, setView] = useState<"brief" | "interview" | "decision" | "prompt" | "judges">("brief");
  const [justMoved, setJustMoved] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const persona = PERSONAS.find((p) => p.id === active)!;
  const rec = records[active];

  const scores = useMemo(
    () => PERSONAS.map((p) => scoreRecord(records[p.id])),
    [records]
  );
  const alloc = useMemo(() => allocate(scores), [scores]);
  const activeScore = useMemo(() => scoreRecord(rec), [rec]);
  const interviewed = scores.filter((s) => s.eligible).length;
  const complete = interviewed === PERSONAS.length;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e6, behavior: "smooth" });
  }, [records, active]);

  function log(msg: string) {
    setEvents((e) => [...e.slice(-40), msg]);
  }

  function applyTurn(
    id: string,
    probe: string,
    reply: string,
    evidence: Evidence[],
    flags: Flag[]
  ) {
    setRecords((prev) => {
      const p = PERSONAS.find((x) => x.id === id)!;
      const opening =
        prev[id].transcript.length === 0
          ? [{ role: "applicant" as const, text: p.opening }]
          : [];
      return {
        ...prev,
        [id]: {
          ...prev[id],
          transcript: [
            ...prev[id].transcript,
            ...opening,
            { role: "bot" as const, text: probe },
            { role: "applicant" as const, text: reply, evidence, flags },
          ],
          evidence: [...prev[id].evidence, ...evidence],
          flags: [...prev[id].flags, ...flags],
          probeCount: prev[id].probeCount + 1,
        },
      };
    });
  }

  function stepScripted(id: string) {
    const p = PERSONAS.find((x) => x.id === id)!;
    const i = records[id].probeCount;
    if (i >= p.turns.length) return;
    const t = p.turns[i];
    if (t.isReveal) {
      log(`${first(id)} disclosed new information mid-interview`);
      setJustMoved(id);
      setTimeout(() => setJustMoved(null), 1200);
    }
    applyTurn(id, t.probe, t.answer, t.evidence, t.flags ?? []);
  }

  async function runAll() {
    setAutoRunning(true);
    setView("interview");
    setAnswer(null);
    for (const p of PERSONAS) {
      setActive(p.id);
      for (let i = 0; i < p.turns.length; i++) {
        await new Promise((r) => setTimeout(r, 240));
        const t = p.turns[i];
        setRecords((prev) => {
          const cur = prev[p.id];
          if (cur.probeCount >= p.turns.length) return prev;
          const turn = p.turns[cur.probeCount];
          const opening =
            cur.transcript.length === 0
              ? [{ role: "applicant" as const, text: p.opening }]
              : [];
          return {
            ...prev,
            [p.id]: {
              ...cur,
              transcript: [
                ...cur.transcript,
                ...opening,
                { role: "bot" as const, text: turn.probe },
                {
                  role: "applicant" as const,
                  text: turn.answer,
                  evidence: turn.evidence,
                  flags: turn.flags ?? [],
                },
              ],
              evidence: [...cur.evidence, ...turn.evidence],
              flags: [...cur.flags, ...(turn.flags ?? [])],
              probeCount: cur.probeCount + 1,
            },
          };
        });
        if (t.isReveal) {
          log(`${p.name.split(" ")[0]} disclosed new information mid-interview`);
          setJustMoved(p.id);
          setTimeout(() => setJustMoved(null), 1200);
          await new Promise((r) => setTimeout(r, 750));
        }
        for (const f of t.flags ?? [])
          log(
            `${p.name.split(" ")[0]}: ${f.kind.toLowerCase().replace(/_/g, " ")}`
          );
      }
    }
    setAutoRunning(false);
    setView("decision");
  }

  async function sendLive() {
    if (!liveInput.trim() || busy) return;
    const reply = liveInput.trim();
    setLiveInput("");
    setBusy(true);
    const opening =
      rec.transcript.length === 0
        ? [{ role: "applicant" as const, text: persona.opening }]
        : [];
    const transcript = [
      ...rec.transcript,
      ...opening,
      { role: "applicant" as const, text: reply },
    ];
    setRecords((prev) => ({
      ...prev,
      [active]: { ...prev[active], transcript },
    }));
    try {
      const res = await fetch("/api/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: active,
          transcript,
          turnIndex: rec.probeCount,
          established: rec.evidence.map((e) => e.because),
        }),
      });
      const d = await res.json();
      setSource(d.source);
      setRecords((prev) => {
        const t = [...prev[active].transcript];
        const last = t.length - 1;
        t[last] = { ...t[last], evidence: d.evidence ?? [], flags: d.flags ?? [] };
        t.push({ role: "bot", text: d.probe });
        return {
          ...prev,
          [active]: {
            ...prev[active],
            transcript: t,
            evidence: [...prev[active].evidence, ...(d.evidence ?? [])],
            flags: [...prev[active].flags, ...(d.flags ?? [])],
            probeCount: prev[active].probeCount + 1,
          },
        };
      });
      if ((d.flags ?? []).length) {
        setJustMoved(active);
        setTimeout(() => setJustMoved(null), 1200);
      }
      if (d.lean) log(`${first(active)}: ${d.lean}`);
    } finally {
      setBusy(false);
    }
  }

  async function ask(q?: string) {
    const question = (q ?? challenge).trim();
    if (!question) return;
    setBusy(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/defend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, alloc, records }),
      });
      const d = await res.json();
      setAnswer(d.answer);
      setSource(d.source);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setRecords(Object.fromEntries(PERSONAS.map((p) => [p.id, emptyRecord(p.id)])));
    setEvents([]);
    setAnswer(null);
    setChallenge("");
    setActive(PERSONAS[0].id);
    setView("brief");
  }

  const tab = (id: typeof view, label: string, enabled = true) => (
    <button
      onClick={() => enabled && setView(id)}
      disabled={!enabled}
      className={`px-3 py-1.5 text-[13px] rounded-md transition-colors ${
        view === id
          ? "bg-surface text-ink shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
          : enabled
          ? "text-muted hover:text-ink"
          : "text-rule cursor-not-allowed"
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur border-b border-rule">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-5 sm:px-7 py-3.5">
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-[-0.01em]">
              The Panel
            </h1>
            <p className="text-[12px] text-muted">
              Solar PV installation · Ashanti Region · {TRAINING_SPOTS} seats,{" "}
              {PLACEMENT_SPOTS} with a guaranteed job
            </p>
          </div>

          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-panel border border-rule sm:ml-2 order-3 sm:order-none w-full sm:w-auto">
            {tab("brief", "Brief")}
            {tab("interview", "Interviews", interviewed > 0 || autoRunning)}
            {tab("decision", "Decision", interviewed > 0)}
            {tab("prompt", "Prompt")}
            {tab("judges", "For judges")}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {interviewed > 0 && (
              <span className="tnum hidden md:inline text-[12px] text-muted">
                {interviewed}/{PERSONAS.length} interviewed
              </span>
            )}
            <button
              onClick={runAll}
              disabled={autoRunning}
              className="px-3.5 py-2 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft disabled:opacity-40 transition-colors"
            >
              {autoRunning ? "Interviewing…" : "Run all nine"}
            </button>
            <button
              onClick={reset}
              className="px-3 py-2 rounded-lg border border-rule text-[13px] text-ink-soft hover:bg-panel transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {view === "brief" && (
        <div className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
          <button
            onClick={() => setView("judges")}
            className="mb-7 inline-flex items-center gap-2 text-[13px] text-accent hover:underline underline-offset-4"
          >
            Judging this? Start here — how it works, and what to try
            <span aria-hidden>&rarr;</span>
          </button>
          <p className="text-[13px] text-muted mb-5">The problem</p>
          <p className="text-[22px] sm:text-[26px] leading-[1.35] tracking-[-0.015em] text-balance">
            Nine people applied. Five seats. Two of those five come with a
            guaranteed job at the end. Everyone has a claim, and five people have
            to be told no.
          </p>
          <div className="mt-8 space-y-4 text-[14.5px] leading-[1.65] text-ink-soft">
            <p>
              This panel interviews each of them, presses on anything it cannot
              check, and allocates every spot. The interviewing is done by a
              language model. The deciding is not: that is a weighted rubric in
              plain arithmetic, so every placement traces back to specific
              evidence and a specific number.
            </p>
            <p>
              It holds each applicant&rsquo;s file while it talks to them. Say
              something that does not fit your own background and it will stop
              and ask which version is true.
            </p>
          </div>

          <div className="mt-9 flex flex-wrap gap-2.5">
            <button
              onClick={runAll}
              disabled={autoRunning}
              className="px-4 py-2.5 rounded-lg bg-ink text-paper text-[13.5px] font-medium hover:bg-ink-soft disabled:opacity-40 transition-colors"
            >
              Run all nine interviews
            </button>
            <button
              onClick={() => setView("interview")}
              className="px-4 py-2.5 rounded-lg border border-rule text-[13.5px] hover:bg-panel transition-colors"
            >
              Interview them yourself
            </button>
          </div>

          <div className="mt-14 pt-8 border-t border-rule">
            <p className="text-[13px] text-muted mb-4">The nine</p>
            <ul className="space-y-3">
              {PERSONAS.map((p) => (
                <li
                  key={p.id}
                  className="sm:flex gap-4 text-[13.5px] leading-[1.55]"
                >
                  <span className="sm:w-36 sm:shrink-0 block font-medium">
                    {p.name}
                  </span>
                  <span className="text-muted">{p.oneLiner}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {view === "interview" && (
        <div className="grid lg:grid-cols-[290px_1fr_330px]">
          <aside className="border-b lg:border-b-0 lg:border-r border-rule p-2.5 lg:max-h-[calc(100vh-65px)] overflow-y-auto">
            {alloc.ranked.map((s, i) => {
              const p = PERSONAS.find((x) => x.id === s.applicantId)!;
              const picked = alloc.training.includes(p.id);
              const placed = alloc.placement.includes(p.id);
              return (
                <div key={p.id}>
                  {i === TRAINING_SPOTS && interviewed > 0 && (
                    <div className="flex items-center gap-2.5 my-2.5 px-2">
                      <div className="h-px flex-1 bg-mark/35" />
                      <span className="text-[10px] uppercase tracking-[0.14em] text-mark">
                        cutline
                      </span>
                      <div className="h-px flex-1 bg-mark/35" />
                    </div>
                  )}
                  <button
                    onClick={() => setActive(p.id)}
                    className={`row-move w-full text-left px-2.5 py-2.5 rounded-lg border ${
                      justMoved === p.id ? "pulse-once " : ""
                    }${
                      active === p.id
                        ? "border-rule bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
                        : "border-transparent hover:bg-panel"
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="tnum w-4 shrink-0 text-[11px] text-muted">
                        {i + 1}
                      </span>
                      <span className="text-[13.5px] font-medium truncate">
                        {p.name}
                      </span>
                      {placed ? (
                        <span className="ml-auto shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-place-soft text-place">
                          job
                        </span>
                      ) : picked ? (
                        <span className="ml-auto shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-soft text-accent">
                          seat
                        </span>
                      ) : null}
                    </div>
                    <div className="pl-6 pr-1">
                      <div className="text-[12px] text-muted leading-snug truncate">
                        {p.oneLiner}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span
                          className={`tnum text-[12px] font-medium w-9 ${
                            s.eligible ? "text-ink-soft" : "text-rule"
                          }`}
                        >
                          {s.eligible ? s.trainingScore.toFixed(1) : "—"}
                        </span>
                        <div className="relative h-1 flex-1 rounded-full bg-rule-soft overflow-hidden">
                          <div
                            className="bar-fill absolute inset-y-0 left-0 rounded-full bg-ink-soft"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, (s.trainingScore / 18) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="tnum text-[11px] text-muted shrink-0">
                          {records[p.id].probeCount}q
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </aside>

          <section className="flex flex-col lg:max-h-[calc(100vh-65px)] border-b lg:border-b-0 border-rule">
            <div className="px-5 sm:px-7 py-3.5 border-b border-rule">
              <div className="text-[14px] font-semibold">
                {persona.name}, {persona.age}
              </div>
              <div className="text-[12.5px] text-muted">{persona.oneLiner}</div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 min-h-[340px]"
            >
              {rec.transcript.length === 0 && (
                <p className="text-[14.5px] leading-[1.6] text-muted max-w-[62ch]">
                  {persona.opening}
                </p>
              )}

              <div className="max-w-[68ch] space-y-5">
                {rec.transcript.map((m, i) =>
                  m.role === "bot" ? (
                    <div key={i}>
                      <div className="text-[11px] text-muted mb-1">Panel</div>
                      <p className="text-[14.5px] leading-[1.6]">{m.text}</p>
                    </div>
                  ) : (
                    <div key={i}>
                      <div className="text-[11px] text-muted mb-1">
                        {first(persona.id)}
                      </div>
                      <p className="text-[14.5px] leading-[1.6] text-ink-soft pl-3 border-l-2 border-rule">
                        {m.text}
                      </p>
                      {((m.evidence?.length ?? 0) > 0 ||
                        (m.flags?.length ?? 0) > 0) && (
                        <ul className="mt-2.5 ml-3 pl-3 border-l border-rule-soft">
                          {m.evidence?.map((e, j) => (
                            <EvidenceRow key={j} e={e} />
                          ))}
                          {m.flags?.map((f, j) => (
                            <FlagRow key={j} f={f} />
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="border-t border-rule px-5 sm:px-7 py-3 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => stepScripted(active)}
                  disabled={rec.probeCount >= persona.turns.length || busy}
                  className="px-2.5 py-1.5 rounded-md border border-rule text-[12px] text-ink-soft hover:bg-panel disabled:opacity-35 transition-colors"
                >
                  Next scripted probe · {rec.probeCount}/{persona.turns.length}
                </button>
                {source && (
                  <span className="text-[11px] text-muted">
                    {source === "llm" ? "live model" : source}
                  </span>
                )}
              </div>
              <p className="text-[12px] leading-[1.5] text-muted">
                Not a script. Type as {first(persona.id)} and the next question
                is written live against her file. Try contradicting it, or try
                telling it what to decide.
              </p>
              <div className="flex gap-2">
                <input
                  value={liveInput}
                  onChange={(e) => setLiveInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendLive()}
                  placeholder={`Answer as ${first(
                    persona.id
                  )} — try contradicting the file`}
                  className="flex-1 bg-surface border border-rule rounded-lg px-3 py-2 text-[13.5px] placeholder:text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-shadow"
                />
                <button
                  onClick={() => sendLive()}
                  disabled={busy}
                  className="px-3.5 py-2 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft disabled:opacity-40 transition-colors"
                >
                  {busy ? "…" : "Send"}
                </button>
              </div>
            </div>
          </section>

          <aside className="p-4 sm:p-5 space-y-7 lg:max-h-[calc(100vh-65px)] overflow-y-auto">
            <div>
              <h2 className="text-[12px] font-medium text-muted mb-3">
                Allocation so far
              </h2>
              {interviewed === 0 ? (
                <p className="text-[12.5px] leading-[1.55] text-muted">
                  Nothing decided. Every applicant needs at least two follow-up
                  questions before the engine will score them at all.
                </p>
              ) : (
                <ol className="space-y-1.5">
                  {alloc.training.map((id, i) => (
                    <li
                      key={id}
                      className="flex items-baseline gap-2 text-[13.5px]"
                    >
                      <span className="tnum w-3.5 text-[11px] text-muted">
                        {i + 1}
                      </span>
                      <span className="truncate">{nameOf(id)}</span>
                      {alloc.placement.includes(id) && (
                        <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-place-soft text-place">
                          job
                        </span>
                      )}
                    </li>
                  ))}
                  {Array.from({
                    length: TRAINING_SPOTS - alloc.training.length,
                  }).map((_, i) => (
                    <li
                      key={`e${i}`}
                      className="flex items-baseline gap-2 text-[13.5px] text-rule"
                    >
                      <span className="tnum w-3.5 text-[11px]">
                        {alloc.training.length + i + 1}
                      </span>
                      <span>unfilled</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {rec.evidence.length > 0 && (
              <div>
                <h2 className="text-[12px] font-medium text-muted mb-3">
                  {first(persona.id)} · scorecard
                </h2>
                <div className="space-y-2">
                  {(Object.keys(DIMENSIONS) as DimensionKey[]).map((k) => (
                    <div key={k} className="flex items-center gap-2.5">
                      <span className="w-[104px] shrink-0 text-[11.5px] text-muted">
                        {DIMENSIONS[k].label}
                      </span>
                      <Bar v={activeScore.dims[k]} tone="accent" />
                      <span className="tnum w-8 text-right text-[11.5px] text-ink-soft">
                        {activeScore.dims[k].toFixed(1)}
                      </span>
                    </div>
                  ))}
                  <p className="pt-3 text-[11px] text-muted border-t border-rule-soft">
                    Counts only for the two guaranteed jobs
                  </p>
                  {(Object.keys(PLACEMENT_DIMENSIONS) as PlacementKey[]).map(
                    (k) => (
                      <div key={k} className="flex items-center gap-2.5">
                        <span className="w-[104px] shrink-0 text-[11.5px] text-muted">
                          {PLACEMENT_DIMENSIONS[k].label}
                        </span>
                        <Bar v={activeScore.placementDims[k]} tone="place" />
                        <span className="tnum w-8 text-right text-[11.5px] text-ink-soft">
                          {activeScore.placementDims[k].toFixed(1)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {events.length > 0 && (
              <div>
                <h2 className="text-[12px] font-medium text-muted mb-3">
                  Revision log
                </h2>
                <ul className="space-y-1.5">
                  {events.slice(-8).map((e, i) => (
                    <li key={i} className="text-[12px] leading-snug text-ink-soft">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {interviewed > 0 && (
              <button
                onClick={() => setView("decision")}
                className="w-full px-3 py-2.5 rounded-lg border border-rule text-[13px] hover:bg-panel transition-colors"
              >
                See the decision
              </button>
            )}
          </aside>
        </div>
      )}

      {view === "judges" && <JudgesNote />}

      {view === "prompt" && (
        <div className="mx-auto max-w-[46rem] px-6 py-12 sm:py-16">
          <p className="text-[13px] text-muted">What the model is told</p>
          <h2 className="mt-2 text-[24px] sm:text-[28px] leading-[1.25] tracking-[-0.02em] text-balance">
            The interviewer prompt, verbatim.
          </h2>
          <p className="mt-4 text-[14.5px] leading-[1.65] text-ink-soft">
            This is the entire system prompt sent on every turn. It scopes the
            model to interviewing and recording evidence. It cannot allocate a
            seat, because allocation never passes through it.
          </p>

          <pre className="mt-7 rounded-lg bg-panel border border-rule p-4 text-[12px] leading-[1.6] text-ink-soft whitespace-pre-wrap font-mono overflow-x-auto">
            {INTERVIEWER_SYSTEM}
          </pre>

          <h3 className="mt-11 text-[13px] font-medium">Why each rule is there</h3>
          <dl className="mt-4 divide-y divide-rule border-y border-rule">
            {PROMPT_NOTES.map((n) => (
              <div key={n.rule} className="py-3.5">
                <dt className="text-[13.5px] font-medium">{n.rule}</dt>
                <dd className="mt-1 text-[13.5px] leading-[1.6] text-muted">
                  {n.why}
                </dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-11 text-[13px] font-medium">
            The prompt is not the only defence
          </h3>
          <p className="mt-2 text-[13.5px] leading-[1.65] text-muted">
            {ENGINE_GUARD}
          </p>
        </div>
      )}

      {view === "decision" && (
        <Decision
          alloc={alloc}
          records={records}
          complete={complete}
          challenge={challenge}
          setChallenge={setChallenge}
          ask={ask}
          answer={answer}
          busy={busy}
        />
      )}
    </main>
  );
}

function Decision({
  alloc,
  records,
  complete,
  challenge,
  setChallenge,
  ask,
  answer,
  busy,
}: {
  alloc: ReturnType<typeof allocate>;
  records: Records;
  complete: boolean;
  challenge: string;
  setChallenge: (s: string) => void;
  ask: (q?: string) => void;
  answer: string | null;
  busy: boolean;
}) {
  const cutoff = alloc.ranked.find(
    (r) => r.applicantId === alloc.training[alloc.training.length - 1]
  );

  return (
    <div className="mx-auto max-w-[46rem] px-6 py-12 sm:py-16">
      <p className="text-[13px] text-muted">
        {complete
          ? "All nine interviewed. Final allocation."
          : "Provisional. Not everyone has been interviewed yet."}
      </p>
      <h2 className="mt-2 text-[24px] sm:text-[28px] leading-[1.25] tracking-[-0.02em] text-balance">
        {alloc.training.length} of {PERSONAS.length} admitted,{" "}
        {alloc.placement.length} with a guaranteed job.
      </h2>

      <div className="mt-9 divide-y divide-rule border-y border-rule">
        {alloc.training.map((id, i) => {
          const s = alloc.ranked.find((r) => r.applicantId === id)!;
          return (
            <details key={id} className="group py-4">
              <summary className="cursor-pointer list-none flex items-baseline gap-3">
                <span className="tnum w-4 shrink-0 text-[12px] text-muted">
                  {i + 1}
                </span>
                <span className="text-[15px] font-medium">{nameOf(id)}</span>
                {alloc.placement.includes(id) && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-place-soft text-place">
                    guaranteed job
                  </span>
                )}
                <span className="tnum ml-auto text-[13px] text-muted">
                  {s.trainingScore.toFixed(1)}
                </span>
                <span className="text-[11px] text-muted group-open:hidden">
                  why
                </span>
              </summary>
              <div className="mt-3 ml-7 text-[13.5px] leading-[1.65] text-ink-soft whitespace-pre-wrap">
                <Rich text={justifyPick(id, alloc, records)} />
              </div>
            </details>
          );
        })}
      </div>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-mark/35" />
        <span className="tnum text-[11px] uppercase tracking-[0.14em] text-mark">
          cutline · {cutoff ? cutoff.trainingScore.toFixed(1) : "—"}
        </span>
        <div className="h-px flex-1 bg-mark/35" />
      </div>

      <div className="divide-y divide-rule border-y border-rule">
        {alloc.rejected.map((r) => {
          const s = alloc.ranked.find((x) => x.applicantId === r.id)!;
          return (
            <details key={r.id} className="group py-4">
              <summary className="cursor-pointer list-none flex items-baseline gap-3">
                <span className="w-4 shrink-0" />
                <span className="text-[15px] text-muted">{nameOf(r.id)}</span>
                <span className="tnum ml-auto text-[13px] text-muted">
                  {s.trainingScore.toFixed(1)}
                </span>
                <span className="text-[11px] text-muted group-open:hidden">
                  why not
                </span>
              </summary>
              <div className="mt-3 ml-7 text-[13.5px] leading-[1.65] text-ink-soft whitespace-pre-wrap">
                <Rich text={justifyRejection(r.id, alloc, records)} />
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-12">
        <h3 className="text-[13px] font-medium mb-1">Argue with it</h3>
        <p className="text-[13px] leading-[1.55] text-muted mb-3.5 max-w-[60ch]">
          It answers from the record, and is not permitted to concede that a
          different applicant should have won.
        </p>
        <div className="flex gap-2">
          <input
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="You gave a seat to someone who does not need a job. Explain that."
            className="flex-1 bg-surface border border-rule rounded-lg px-3 py-2.5 text-[13.5px] placeholder:text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-shadow"
          />
          <button
            onClick={() => ask()}
            disabled={busy}
            className="px-4 py-2.5 rounded-lg bg-ink text-paper text-[13px] font-medium hover:bg-ink-soft disabled:opacity-40 transition-colors"
          >
            {busy ? "…" : "Ask"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {alloc.rejected.slice(0, 4).map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setChallenge(`Why not ${nameOf(r.id)}?`);
                ask(`Why not ${nameOf(r.id)}?`);
              }}
              className="text-[12px] px-2.5 py-1 rounded-full border border-rule text-muted hover:text-ink hover:bg-panel transition-colors"
            >
              Why not {first(r.id)}?
            </button>
          ))}
        </div>
        {answer && (
          <div className="mt-4 rounded-lg bg-panel border border-rule p-4 text-[13.5px] leading-[1.65] text-ink-soft whitespace-pre-wrap">
            <Rich text={answer} />
          </div>
        )}
      </div>
    </div>
  );
}
