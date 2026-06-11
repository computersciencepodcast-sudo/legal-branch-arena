import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

const SetupSchema = z.object({
  topic: z.string().min(1),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]),
  jurisdiction: z.string().min(1),
  scenarioType: z.string().min(1),
});

const PlayInput = z.object({
  scenarioId: z.string().uuid().nullable(),
  setup: SetupSchema.nullable(),
  choiceIndex: z.number().int().min(0).max(3).nullable(),
  choiceText: z.string().nullable(),
});

type Turn = {
  narrative: string;
  role: string;
  objective: string;
  choices: string[];
  risk: number;
  reasoning: number;
  userChoiceIndex?: number;
  userChoiceText?: string;
  consequence?: string;
};

type FinalDebrief = {
  summary: string;
  strongest: string[];
  weakest: string[];
  improvements: string[];
  finalScore: number;
};

function buildSystemPrompt(setup: z.infer<typeof SetupSchema>, turnNumber: number, totalTurns: number) {
  return `You are the engine of "Legal Scenario Arena", an interactive legal reasoning simulator.

PARAMETERS:
- Topic: ${setup.topic}
- Difficulty: ${setup.difficulty}
- Jurisdiction / setting: ${setup.jurisdiction}
- Scenario style: ${setup.scenarioType}
- Current turn: ${turnNumber} of approximately ${totalTurns}

RULES:
- Generate ORIGINAL fictional legal scenarios. Never give real-world legal advice.
- Adapt narrative complexity, vocabulary, and subtlety to difficulty.
- Each turn must offer EXACTLY 4 distinct, plausible next moves with real tradeoffs.
- Ideally one safer, one aggressive, one strategic, one risky — but never label them.
- The choices must NOT be obviously correct. Hidden consequences are encouraged at higher difficulties.
- Maintain narrative coherence across turns and react to the user's prior choice.
- "risk" = 0-100 estimate of current case risk. "reasoning" = 0-100 quality of user's reasoning so far.
- After 4-7 turns OR when the case naturally resolves, end the scenario with isFinal=true and a debrief.
- Tone: intelligent, professional, concise. Avoid disclaimers and meta-commentary.

OUTPUT FORMAT: Respond with STRICT JSON only — no prose, no markdown fences. Shape:
{
  "title": "short case title (only on turn 1, else omit)",
  "narrative": "the situation right now, 2-4 sentences",
  "role": "the user's role in this case",
  "objective": "the user's current objective, 1 sentence",
  "consequence": "what happened because of the user's last choice (omit on turn 1)",
  "choices": ["choice A", "choice B", "choice C", "choice D"],
  "risk": 0-100,
  "reasoning": 0-100,
  "isFinal": false,
  "debrief": null
}

If isFinal=true, omit "choices" (or use []) and instead set debrief:
{
  "summary": "what ultimately happened, 2-3 sentences",
  "strongest": ["...", "..."],
  "weakest": ["...", "..."],
  "improvements": ["...", "..."],
  "finalScore": 1-5
}`;
}

function buildHistoryMessages(turns: Turn[]) {
  const msgs: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const t of turns) {
    msgs.push({
      role: "assistant",
      content: JSON.stringify({
        narrative: t.narrative, role: t.role, objective: t.objective,
        choices: t.choices, risk: t.risk, reasoning: t.reasoning,
      }),
    });
    if (typeof t.userChoiceIndex === "number") {
      msgs.push({
        role: "user",
        content: `I choose option ${["A","B","C","D"][t.userChoiceIndex]}: "${t.userChoiceText ?? t.choices[t.userChoiceIndex]}". Continue the scenario.`,
      });
    }
  }
  return msgs;
}

async function callGroq(messages: any[]): Promise<any> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY missing");
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.85,
      max_tokens: 900,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(content); }
  catch { throw new Error("Groq returned invalid JSON"); }
}

