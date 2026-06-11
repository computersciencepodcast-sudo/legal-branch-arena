import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { Scale, Gavel, Brain, Shield, Sparkles, ArrowRight, Users, Globe2 } from "lucide-react";
import { getPublicStats } from "@/lib/stats.functions";

const statsQuery = queryOptions({
  queryKey: ["public-stats"],
  queryFn: () => getPublicStats(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Legal Scenario Arena — AI-Powered Legal Reasoning Simulator" },
      { name: "description", content: "Sharpen your legal judgment with branching AI scenarios. Make one decision from four, watch consequences unfold, and learn under pressure." },
      { property: "og:title", content: "Legal Scenario Arena" },
      { property: "og:description", content: "Interactive AI legal reasoning simulator. Branching scenarios, four-choice decisions, real consequences." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQuery),
  component: Landing,
});

function Landing() {
  const { data: stats } = useSuspenseQuery(statsQuery);
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              Interactive Legal Reasoning Engine
            </div>
            <h1 className="mt-6 text-5xl md:text-6xl font-semibold leading-[1.05] text-primary">
              Train your legal judgment, <span className="italic" style={{ color: "var(--color-accent)" }}>one decision</span> at a time.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Legal Scenario Arena drops you into adaptive, AI-generated cases. Read the situation, weigh four moves, and watch the story branch on every choice. Built for students, debaters, and aspiring lawyers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg" className="gap-2">Start a Scenario <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <a href="#how">
                <Button size="lg" variant="outline">How it works</Button>
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
              <div><span className="font-semibold text-foreground">11</span> topic areas</div>
              <div><span className="font-semibold text-foreground">4</span> difficulty levels</div>
              <div><span className="font-semibold text-foreground">∞</span> unique cases</div>
            </div>
          </div>

          {/* Mock card preview */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl" style={{ background: "var(--gradient-hero)" }} />
              <div className="relative bg-card rounded-2xl border border-border p-6 shadow-[var(--shadow-elegant)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-1 rounded bg-primary text-primary-foreground font-medium">Turn 3 / ~6</span>
                  <span className="text-muted-foreground">Constitutional Law · Advanced</span>
                </div>
                <h3 className="font-serif text-xl mt-4 leading-snug">
                  Your client, a campus journalist, has been suspended after publishing a leaked memo. Administration cites a "disruption" policy.
                </h3>
                <p className="text-sm text-muted-foreground mt-3">
                  <span className="font-medium text-foreground">Your role:</span> First-chair attorney · <span className="font-medium text-foreground">Objective:</span> Restore the student's enrollment.
                </p>
                <div className="grid gap-2 mt-5">
                  {[
                    ["A", "File for a TRO citing prior restraint."],
                    ["B", "Request an internal appeal and negotiate."],
                    ["C", "Go public — coordinate press coverage."],
                    ["D", "Demand the policy text and challenge its vagueness."],
                  ].map(([k, t]) => (
                    <div key={k} className="flex gap-3 items-start p-3 rounded-lg border border-border bg-background/60">
                      <div className="h-6 w-6 rounded grid place-items-center text-xs font-semibold bg-secondary text-secondary-foreground">{k}</div>
                      <p className="text-sm">{t}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <Meter label="Risk" value={62} tone="warn" />
                  <Meter label="Reasoning" value={84} tone="good" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-y border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">The simulation loop</p>
            <h2 className="font-serif text-3xl md:text-4xl mt-2 text-primary">A simulator, not a chatbot.</h2>
            <p className="text-muted-foreground mt-3">
              Each session is a coherent case built from your topic and difficulty. The AI tracks your style, ramps the pressure, and judges your reasoning at the end.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-5 mt-12">
            {[
              { icon: Gavel, title: "Random scenario", body: "A fresh case with setting, role, conflict, and time pressure." },
              { icon: Brain, title: "Four moves", body: "Always exactly four distinct decisions — each with tradeoffs." },
              { icon: ArrowRight, title: "Branch & adapt", body: "The story shifts. The AI adjusts difficulty to your style." },
              { icon: Shield, title: "Debrief", body: "Final score, strongest moves, weakest moves, and how to improve." },
            ].map((s, i) => (
              <div key={i} className="p-5 rounded-xl bg-card border border-border shadow-[var(--shadow-card)]">
                <div className="h-10 w-10 rounded-lg grid place-items-center bg-secondary text-primary mb-3">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOPICS */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Practice across</p>
        <h2 className="font-serif text-3xl md:text-4xl mt-2 text-primary">Eleven legal domains, infinite scenarios.</h2>
        <div className="flex flex-wrap gap-2 mt-8">
          {[
            "Criminal Law", "Civil Disputes", "Constitutional Law", "Contract Problems",
            "School Policy", "Employment", "Free Speech & Media", "Privacy & Data",
            "Intellectual Property", "Consumer Disputes", "Ethics Gray-Areas",
          ].map((t) => (
            <span key={t} className="px-3 py-2 rounded-full bg-card border border-border text-sm">{t}</span>
          ))}
        </div>

        <div className="mt-16 p-10 rounded-2xl border border-border text-center" style={{ background: "var(--gradient-hero)" }}>
          <Scale className="h-10 w-10 text-primary-foreground/90 mx-auto" />
          <h3 className="font-serif text-3xl text-primary-foreground mt-3">Ready to take the bench?</h3>
          <p className="text-primary-foreground/80 mt-2">Create a free account and run your first case in under a minute.</p>
          <Link to="/auth"><Button size="lg" variant="secondary" className="mt-6 gap-2">Start a Scenario <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 text-sm text-muted-foreground flex flex-wrap justify-between gap-3">
          <span>© {new Date().getFullYear()} Legal Scenario Arena</span>
          <span>Educational simulator — not legal advice.</span>
        </div>
      </footer>
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: "warn" | "good" }) {
  const color = tone === "warn" ? "var(--gold)" : "var(--success)";
  return (
    <div>
      <div className="flex justify-between text-muted-foreground mb-1"><span>{label}</span><span>{value}%</span></div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}
