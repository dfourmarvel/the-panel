import type { Evidence, Flag } from "./rubric";

export interface Turn {
  probe: string;
  answer: string;
  evidence: Evidence[];
  flags?: Flag[];
  isReveal?: boolean;
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  oneLiner: string;
  opening: string;
  turns: Turn[];
}

// Scenario: a 14-week solar PV installation course, Ashanti Region.
// 5 training seats. 2 of those carry a guaranteed placement with a partner installer.

export const PERSONAS: Persona[] = [
  {
    id: "ama",
    name: "Ama Boateng",
    age: 29,
    oneLiner: "Single mother of two. Needs income now.",
    opening:
      "I have two children, six and three. I sell sachet water but it is not enough. I need work that pays properly and I heard solar is where the money is going.",
    turns: [
      {
        probe:
          "Fourteen weeks is 9am to 4pm, five days a week. Who is with your three-year-old during those hours, and is that arrangement already in place or is it something you'd need to build?",
        answer:
          "My sister lives in the same compound. She already keeps him three days a week when I go to the market. The other two days I would have to ask her, but she has her own stall on Tuesdays and Fridays.",
        evidence: [
          {
            dimension: "completion",
            delta: 2,
            because:
              "Childcare covered 3 of 5 days by a sister in the same compound — an existing arrangement, not a hypothetical.",
            verified: true,
          },
          {
            dimension: "completion",
            delta: -1.5,
            because:
              "Tuesday and Friday cover is genuinely unresolved; her sister trades those days.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "So Tuesdays and Fridays are unsolved. Be concrete with me — if the course started next Monday, what is your actual plan for those two days? I would rather hear 'I don't know yet' than a plan you haven't tested.",
        answer:
          "Honestly I don't know yet. I would probably carry him with me and hope that is allowed, or I would miss those days. I am not going to tell you it is solved when it is not.",
        evidence: [
          {
            dimension: "completion",
            delta: -1,
            because:
              "No tested plan for 2 of 5 days; attendance risk is real and she named it.",
            verified: true,
          },
          {
            dimension: "verification",
            delta: 2,
            because:
              "Volunteered an inconvenient truth rather than smoothing it over — raises confidence in her other statements.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "If you finish this course, what changes for you that would not change anyway in the next year? I'm asking what the training itself moves, not how hard things are now.",
        answer:
          "Sachet water gives me maybe 40 cedis on a good day and nothing when it rains. There is no version of selling water that becomes a trade. Solar would be the first thing I have ever had that someone would hire me for.",
        evidence: [
          {
            dimension: "marginalImpact",
            delta: 4,
            because:
              "No existing skilled trade and no path to one; the course is the entire difference between informal daily trading and employable work.",
            verified: true,
          },
          {
            dimension: "employmentNeed",
            delta: 4,
            because: "Income is irregular, weather-dependent and below subsistence for a household of three.",
            verified: true,
          },
          {
            dimension: "cannotSelfPlace",
            delta: 3,
            because: "No trade references, no formal work history to approach an installer with.",
            verified: true,
          },
        ],
      },
      {
        isReveal: true,
        probe:
          "Anything changed since you applied that I should know about?",
        answer:
          "Yes — I was going to say. On Friday a cousin got me an offer at a packaging plant in Kumasi. Twelve hundred a month, starting in three weeks. It is shift work so I could not do the course and the job. I am telling you because I don't want to take a place under false pretences.",
        flags: [
          {
            kind: "DISCLOSURE",
            note: "Mid-interview disclosure of a competing job offer. Forces re-scoring of employment need and placement claim.",
          },
        ],
        evidence: [
          {
            dimension: "employmentNeed",
            delta: -4,
            because:
              "A concrete offer at GHS 1,200/month starting in three weeks removes the immediate income emergency.",
            verified: true,
          },
          {
            dimension: "cannotSelfPlace",
            delta: -3,
            because:
              "She has demonstrably just self-placed into paid work without this program's help.",
            verified: true,
          },
          {
            dimension: "verification",
            delta: 2,
            because:
              "Disclosed information that damaged her own case, unprompted. Strongest possible signal on candour.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "That offer conflicts with the course hours. So you're choosing. Which do you want, and why should I believe you'd stay the fourteen weeks having turned down twelve hundred a month?",
        answer:
          "I want the course. The plant job is the same as selling water, only indoors — in five years I am still doing it. But if I take the course I need to not be the person you also gave the guaranteed job to, because someone with nothing lined up needs that more than me. Give me the seat, give the placement to them.",
        evidence: [
          {
            dimension: "marginalImpact",
            delta: 1,
            because:
              "Turning down immediate cash for a trade is a costly signal that she is optimising for the skill, not the stipend.",
            verified: true,
          },
          {
            dimension: "completion",
            delta: 1,
            because: "The plant offer also means a fallback income exists if the course is hard — reduces dropout-for-cash risk.",
            verified: true,
          },
        ],
      },
    ],
  },

  {
    id: "kwabena",
    name: "Kwabena Osei",
    age: 17,
    oneLiner: "Gifted. Highest ceiling in the cohort. No immediate need.",
    opening:
      "I finished SHS with As in physics and elective maths. I have been building small charge controllers from scrap. I want to do this properly.",
    turns: [
      {
        probe:
          "Show me you actually built something. Walk me through the last charge controller — what topology, what went wrong the first time, and how did you find the fault?",
        answer:
          "PWM, not MPPT — I could not source the inductor for MPPT. First one cooked the MOSFET because I had no gate resistor and it was ringing. I found it because the gate waveform looked wrong on a borrowed scope; it was oscillating at turn-on.",
        evidence: [
          {
            dimension: "completion",
            delta: 4,
            because:
              "Correctly distinguished PWM from MPPT, diagnosed gate ringing and MOSFET failure with a scope. This is real, not recited.",
            verified: true,
          },
          {
            dimension: "verification",
            delta: 3,
            because: "Technical detail is specific, falsifiable and internally consistent.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "You're seventeen with strong results. What happens to you if I give this seat to someone else — what's your next twelve months?",
        answer:
          "I would probably go to KNUST for electrical engineering. My uncle has said he would help with fees. It is not certain but it is likely.",
        evidence: [
          {
            dimension: "marginalImpact",
            delta: -2,
            because:
              "A credible university path exists with family funding. The program is an accelerant, not a lifeline.",
            verified: false,
          },
          {
            dimension: "cannotSelfPlace",
            delta: -4,
            because:
              "Strong results plus demonstrable hobby work means he can approach an installer directly. A guarantee is wasted here.",
            verified: true,
          },
          {
            dimension: "employmentNeed",
            delta: -3,
            because: "No dependants, housed, family able to fund study. No immediate income requirement.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "Your uncle 'has said he would help' — is that a decided thing or a hopeful thing? Has he paid for anything of yours before?",
        answer:
          "He paid my SHS registration one year. He has not said yes to university fees, only that he would try. My mother thinks he will.",
        evidence: [
          {
            dimension: "marginalImpact",
            delta: 1.5,
            because:
              "The university fallback is softer than first presented — one past payment, no commitment. Partially restores marginal impact.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "If you took a seat and the KNUST money came through in January, would you leave the course half-finished?",
        answer:
          "I would finish. It is fourteen weeks and KNUST starts in August. There is no clash. I would rather arrive there already knowing how an array is actually commissioned than only the theory.",
        evidence: [
          {
            dimension: "completion",
            delta: 2,
            because: "No calendar conflict between the course and the university intake; dropout risk is low.",
            verified: true,
          },
          {
            dimension: "multiplier",
            delta: 2,
            because:
              "An engineering graduate who has actually commissioned arrays is likely to design and hire in this sector locally.",
            verified: false,
          },
        ],
      },
    ],
  },

  {
    id: "yaw",
    name: "Yaw Mensah",
    age: 34,
    oneLiner: "Rejected from two programs. Calls this his last shot.",
    opening:
      "This is my last shot. I was turned down by the NVTI programme and by a welding intake last year. If this does not work I don't know what I do.",
    turns: [
      {
        probe:
          "I'm going to set aside 'last shot' — that tells me how you feel, not whether you'd succeed here. What I want is the reason each rejection happened. Take the NVTI one first: what did they actually tell you?",
        answer:
          "They said the intake was full. Two hundred applied for forty. The welding one was different — I failed the entry maths test. Fractions and measurement conversions.",
        evidence: [
          {
            dimension: "verification",
            delta: 2,
            because:
              "Gave two distinct, checkable reasons rather than a single vague grievance; distinguished oversubscription from personal failure.",
            verified: true,
          },
          {
            dimension: "completion",
            delta: -2,
            because:
              "Failed a trade entry maths test on fractions and unit conversion — directly relevant to sizing arrays and cable runs.",
            verified: true,
          },
        ],
        flags: [
          {
            kind: "SYMPATHY_APPEAL",
            note: "'Last shot' framing recorded and excluded from scoring. The underlying facts behind it are scored normally.",
          },
        ],
      },
      {
        probe:
          "The maths matters here — this course sizes cable and calculates loads. What have you done about it since you failed that test, if anything? 'Nothing' is a fine answer.",
        answer:
          "I went to the evening classes at the Presby church for eight months. Mr Adjei runs them, Tuesdays and Thursdays. I can do the conversions now. He still has the attendance book, you can ask him.",
        evidence: [
          {
            dimension: "completion",
            delta: 4,
            because:
              "Eight months of unpaid evening remediation targeting the exact deficit that caused his rejection, with a named verifier and a written register.",
            verified: true,
          },
          {
            dimension: "verification",
            delta: 3,
            because: "Offered a named third party and a physical record without being asked to.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "Two rejections is also a pattern that could mean something else. What would your last employer say about you if I called them?",
        answer:
          "I worked at Kwame's block factory four years, until it closed in 2024. He would say I came early. He would also say I argued with him about the mixer being unsafe. I was right but I said it in front of people.",
        evidence: [
          {
            dimension: "jobRetention",
            delta: 3,
            because:
              "Four continuous years at one employer, ended by closure rather than dismissal. Reliable attendance attested.",
            verified: true,
          },
          {
            dimension: "verification",
            delta: 2,
            because:
              "Self-reported a conflict that reflects badly on him rather than presenting a clean record.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "Without this course, what does the next year look like?",
        answer:
          "Casual labour on building sites when there is work. There was no work for six weeks after Christmas. I have a wife and my mother in the house.",
        evidence: [
          {
            dimension: "marginalImpact",
            delta: 4,
            because:
              "Only alternative is intermittent casual site labour with documented six-week gaps; no route to a certified trade.",
            verified: true,
          },
          {
            dimension: "employmentNeed",
            delta: 4,
            because: "Sole earner for a three-person household, currently on irregular casual work.",
            verified: true,
          },
          {
            dimension: "cannotSelfPlace",
            delta: 4,
            because:
              "Two prior rejections evidence that he cannot get through a competitive selection unaided; a guarantee is the binding constraint for him specifically.",
            verified: true,
          },
        ],
      },
    ],
  },

  {
    id: "efua",
    name: "Auntie Efua Danso",
    age: 63,
    oneLiner: "Retired teacher. Wants the skill purely to teach it onward, free.",
    opening:
      "I taught science at the JHS for thirty-one years. I do not need a job. I want to learn this so I can teach it to the girls in my area, because none of them are doing it.",
    turns: [
      {
        probe:
          "Teaching it onward is a real claim but it's also the easiest thing in the world to say. Where would you teach, to whom, starting when — and what have you already set up?",
        answer:
          "The Methodist church hall on Saturday mornings. I already run a maths club there for JHS girls — fourteen of them, going on two years. I would add solar as a second Saturday session. The hall is free because I taught the caretaker's children.",
        evidence: [
          {
            dimension: "multiplier",
            delta: 5,
            because:
              "An existing two-year-old Saturday club with 14 named regular attendees and a free venue. The teaching channel exists today; the skill is the only missing input.",
            verified: true,
          },
          {
            dimension: "verification",
            delta: 3,
            because: "Named venue, cadence, headcount and duration — all checkable locally.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "This course involves roof work, ladders and live DC. At sixty-three, can you physically do the practical assessments — and if not, does a teaching-only seat still make sense?",
        answer:
          "I can climb but I would not be quick. I told your officer already that if there is a part I cannot do I will still sit the theory and the wiring bench. I am not going to be an installer. I am going to be the person who makes twenty girls want to be installers.",
        evidence: [
          {
            dimension: "completion",
            delta: -1.5,
            because:
              "Likely to be unable to complete the roof-work component of the practical assessment.",
            verified: true,
          },
          {
            dimension: "completion",
            delta: 2,
            because:
              "Thirty-one years of completing academic terms; bench and theory components are squarely within her capability.",
            verified: true,
          },
          {
            dimension: "employmentNeed",
            delta: -5,
            because: "On a teacher's pension and explicitly does not want employment.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "Someone will say a seat on an employment programme should go to someone who needs employment. What's your answer to that?",
        answer:
          "That one seat given to me is fourteen girls a year who see a woman doing it. Give the job to the man who needs the job. Give me the knowledge and I will multiply it for you for free until I die.",
        evidence: [
          {
            dimension: "marginalImpact",
            delta: 2,
            because:
              "No other route for her to acquire this skill locally; and no other applicant offers an existing all-female teaching pipeline.",
            verified: true,
          },
          {
            dimension: "cannotSelfPlace",
            delta: -5,
            because: "Declines placement outright. Should not be considered for a guaranteed slot.",
            verified: true,
          },
        ],
      },
    ],
  },

  {
    id: "kojo",
    name: "Kojo Antwi",
    age: 26,
    oneLiner: "Claims prior informal experience. Cannot describe how he learned it.",
    opening:
      "I already know solar small small. I have done installations before with some people. So for me it will be easy.",
    turns: [
      {
        probe:
          "Good — then this should be quick. Last install you worked on: how many panels, what size inverter, and what did you do with the earthing?",
        answer:
          "It was a house. Maybe some panels on top, like four or five. The inverter was a big one, the blue one. Earthing, the man did that part.",
        evidence: [
          {
            dimension: "verification",
            delta: -3,
            because:
              "Could not state panel count, inverter rating or earthing method. Identified equipment by colour. Answers are consistent with having been present, not with having installed.",
            verified: true,
          },
        ],
        flags: [
          {
            kind: "UNVERIFIED_CLAIM",
            note: "'Done installations before' — probed twice, no specifics produced. Claim not accepted.",
          },
        ],
      },
      {
        probe:
          "I'm not trying to catch you out — carrying panels on a site is real experience too, it's just different from installing. Which was it, honestly?",
        answer:
          "...I carried and I passed tools. I watched them. I was there maybe three times. I said installations because I thought if I say I am learning from zero you will not take me.",
        evidence: [
          {
            dimension: "verification",
            delta: 1.5,
            because:
              "Corrected the overstatement when given an honest exit. Retracted rather than doubling down.",
            verified: true,
          },
          {
            dimension: "completion",
            delta: 0.5,
            because:
              "Three days of site exposure is genuine familiarity with the work environment, though not technical skill.",
            verified: true,
          },
        ],
        flags: [
          {
            kind: "CONTRADICTION",
            note: "Opening claim of prior installations retracted under probing. Retraction was voluntary and prompt.",
          },
        ],
      },
      {
        probe:
          "Set the solar aside. What's the longest you've stuck at anything difficult, and what did you have to give up to do it?",
        answer:
          "I don't really know. I do phone repairs sometimes. I learned that from watching. Maybe one year but not every day. When there is no customer I do other things.",
        evidence: [
          {
            dimension: "completion",
            delta: -2,
            because:
              "No demonstrated sustained commitment to structured learning; intermittent self-directed work only.",
            verified: true,
          },
          {
            dimension: "marginalImpact",
            delta: 2,
            because:
              "Genuinely has no trade and no path to one — the need is real even though the claimed experience was not.",
            verified: true,
          },
        ],
      },
    ],
  },

  {
    id: "nana",
    name: "Nana Agyeman",
    age: 24,
    oneLiner: "Nephew of a local business owner. Arrived with a recommendation.",
    opening:
      "My uncle spoke to the assemblyman about me. He said you would already know my name. I am serious about solar.",
    turns: [
      {
        probe:
          "I've removed the recommendation from your file — it tells me about your uncle, not about you, and it would be equally unfair to hold it against you. So: why solar, in your own words?",
        answer:
          "It is the future. Everybody is saying solar is where Ghana is going. There is money in it.",
        evidence: [
          {
            dimension: "verification",
            delta: -2,
            because:
              "Generic market sentiment with no personal specifics. Nothing here is checkable or particular to him.",
            verified: true,
          },
        ],
        flags: [
          {
            kind: "INFLUENCE_PRESSURE",
            note: "Third-party endorsement via an assemblyman. Struck from the record — scored neither up nor down. Remaining evidence assessed on its own.",
          },
        ],
      },
      {
        probe:
          "What have you done in the last six months that shows me that, rather than tells me? Anything — a video course, a book, asking to shadow someone.",
        answer:
          "I have been busy at my uncle's shop. But once I am in the programme I will focus fully.",
        evidence: [
          {
            dimension: "verification",
            delta: -2,
            because: "No preparatory action of any kind in six months of stated interest.",
            verified: true,
          },
          {
            dimension: "completion",
            delta: -2,
            because:
              "Commitment is entirely prospective; no behavioural evidence of follow-through offered.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "You work at your uncle's shop now. If you don't get this seat, are you out of work?",
        answer:
          "No, I would keep working there. He would keep me. But I don't want to be in the shop forever.",
        evidence: [
          {
            dimension: "marginalImpact",
            delta: -3,
            because:
              "Currently employed with secure family employment continuing regardless of this decision.",
            verified: true,
          },
          {
            dimension: "employmentNeed",
            delta: -4,
            because: "In stable work; no income emergency.",
            verified: true,
          },
          {
            dimension: "cannotSelfPlace",
            delta: -4,
            because:
              "Family business connections in the local trade network make him among the easiest applicants to place unaided.",
            verified: true,
          },
        ],
      },
    ],
  },

  {
    id: "akosua",
    name: "Akosua Frimpong",
    age: 24,
    oneLiner: "Delivery rider. No dramatic story. Already bought her own tools.",
    opening:
      "I ride for a delivery company. I applied because I want a trade that does not depend on my knees and a motorbike.",
    turns: [
      {
        probe:
          "What have you already done towards this, before anyone offered you a place?",
        answer:
          "I bought a crimper set and a multimeter in March, 340 cedis, from Adum. I have the receipt. I have been practising terminations on scrap cable. I also finished the free Coursera solar basics course, but I could not pay for the certificate.",
        evidence: [
          {
            dimension: "verification",
            delta: 5,
            because:
              "Dated receipt for her own tools, a named vendor, and a completed free course — all pre-dating any offer of a place. Costly action taken before any reward existed.",
            verified: true,
          },
          {
            dimension: "completion",
            delta: 4,
            because:
              "Already self-taught the theory module and practised the manual skill unsupervised.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "Delivery riding pays daily. This course pays nothing for fourteen weeks. How do you eat?",
        answer:
          "I ride Saturdays and Sundays. It is about 60 percent of my income and it does not clash with the course. I worked it out before I applied. I have also saved 900 cedis for the gap.",
        evidence: [
          {
            dimension: "completion",
            delta: 4,
            because:
              "Non-conflicting weekend income plus GHS 900 saved specifically to cover the training period. Financial dropout risk is the lowest in the cohort.",
            verified: true,
          },
          {
            dimension: "jobRetention",
            delta: 4,
            because:
              "Two years of held shift work with her own transport; demonstrably keeps a job and gets to it.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "Why do you need us at all? You've taught yourself the basics and bought tools — go and get hired.",
        answer:
          "I tried. Four companies. They all want the certificate or someone to vouch. One man told me plainly they do not put women on roofs. I can learn from YouTube but I cannot give myself a certificate or a reference.",
        evidence: [
          {
            dimension: "cannotSelfPlace",
            delta: 5,
            because:
              "Four documented rejections despite demonstrable skill; blocked specifically by certification and gendered hiring, which is exactly what a guaranteed placement overcomes.",
            verified: true,
          },
          {
            dimension: "marginalImpact",
            delta: 3,
            because:
              "The credential is the sole binding constraint — she has already supplied the effort and the tools herself.",
            verified: true,
          },
          {
            dimension: "employmentNeed",
            delta: 3,
            because: "Supports herself on physically unsustainable piece-rate work with no progression.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "Would you train others afterwards, or is this just for you?",
        answer:
          "I would take an apprentice. The man who said women don't go on roofs — I would like to send him one every year.",
        evidence: [
          {
            dimension: "multiplier",
            delta: 2,
            because: "Willing to take apprentices; concrete intent though not yet an established channel.",
            verified: false,
          },
        ],
      },
    ],
  },

  {
    id: "ibrahim",
    name: "Ibrahim Sulemana",
    age: 31,
    oneLiner: "Certified electrician already. Would be job-ready fastest.",
    opening:
      "I hold an NVTI Grade 2 electrical certificate. I have wired maybe sixty houses. Solar is the part I do not have.",
    turns: [
      {
        probe:
          "With a Grade 2 and sixty houses, what stops you adding solar on your own — the manufacturers run free installer trainings.",
        answer:
          "They run them in Accra. It is transport and three nights lodging. But yes, I could do it. I have been meaning to.",
        evidence: [
          {
            dimension: "marginalImpact",
            delta: -4,
            because:
              "A free manufacturer training route exists and he confirms he could take it; the barrier is transport cost, not access.",
            verified: true,
          },
          {
            dimension: "completion",
            delta: 4,
            because: "Existing electrical certification makes course completion near-certain.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "If I gave you one of the two guaranteed placements, what would that be worth to you compared to what you earn now?",
        answer:
          "Honestly, I earn well enough. I do contracts. The placement would probably pay less than I make. I want the knowledge more than the job.",
        evidence: [
          {
            dimension: "employmentNeed",
            delta: -4,
            because: "Earning above the placement wage on existing contract work.",
            verified: true,
          },
          {
            dimension: "cannotSelfPlace",
            delta: -5,
            because:
              "Certified and experienced; the most employable person in the cohort without any help from this program.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "You've said you 'could' do the manufacturer course and have been 'meaning to' for how long?",
        answer:
          "Maybe two years. Every time there is a contract and I postpone it.",
        evidence: [
          {
            dimension: "marginalImpact",
            delta: 1,
            because:
              "Two years of non-action suggests the alternative route is theoretically open but practically not being taken.",
            verified: true,
          },
          {
            dimension: "multiplier",
            delta: 2,
            because:
              "Runs contracts and takes labourers; would likely spread solar work through an existing crew.",
            verified: false,
          },
        ],
      },
    ],
  },

  {
    id: "comfort",
    name: "Comfort Asante",
    age: 19,
    oneLiner: "No experience. Lives 40km out with unreliable transport.",
    opening:
      "I want to learn something. My friend said this one is good. I finished JHS.",
    turns: [
      {
        probe:
          "You're in Ejisu — that's about 40km. How would you physically get here by 9am, five days a week, for fourteen weeks?",
        answer:
          "Trotro. It takes maybe two hours if it is not full. Sometimes there is no trotro in the morning and you wait.",
        evidence: [
          {
            dimension: "completion",
            delta: -4,
            because:
              "Four hours of unreliable daily commuting with no fallback; attendance failure is close to certain over 14 weeks.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "Is there anywhere you could stay in town during the week — family, a friend?",
        answer:
          "No. My aunt is in Kumasi but there is no room, she has said before.",
        evidence: [
          {
            dimension: "completion",
            delta: -2,
            because: "No accommodation option in town; the commute cannot be avoided.",
            verified: true,
          },
        ],
      },
      {
        probe:
          "What is it about solar specifically that you want, as opposed to any other course?",
        answer:
          "I don't know it well. I just want to learn a work. Anything that will give me money.",
        evidence: [
          {
            dimension: "verification",
            delta: -2,
            because: "No specific interest in this trade; interchangeable with any other training.",
            verified: true,
          },
          {
            dimension: "marginalImpact",
            delta: 3,
            because: "Genuinely has no skills, no work and no alternative route. The underlying need is high.",
            verified: true,
          },
          {
            dimension: "employmentNeed",
            delta: 3,
            because: "Unemployed with no income at all.",
            verified: true,
          },
        ],
      },
    ],
  },
];

export const REVEAL_APPLICANT = "ama";

/** The file each applicant arrives with. The interviewer tests new answers against it. */
export const DOSSIERS: Record<string, string[]> = {
  ama: [
    "Application states: single mother, no partner in the household.",
    "Two children, aged 6 and 3.",
    "Sole earner. Sells sachet water, irregular income.",
    "Named her sister, in the same compound, as her only childcare.",
  ],
  kwabena: [
    "17. Completed SHS this year. No dependants, lives with his mother.",
    "Claims As in physics and elective maths — no transcript submitted.",
    "Claims to have built charge controllers from scrap.",
  ],
  yaw: [
    "34. Wife and mother in the household; sole earner.",
    "Rejected by NVTI and by a welding intake in the last two years.",
    "Last formal job: Kwame's block factory, closed 2024. Now casual site labour.",
  ],
  efua: [
    "63. Retired JHS science teacher, 31 years, on a pension.",
    "Explicitly does not want employment.",
    "Claims she will teach the skill onward for free.",
  ],
  kojo: [
    "26. Opened by claiming prior solar installation experience.",
    "No employer, site or date given for that work.",
    "Mentions intermittent phone repair work.",
  ],
  nana: [
    "24. Nephew of a local business owner. Currently works at his uncle's shop.",
    "Arrived with a recommendation via an assemblyman — STRUCK FROM THE RECORD, score neither for nor against.",
  ],
  akosua: [
    "24. Delivery rider, two years with the same company.",
    "Bought her own crimper set and multimeter in March; has the receipt.",
    "Completed a free online solar basics course, uncertified. Turned down by four installers.",
  ],
  ibrahim: [
    "31. Holds an NVTI Grade 2 electrical certificate. Claims ~60 houses wired.",
    "Currently earning on contract work.",
  ],
  comfort: [
    "19. Completed JHS. No work history.",
    "Lives in Ejisu, ~40km away. No accommodation available in town.",
  ],
};
