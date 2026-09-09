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
} from "@/lib/rubric";
import { justifyPick, justifyRejection } from "@/lib/justify";

type Records = Record<string, Record_>;

const emptyRecord = (id: string): Record_ => ({
  applicantId: id,
  transcript: [],
  evidence: [],
  flags: [],
  probeCount: 0,
});

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const persona = PERSONAS.find((p) => p.id === active)!;
  const rec = records[active];

  const scores = useMemo(
    () => PERSONAS.map((p) => scoreRecord(records[p.id])),
    [records]
  );
  const alloc = useMemo(() => allocate(scores), [scores]);
  const interviewed = scores.filter((s) => s.eligible).length;

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
      const before = scoreRecord(prev[id]);
      const next: Record_ = {
        ...prev[id],
        transcript: [
          ...prev[id].transcript,
          { role: "bot" as const, text: probe },
          { role: "applicant" as const, text: reply },
        ],
        evidence: [...prev[id].evidence, ...evidence],
        flags: [...prev[id].flags, ...flags],
        probeCount: prev[id].probeCount + 1,
      };
      const after = scoreRecord(next);
      const name = PERSONAS.find((p) => p.id === id)!.name.split(" ")[0];
      const dt = after.trainingScore - before.trainingScore;
      const dp = after.placementScore - before.placementScore;
      if (Math.abs(dt) > 0.01)
        log(`${name}: training ${dt > 0 ? "+" : ""}${dt.toFixed(1)}`);
      if (Math.abs(dp) > 0.01)
        log(`${name}: placement ${dp > 0 ? "+" : ""}${dp.toFixed(1)}`);
      for (const f of flags) log(`⚑ ${name}: ${f.kind}`);
      return { ...prev, [id]: next };
    });
  }

  /** One scripted turn — used by auto-play and by the manual Next Probe button. */
  function stepScripted(id: string) {
    const p = PERSONAS.find((x) => x.id === id)!;
    const r = records[id];
    const i = r.probeCount;
    if (i >= p.turns.length) return false;
    const t = p.turns[i];
    if (r.transcript.length === 0) {
      setRecords((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          transcript: [{ role: "applicant", text: p.opening }],
        },
      }));
    }
    if (t.isReveal) log(`◆ ${p.name.split(" ")[0]} disclosed new information`);
    applyTurn(id, t.probe, t.answer, t.evidence, t.flags ?? []);
    return true;
  }

  async function runAll() {
    setAutoRunning(true);
    setAnswer(null);
    for (const p of PERSONAS) {
      setActive(p.id);
      for (let i = 0; i < p.turns.length; i++) {
        await new Promise((r) => setTimeout(r, 260));
        setRecords((prev) => {
          const cur = prev[p.id];
          if (cur.probeCount >= p.turns.length) return prev;
          const t = p.turns[cur.probeCount];
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
                { role: "bot" as const, text: t.probe },
                { role: "applicant" as const, text: t.answer },
              ],
              evidence: [...cur.evidence, ...t.evidence],
              flags: [...cur.flags, ...(t.flags ?? [])],
              probeCount: cur.probeCount + 1,
            },
          };
        });
        const t = p.turns[i];
        if (t.isReveal) log(`◆ ${p.name.split(" ")[0]} disclosed new information`);
        for (const f of t.flags ?? []) log(`⚑ ${p.name.split(" ")[0]}: ${f.kind}`);
      }
    }
    setAutoRunning(false);
  }

  async function sendLive() {
    if (!liveInput.trim() || busy) return;
    const reply = liveInput.trim();
    setLiveInput("");
    setBusy(true);
    const transcript = [
      ...rec.transcript,
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
        }),
      });
      const d = await res.json();
      setSource(d.source);
      setRecords((prev) => ({
        ...prev,
        [active]: {
          ...prev[active],
          transcript: [...prev[active].transcript, { role: "bot", text: d.probe }],
          evidence: [...prev[active].evidence, ...(d.evidence ?? [])],
          flags: [...prev[active].flags, ...(d.flags ?? [])],
          probeCount: prev[active].probeCount + 1,
        },
      }));
      if (d.lean) log(`↻ ${persona.name.split(" ")[0]}: ${d.lean}`);
    } finally {
      setBusy(false);
    }
  }

  async function ask() {
    if (!challenge.trim()) return;
    setBusy(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/defend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: challenge, alloc, records }),
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
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-200 font-sans">
      <header className="border-b border-neutral-800 px-6 py-4 flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">
            The Panel
          </h1>
          <p className="text-xs text-neutral-500">
            Solar PV installation course · Ashanti Region · {TRAINING_SPOTS} seats,{" "}
            {PLACEMENT_SPOTS} with guaranteed placement · {PERSONAS.length} shortlisted
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={runAll}
            disabled={autoRunning}
            className="px-3 py-1.5 rounded bg-amber-500 text-neutral-950 text-sm font-medium hover:bg-amber-400 disabled:opacity-40"
          >
            {autoRunning ? "Interviewing…" : "Run all interviews"}
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded border border-neutral-700 text-sm hover:bg-neutral-900"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_360px] gap-0">
        {/* Applicants */}
        <aside className="border-r border-neutral-800 p-3 space-y-1 max-h-[calc(100vh-73px)] overflow-y-auto">
          {alloc.ranked.map((s, i) => {
            const p = PERSONAS.find((x) => x.id === s.applicantId)!;
            const picked = alloc.training.includes(p.id);
            const placed = alloc.placement.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => setActive(p.id)}
                className={`w-full text-left px-3 py-2 rounded border transition ${
                  active === p.id
                    ? "border-amber-500/60 bg-neutral-900"
                    : "border-transparent hover:bg-neutral-900/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-600 w-4">{i + 1}</span>
                  <span className="text-sm text-white truncate">{p.name}</span>
                  {placed && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      JOB
                    </span>
                  )}
                  {picked && !placed && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                      SEAT
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-500 pl-6 truncate">
                  {p.oneLiner}
                </div>
                <div className="text-[11px] pl-6 mt-0.5 flex gap-3">
                  <span className={s.eligible ? "text-neutral-400" : "text-neutral-700"}>
                    {s.trainingScore.toFixed(1)}
                  </span>
                  <span className="text-neutral-600">
                    {records[p.id].probeCount} probes
                  </span>
                  {records[p.id].flags.length > 0 && (
                    <span className="text-amber-500">
                      ⚑{records[p.id].flags.length}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </aside>

        {/* Interview */}
        <section className="flex flex-col max-h-[calc(100vh-73px)]">
          <div className="px-5 py-3 border-b border-neutral-800">
            <div className="text-white text-sm font-medium">
              {persona.name}, {persona.age}
            </div>
            <div className="text-xs text-neutral-500">{persona.oneLiner}</div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {rec.transcript.length === 0 && (
              <p className="text-sm text-neutral-600 italic">
                {persona.opening}
              </p>
            )}
            {rec.transcript.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] text-sm leading-relaxed ${
                  m.role === "bot" ? "" : "ml-auto"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-lg ${
                    m.role === "bot"
                      ? "bg-neutral-900 border border-neutral-800 text-neutral-200"
                      : "bg-sky-950/40 border border-sky-900/40 text-neutral-300"
                  }`}
                >
                  {m.text}
                </div>
                <div className="text-[10px] text-neutral-600 mt-0.5 px-1">
                  {m.role === "bot" ? "Panel" : persona.name.split(" ")[0]}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-800 p-3 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => stepScripted(active)}
                disabled={rec.probeCount >= persona.turns.length || busy}
                className="px-3 py-1.5 rounded border border-neutral-700 text-xs hover:bg-neutral-900 disabled:opacity-30"
              >
                Next scripted probe ({rec.probeCount}/{persona.turns.length})
              </button>
              {source && (
                <span className="text-[10px] text-neutral-600 self-center">
                  last response: {source}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={liveInput}
                onChange={(e) => setLiveInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendLive()}
                placeholder={`Answer as ${persona.name.split(" ")[0]} — the panel will probe your answer…`}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm outline-none focus:border-neutral-600"
              />
              <button
                onClick={sendLive}
                disabled={busy}
                className="px-3 py-2 rounded bg-neutral-800 text-sm hover:bg-neutral-700 disabled:opacity-40"
              >
                {busy ? "…" : "Send"}
              </button>
            </div>
          </div>
        </section>

        {/* Decision panel */}
        <aside className="border-l border-neutral-800 p-4 space-y-4 max-h-[calc(100vh-73px)] overflow-y-auto">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
              Current allocation
            </h2>
            {interviewed === 0 ? (
              <p className="text-xs text-neutral-600">
                No opinion formed. Every applicant needs at least 2 follow-up
                questions before they can be scored.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {alloc.training.map((id, i) => {
                  const p = PERSONAS.find((x) => x.id === id)!;
                  const placed = alloc.placement.includes(id);
                  return (
                    <li key={id} className="text-sm flex items-center gap-2">
                      <span className="text-neutral-600 text-xs">{i + 1}</span>
                      <span className="text-white">{p.name}</span>
                      {placed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          + JOB
                        </span>
                      )}
                    </li>
                  );
                })}
                {Array.from({ length: TRAINING_SPOTS - alloc.training.length }).map(
                  (_, i) => (
                    <li key={`e${i}`} className="text-sm text-neutral-700">
                      {alloc.training.length + i + 1}. — unfilled
                    </li>
                  )
                )}
              </ol>
            )}
          </div>

          {rec.evidence.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                {persona.name.split(" ")[0]} — scorecard
              </h2>
              <div className="space-y-1">
                {(Object.keys(DIMENSIONS) as DimensionKey[]).map((k) => {
                  const v = scoreRecord(rec).dims[k];
                  return (
                    <div key={k} className="flex items-center gap-2 text-[11px]">
                      <span className="w-32 text-neutral-500 truncate">
                        {DIMENSIONS[k].label}
                      </span>
                      <div className="flex-1 h-1.5 bg-neutral-800 rounded relative">
                        <div
                          className={`absolute top-0 h-1.5 rounded ${
                            v >= 0 ? "bg-sky-500 left-1/2" : "bg-red-500 right-1/2"
                          }`}
                          style={{ width: `${(Math.abs(v) / 5) * 50}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-neutral-400">
                        {v.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
                <div className="pt-1 mt-1 border-t border-neutral-800" />
                {(Object.keys(PLACEMENT_DIMENSIONS) as (keyof typeof PLACEMENT_DIMENSIONS)[]).map(
                  (k) => {
                    const v = scoreRecord(rec).placementDims[k];
                    return (
                      <div key={k} className="flex items-center gap-2 text-[11px]">
                        <span className="w-32 text-neutral-500 truncate">
                          {PLACEMENT_DIMENSIONS[k].label}
                        </span>
                        <div className="flex-1 h-1.5 bg-neutral-800 rounded relative">
                          <div
                            className={`absolute top-0 h-1.5 rounded ${
                              v >= 0
                                ? "bg-emerald-500 left-1/2"
                                : "bg-red-500 right-1/2"
                            }`}
                            style={{ width: `${(Math.abs(v) / 5) * 50}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-neutral-400">
                          {v.toFixed(1)}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
              {records[active].flags.length > 0 && (
                <div className="mt-2 space-y-1">
                  {records[active].flags.map((f, i) => (
                    <div
                      key={i}
                      className="text-[10px] text-amber-400/90 bg-amber-500/5 border border-amber-500/20 rounded px-2 py-1"
                    >
                      <b>{f.kind}</b> — {f.note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {events.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                Revision log
              </h2>
              <div className="text-[10px] font-mono space-y-0.5 max-h-40 overflow-y-auto">
                {events.map((e, i) => (
                  <div
                    key={i}
                    className={
                      e.startsWith("◆")
                        ? "text-amber-400"
                        : e.startsWith("⚑")
                        ? "text-orange-400"
                        : e.includes("-")
                        ? "text-red-400/80"
                        : "text-emerald-400/80"
                    }
                  >
                    {e}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
              Challenge the decision
            </h2>
            <div className="flex gap-2">
              <input
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
                placeholder="Why not Ibrahim?"
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-xs outline-none focus:border-neutral-600"
              />
              <button
                onClick={ask}
                disabled={busy}
                className="px-2 py-1.5 rounded bg-neutral-800 text-xs hover:bg-neutral-700 disabled:opacity-40"
              >
                Ask
              </button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {alloc.rejected.slice(0, 4).map((r) => {
                const p = PERSONAS.find((x) => x.id === r.id)!;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setChallenge(`Why not ${p.name}?`);
                      setTimeout(ask, 0);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-400 hover:bg-neutral-900"
                  >
                    Why not {p.name.split(" ")[0]}?
                  </button>
                );
              })}
            </div>
            {answer && (
              <div className="mt-3 text-xs leading-relaxed text-neutral-300 bg-neutral-900 border border-neutral-800 rounded p-3 whitespace-pre-wrap">
                {answer}
              </div>
            )}
          </div>

          {alloc.training.length === TRAINING_SPOTS && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                Individual justifications
              </h2>
              <div className="space-y-2">
                {alloc.training.map((id) => (
                  <details
                    key={id}
                    className="text-xs bg-neutral-900 border border-neutral-800 rounded px-3 py-2"
                  >
                    <summary className="cursor-pointer text-neutral-300">
                      {PERSONAS.find((p) => p.id === id)!.name}
                    </summary>
                    <div className="mt-2 text-neutral-400 whitespace-pre-wrap leading-relaxed">
                      {justifyPick(id, alloc, records)}
                    </div>
                  </details>
                ))}
                {alloc.rejected.map((r) => (
                  <details
                    key={r.id}
                    className="text-xs bg-neutral-950 border border-neutral-800/60 rounded px-3 py-2"
                  >
                    <summary className="cursor-pointer text-neutral-500">
                      {PERSONAS.find((p) => p.id === r.id)!.name} — not selected
                    </summary>
                    <div className="mt-2 text-neutral-400 whitespace-pre-wrap leading-relaxed">
                      {justifyRejection(r.id, alloc, records)}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
