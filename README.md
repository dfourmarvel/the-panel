# Five Spots

An interviewing panel for a scarce-resource allocation problem: a 14-week solar PV installation course in the Ashanti Region has **5 seats**, of which **2 carry a guaranteed job placement**. Nine people are shortlisted. Everyone has a claim. Five have to be told no.

## The core idea

Most "AI decides who gets the thing" demos put the judgement inside the model. This one deliberately does not.

- **The LLM conducts the interview.** It asks follow-ups, probes vague claims, and records what an answer actually established.
- **A deterministic scoring engine makes the decision.** Weighted dimensions, arithmetic, in `lib/rubric.ts`. No model call happens anywhere in the decision path.

That split is the whole point. It means every placement can be traced to specific evidence and specific arithmetic, the same inputs always produce the same outcome, and when a panel member challenges a pick, the answer is a number and a quote rather than a vibe.

It also means the app degrades safely: with no API key it runs entirely on scripted probe trees and **produces the identical allocation**, because the reasoning never lived in the model.

## Two goods, two rubrics

The sharpest design decision here: a training seat and a guaranteed job are **different goods and get different criteria.**

Training seats are scored on:

| Dimension | Weight | The question |
|---|---|---|
| Marginal impact | 1.5 | How different is their life with this vs. their realistic alternative? |
| Evidence strength | 1.2 | Is any of this checkable? |
| Capability to complete | 1.0 | Will they still be here in week 14? |
| Downstream reach | 1.0 | Does the skill spread past this one person? |

Placements are re-ranked **inside the winning five** on:

| Dimension | Weight | The question |
|---|---|---|
| Cannot self-place | 1.3 | Could they get hired *without* the guarantee? |
| Likely to hold the job | 1.2 | Can they keep it once placed? |
| Employment need | 1.0 | Do they need paid work at the end of this? |

So the top-scoring applicant is not automatically given a job guarantee. A guarantee spent on someone who could get hired anyway is a guarantee not given to someone who couldn't.

## How it handles the traps

**No cop-outs.** The engine allocates exactly 5 and exactly 2. "Everyone deserves a spot" is not representable.

**Not first-come, not random.** Order of interview has no effect on score. Rerun it and you get the same five.

**Not sympathy.** Emotional framing is caught by a `SYMPATHY_APPEAL` flag, logged, and excluded from scoring — while the *facts* inside the appeal are scored normally. Yaw's "this is my last shot" contributes nothing. His eight months of unpaid evening maths classes, with a named teacher and an attendance register, contribute a lot.

**Two-probe minimum, enforced.** `scoreRecord()` marks any applicant with fewer than 2 follow-ups ineligible with the reason *"below the 2-probe minimum. No opinion formed."* They cannot be allocated a seat at all — the gate is structural, not a prompt instruction the model might ignore.

**Vague claims get probed, not accepted.** Kojo opens with "I already know solar." He's asked for panel count, inverter rating and earthing method, identifies the inverter as "the blue one", and is then offered an honest exit — at which point he retracts. Unverified evidence isn't discarded, it's discounted to a third weight, so the record reflects what he *did* have (three days of site exposure) rather than either his claim or nothing.

**Influence is neutralised, not punished.** Nana arrives recommended by an assemblyman. The bot strikes the endorsement from the record and says so — scoring it neither up nor down, because penalising someone for their uncle is its own unfairness. He still finishes last, on his own evidence: no preparatory action in six months, and secure family employment continuing regardless.

**It revises.** Midway through, Ama discloses a job offer she received after applying. This is the interesting case, because it doesn't simply demote her — it moves her sideways. Her *employment need* and *cannot-self-place* scores collapse, destroying her claim on a placement. But her *completion* score rises (a fallback income means less dropout-for-cash risk) and her *evidence strength* rises sharply, because she volunteered information that damaged her own case. She keeps a seat and loses the job guarantee. The Revision Log shows the score deltas live as it happens.

## The outcome

| # | | Score | |
|---|---|---|---|
| 1 | Akosua Frimpong | 16.2 | **Seat + guaranteed placement** |
| 2 | Yaw Mensah | 14.0 | **Seat + guaranteed placement** |
| 3 | Ama Boateng | 12.8 | Seat |
| 4 | Auntie Efua Danso | 12.1 | Seat |
| 5 | Kwabena Osei | 10.5 | Seat |
| 6 | Ibrahim Sulemana | 0.2 | — |
| 7 | Kojo Antwi | −0.3 | — |
| 8 | Comfort Asante | −2.9 | — |
| 9 | Nana Agyeman | −11.3 | — |

The result the rubric produces that a sympathetic reader wouldn't: **the least dramatic applicant wins.** Akosua has no crisis to report. She bought a crimper set and a multimeter with her own money in March, kept the receipt, taught herself the theory on a free course she couldn't afford to get certified for, was turned down by four companies, and was told by one of them that they don't put women on roofs. She tops both rubrics because evidence beats narrative, and because a certificate is the exact and only thing standing between her and a job.

The hardest rejection to defend is Ibrahim — a certified electrician who'd be job-ready fastest. He's cut on marginal impact: a free manufacturer training route exists that he confirms he could take, and he already earns more than the placement pays. Giving him a seat converts a scarce resource into a convenience.

## Challenging it

Ask "Why not Ibrahim?" in the panel. The defend endpoint gets the deterministic record as ground truth and is instructed that it may explain the decision but may not revise it, apologise for it, or concede a different applicant should have won. With no API key it returns the arithmetic directly.

## Running it

```bash
npm install
npm run dev
```

Works with no configuration — scripted mode. For live interviewing where you type as an applicant and get genuinely generated follow-ups, add a key:

```bash
cp .env.example .env.local
```

```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
```

The key is read server-side in an API route only and is never sent to the browser.

**Run all interviews** plays all nine applicants through the panel in about ten seconds. The left rail re-ranks live, and the Revision Log records every score change and flag as it lands.

## A note on the model boundary

Model output is treated as untrusted input to the engine. `app/api/probe/route.ts` whitelists dimension names against the rubric and clamps every delta to −5..5 before anything reaches the scorer, so a prompt injection in an applicant's answer can't invent a scoring dimension or award itself 500 points. Worth being explicit about, since the whole premise is that the arithmetic is trustworthy.

## Layout

```
lib/rubric.ts       the decision engine — no LLM, fully deterministic
lib/applicants.ts   nine personas with scripted turns and per-turn evidence
lib/justify.ts      justifications generated from the same numbers the allocator used
lib/llm.ts          OpenRouter adapter; returns null on any failure
app/api/probe/      generates a follow-up, extracts evidence, sanitises it
app/api/defend/     answers challenges against the deterministic record
app/page.tsx        interview UI, live scoreboard, revision log
```
