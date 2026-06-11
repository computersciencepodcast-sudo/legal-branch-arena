import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { playTurn, askCoach } from "@/lib/scenario.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Scale, RefreshCw, Send, Lightbulb, MessageCircle, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/simulator")({
  head: () => ({ meta: [{ title: "Simulator — Legal Scenario Arena" }] }),
  component: SimulatorPage,
});

const TOPICS = [
  "Criminal Law", "Civil Disputes", "Constitutional Law", "Contract Problems",
  "School Policy", "Employment", "Free Speech & Media", "Privacy & Data",
  "Intellectual Property", "Consumer Disputes", "Ethics Gray-Areas",
];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
const JURISDICTIONS = ["United States — Federal", "United States — State", "United Kingdom", "European Union", "International", "Fictional / Generic"];
const TYPES = ["Trial strategy", "Negotiation", "Investigation", "Policy challenge", "Ethics dilemma", "Crisis response"];

type Turn = {
  narrative: string; role: string; objective: string;
  choices: string[]; risk: number; reasoning: number;
  consequence?: string;
};
type Debrief = { summary: string; strongest: string[]; weakest: string[]; improvements: string[]; finalScore: number };

function SimulatorPage() {
  const navigate = useNavigate();
  const play = useServerFn(playTurn);

  const [stage, setStage] = useState<"setup" | "playing" | "done">("setup");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>("Intermediate");
  const [jurisdiction, setJurisdiction] = useState(JURISDICTIONS[0]);
  const [scenarioType, setScenarioType] = useState(TYPES[0]);

  const [loading, setLoading] = useState(false);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [turnNumber, setTurnNumber] = useState(0);
  const [totalTurns, setTotalTurns] = useState(0);
  const [debrief, setDebrief] = useState<Debrief | null>(null);

  const start = async () => {
    setLoading(true);
    try {
      const res = await play({ data: {
        scenarioId: null,
        setup: {
          topic: topic.trim(),
          difficulty,
          jurisdiction: jurisdiction.trim(),
          scenarioType: scenarioType.trim(),
        },
        choiceIndex: null, choiceText: null,
      }});
      setScenarioId(res.scenarioId);
      setTitle(res.title);
      setTurn(res.turn);
      setTurnNumber(res.turnNumber);
      setTotalTurns(res.totalTurns);
      setStage("playing");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start scenario");
    } finally { setLoading(false); }
  };

  const choose = async (i: number) => {
    if (!turn || !scenarioId) return;
    setLoading(true);
    try {
      const res = await play({ data: {
        scenarioId, setup: null,
        choiceIndex: i, choiceText: turn.choices[i],
      }});
      setTurn(res.turn);
      setTurnNumber(res.turnNumber);
      setTotalTurns(res.totalTurns);
      if (res.isFinal && res.debrief) {
        setDebrief(res.debrief);
        setStage("done");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Turn failed");
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStage("setup"); setScenarioId(null); setTurn(null); setDebrief(null); setTitle(null);
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="max-w-4xl mx-auto px-6 py-10">
        {stage === "setup" && (
          <Setup
            topic={topic} setTopic={setTopic}
            difficulty={difficulty} setDifficulty={setDifficulty}
            jurisdiction={jurisdiction} setJurisdiction={setJurisdiction}
            scenarioType={scenarioType} setScenarioType={setScenarioType}
            loading={loading} onStart={start}
          />
        )}

        {stage === "playing" && turn && (
          <Play title={title} turn={turn} turnNumber={turnNumber} totalTurns={totalTurns}
            loading={loading} onChoose={choose} difficulty={difficulty} topic={topic} />
        )}

        {stage === "done" && debrief && (
          <DebriefView debrief={debrief} title={title} onReset={reset} onDashboard={() => navigate({ to: "/dashboard" })} />
        )}
      </div>

      {stage === "playing" && scenarioId && <Copilot scenarioId={scenarioId} />}
    </div>
  );
}

function Setup(props: any) {
  return (
    <Card className="p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-md grid place-items-center text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-2xl text-primary">Configure your scenario</h1>
          <p className="text-sm text-muted-foreground">Pick a preset or type your own. The AI takes care of the rest.</p>
        </div>
      </div>

      <Section label="Topic">
        <Chips options={TOPICS} value={props.topic} onChange={props.setTopic} />
        <CustomInput placeholder="Or type a custom topic (e.g., Maritime Law, Sports Law)…" value={props.topic} presets={TOPICS} onChange={props.setTopic} />
      </Section>

      <Section label="Difficulty">
        <Chips options={DIFFICULTIES as unknown as string[]} value={props.difficulty} onChange={props.setDifficulty} />
        <p className="text-xs text-muted-foreground mt-2">
          {props.difficulty === "Beginner" && "Clear distinctions, gentle pacing, plain language."}
          {props.difficulty === "Intermediate" && "Realistic stakes, some hidden consequences."}
          {props.difficulty === "Advanced" && "Subtle issues, faster escalation, plausible wrong moves."}
          {props.difficulty === "Expert" && "Deep ambiguity, traps, expert vocabulary, sharp tradeoffs."}
        </p>
      </Section>

      <Section label="Jurisdiction / Setting">
        <Chips options={JURISDICTIONS} value={props.jurisdiction} onChange={props.setJurisdiction} />
        <CustomInput placeholder="Or type a custom jurisdiction (e.g., Japan, Ontario, Mars Colony Charter)…" value={props.jurisdiction} presets={JURISDICTIONS} onChange={props.setJurisdiction} />
      </Section>

      <Section label="Scenario Type">
        <Chips options={TYPES} value={props.scenarioType} onChange={props.setScenarioType} />
        <CustomInput placeholder="Or type a custom scenario type (e.g., Appellate brief, Mediation)…" value={props.scenarioType} presets={TYPES} onChange={props.setScenarioType} />
      </Section>

      <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={props.onStart} disabled={props.loading || !props.topic.trim() || !props.jurisdiction.trim() || !props.scenarioType.trim()}>
        {props.loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Drafting your case…</> : "Begin Scenario"}
      </Button>
    </Card>
  );
}

function CustomInput({ placeholder, value, presets, onChange }: { placeholder: string; value: string; presets: string[]; onChange: (v: string) => void }) {
  const isCustom = !presets.includes(value);
  return (
    <Input
      className="mt-3"
      placeholder={placeholder}
      value={isCustom ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      maxLength={80}
    />
  );
}

function Section({ label, children }: any) {
  return (
    <div className="mt-6">
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      {children}
    </div>
  );
}
function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: any) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`px-3 py-2 text-sm rounded-full border transition ${value === o ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Play({ title, turn, turnNumber, totalTurns, loading, onChoose, difficulty, topic }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{topic} · {difficulty}</div>
          {title && <h2 className="font-serif text-2xl text-primary mt-1">{title}</h2>}
        </div>
        <div className="text-sm text-muted-foreground">Turn {turnNumber} / {totalTurns}</div>
      </div>

      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-6">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (turnNumber / totalTurns) * 100)}%` }} />
      </div>

      <Card className="p-6">
        {turn.consequence && (
          <div className="mb-4 p-3 rounded-lg border-l-4 border-l-gold bg-gold/5">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Consequence</div>
            <p className="text-sm">{turn.consequence}</p>
          </div>
        )}
        <p className="text-lg leading-relaxed">{turn.narrative}</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-5 text-sm">
          <div><span className="text-muted-foreground">Your role:</span> <span className="font-medium">{turn.role}</span></div>
          <div><span className="text-muted-foreground">Objective:</span> <span className="font-medium">{turn.objective}</span></div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          <Meter label="Risk" value={turn.risk} tone="warn" />
          <Meter label="Reasoning quality" value={turn.reasoning} tone="good" />
        </div>
      </Card>

      <div className="mt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Choose your next move</div>
        <div className="grid gap-3">
          {turn.choices.map((c: string, i: number) => (
            <button key={i} disabled={loading} onClick={() => onChoose(i)}
              className="group text-left p-4 rounded-xl border border-border bg-card hover:border-accent hover:shadow-[var(--shadow-card)] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <div className="flex gap-4 items-start">
                <div className="h-8 w-8 shrink-0 rounded-md grid place-items-center text-sm font-semibold bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition">
                  {["A","B","C","D"][i]}
                </div>
                <p className="text-[15px] leading-relaxed">{c}</p>
              </div>
            </button>
          ))}
        </div>
        {loading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> The case continues…
          </div>
        )}
      </div>
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: "warn" | "good" }) {
  const color = tone === "warn" ? "var(--gold)" : "var(--success)";
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{label}</span><span>{Math.round(value)}%</span></div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 8 ? "var(--success)" : score >= 5 ? "var(--gold)" : "var(--destructive)";
  return (
    <div className="inline-flex items-baseline gap-1 px-4 py-2 rounded-xl border" style={{ borderColor: tone }}>
      <span className="font-serif text-4xl" style={{ color: tone }}>{score}</span>
      <span className="text-muted-foreground text-sm">/ 10</span>
    </div>
  );
}