export const playTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlayInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let scenarioId = data.scenarioId;
    let setup: z.infer<typeof SetupSchema>;
    let turns: Turn[] = [];
    let title: string | null = null;

    if (!scenarioId) {
      if (!data.setup) throw new Error("setup required for new scenario");
      setup = data.setup;
      const { data: inserted, error } = await supabase
        .from("scenarios")
        .insert({
          user_id: userId,
          topic: setup.topic,
          difficulty: setup.difficulty,
          jurisdiction: setup.jurisdiction,
          scenario_type: setup.scenarioType,
          status: "in_progress",
          turns: [],
        })
        .select("id")
        .single();
      if (error) throw error;
      scenarioId = inserted.id;
    } else {
      const { data: row, error } = await supabase
        .from("scenarios").select("*").eq("id", scenarioId).single();
      if (error) throw error;
      if (row.status !== "in_progress") throw new Error("Scenario already finished");
      setup = {
        topic: row.topic, difficulty: row.difficulty as any,
        jurisdiction: row.jurisdiction ?? "General", scenarioType: row.scenario_type ?? "General",
      };
      turns = (row.turns as Turn[]) ?? [];
      title = row.title ?? null;

      if (data.choiceIndex === null) throw new Error("choiceIndex required");
      const lastIdx = turns.length - 1;
      if (lastIdx < 0) throw new Error("No previous turn");
      turns[lastIdx] = {
        ...turns[lastIdx],
        userChoiceIndex: data.choiceIndex,
        userChoiceText: data.choiceText ?? turns[lastIdx].choices[data.choiceIndex],
      };
    }

    const totalTurns = setup.difficulty === "Beginner" ? 4 : setup.difficulty === "Intermediate" ? 5 : setup.difficulty === "Advanced" ? 6 : 7;
    const turnNumber = turns.length + 1;

    const messages = [
      { role: "system" as const, content: buildSystemPrompt(setup, turnNumber, totalTurns) },
      ...buildHistoryMessages(turns),
      { role: "user" as const, content: turns.length === 0
        ? `Begin a brand new ${setup.scenarioType.toLowerCase()} scenario in ${setup.topic}. Set the scene and give me my first 4 moves.`
        : `Continue the case.` },
    ];

    const ai = await callGroq(messages);

    const isFinal = !!ai.isFinal || turnNumber >= totalTurns;
    const debrief: FinalDebrief | null = ai.debrief && isFinal ? {
      summary: String(ai.debrief.summary ?? ""),
      strongest: Array.isArray(ai.debrief.strongest) ? ai.debrief.strongest.map(String) : [],
      weakest: Array.isArray(ai.debrief.weakest) ? ai.debrief.weakest.map(String) : [],
      improvements: Array.isArray(ai.debrief.improvements) ? ai.debrief.improvements.map(String) : [],
      finalScore: Math.max(1, Math.min(5, Number(ai.debrief.finalScore ?? 3))),
    } : null;

    const newTurn: Turn = {
      narrative: String(ai.narrative ?? ""),
      role: String(ai.role ?? "Attorney"),
      objective: String(ai.objective ?? ""),
      choices: Array.isArray(ai.choices) ? ai.choices.slice(0, 4).map(String) : [],
      risk: Math.max(0, Math.min(100, Number(ai.risk ?? 50))),
      reasoning: Math.max(0, Math.min(100, Number(ai.reasoning ?? 50))),
      consequence: ai.consequence ? String(ai.consequence) : undefined,
    };

    // Pad if AI returned fewer than 4 choices (only when not final)
    if (!isFinal && newTurn.choices.length < 4) {
      while (newTurn.choices.length < 4) newTurn.choices.push("Take no action and observe.");
    }

    turns.push(newTurn);
    if (ai.title && !title) title = String(ai.title);

    const update: any = { turns, title };
    if (isFinal && debrief) {
      update.status = "completed";
      update.final_score = debrief.finalScore;
      update.debrief = debrief;
    }
    const { error: upErr } = await supabase.from("scenarios").update(update).eq("id", scenarioId);
    if (upErr) throw upErr;

    return {
      scenarioId,
      title,
      turn: newTurn,
      turnNumber,
      totalTurns,
      isFinal,
      debrief,
    };
  });