function DebriefView({ debrief, title, onReset, onDashboard }: { debrief: Debrief; title: string | null; onReset: () => void; onDashboard: () => void }) {
  return (
    <Card className="p-8">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">Case closed</div>
      {title && <h1 className="font-serif text-3xl text-primary mt-1">{title}</h1>}
      <div className="mt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Final Score</div>
        <ScoreBadge score={debrief.finalScore} />
      </div>

      <p className="mt-6 text-lg leading-relaxed">{debrief.summary}</p>

      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <DebriefList title="Strongest decisions" items={debrief.strongest} accent="success" />
        <DebriefList title="Weakest decisions" items={debrief.weakest} accent="destructive" />
        <DebriefList title="How to improve" items={debrief.improvements} accent="accent" />
      </div>

      <div className="flex flex-wrap gap-3 mt-8">
        <Button onClick={onReset} className="gap-2"><RefreshCw className="h-4 w-4" /> New scenario</Button>
        <Button variant="outline" onClick={onDashboard}>View dashboard</Button>
      </div>
    </Card>
  );
}
function DebriefList({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  const color = accent === "success" ? "var(--success)" : accent === "destructive" ? "var(--destructive)" : "var(--accent)";
  return (
    <div className="p-4 rounded-xl border border-border">
      <div className="text-xs uppercase tracking-widest mb-2" style={{ color }}>{title}</div>
      <ul className="space-y-2 text-sm">
        {items.length === 0 && <li className="text-muted-foreground">—</li>}
        {items.map((it, i) => (<li key={i} className="flex gap-2"><span style={{ color }}>•</span><span>{it}</span></li>))}
      </ul>
    </div>
  );
}

function Copilot({ scenarioId }: { scenarioId: string }) {
  const ask = useServerFn(askCoach);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "coach"; text: string }[]>([
    { role: "coach", text: "I am your Copilot. Ask me about legal concepts, doctrines, or what factors are worth weighing. I will NOT tell you which choice to pick, only help you think." },
  ]);

  const send = async () => {
    const q = question.trim();
    if (!q || thinking) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuestion("");
    setThinking(true);
    try {
      const { reply } = await ask({ data: { scenarioId, question: q } });
      setMessages((m) => [...m, { role: "coach", text: reply }]);
    } catch (e: any) {
      toast.error(e.message ?? "Copilot is unavailable");
    } finally {
      setThinking(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-[var(--shadow-elegant)] text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
        aria-label="Open Copilot"
      >
        <Lightbulb className="h-4 w-4" />
        <span className="text-sm font-medium">Copilot</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-6rem))] rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center gap-2 text-primary-foreground">
          <MessageCircle className="h-4 w-4" />
          <div>
            <div className="text-sm font-semibold">Copilot</div>
            <div className="text-[10px] uppercase tracking-widest opacity-80">Coaches, never answers</div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="text-primary-foreground/80 hover:text-primary-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] text-sm leading-relaxed px-3 py-2 rounded-2xl ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="border-t border-border p-3 flex items-center gap-2"
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about a concept, not the answer…"
          disabled={thinking}
        />
        <Button type="submit" size="icon" disabled={thinking || !question.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
