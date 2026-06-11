import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trophy, TrendingUp, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Legal Scenario Arena" }] }),
  component: Dashboard,
});

type Row = {
  id: string; title: string | null; topic: string; difficulty: string;
  status: string; final_score: number | null; created_at: string;
};

function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("scenarios").select("id,title,topic,difficulty,status,final_score,created_at")
        .order("created_at", { ascending: false });
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const completed = rows.filter((r) => r.status === "completed");
  const avg = completed.length
    ? (completed.reduce((s, r) => s + (r.final_score ?? 0), 0) / completed.length).toFixed(1)
    : "—";

  const topicCounts = new Map<string, { sum: number; n: number }>();
  completed.forEach((r) => {
    const v = topicCounts.get(r.topic) ?? { sum: 0, n: 0 };
    v.sum += r.final_score ?? 0; v.n += 1;
    topicCounts.set(r.topic, v);
  });
  const topics = [...topicCounts.entries()].map(([t, v]) => ({ topic: t, avg: v.sum / v.n }));
  const best = topics.sort((a, b) => b.avg - a.avg)[0];
  const weakest = [...topics].sort((a, b) => a.avg - b.avg)[0];
  const highestDiff = (() => {
    const order = ["Beginner", "Intermediate", "Advanced", "Expert"];
    const idx = completed.reduce((m, r) => Math.max(m, order.indexOf(r.difficulty)), -1);
    return idx >= 0 ? order[idx] : "—";
  })();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Your performance</p>
            <h1 className="font-serif text-4xl text-primary mt-1">Dashboard</h1>
          </div>
          <Link to="/simulator"><Button>Start new scenario</Button></Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <Stat icon={Trophy} label="Avg score" value={`${avg} / 5`} />
          <Stat icon={BookOpen} label="Completed" value={String(completed.length)} />
          <Stat icon={TrendingUp} label="Highest difficulty" value={highestDiff} />
          <Stat icon={Star} label="Best topic" value={best ? best.topic : "—"} />
        </div>

        <Card className="mt-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-primary">Recent cases</h2>
            <span className="text-sm text-muted-foreground">{rows.length} total</span>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No scenarios yet. Run your first case.</p>
              <Link to="/simulator" className="inline-block mt-3"><Button>Start a scenario</Button></Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.title ?? "Untitled case"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.topic} · {r.difficulty} · {new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    {r.status === "completed" ? (
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${s <= (r.final_score ?? 0) ? "fill-gold text-gold" : "text-border"}`} />
                        ))}
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">In progress</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {weakest && best && weakest.topic !== best.topic && (
          <div className="mt-6 p-4 rounded-xl border border-border bg-card text-sm">
            <span className="text-muted-foreground">Suggestion:</span> Try a fresh <span className="font-medium">{weakest.topic}</span> case to lift your weakest area.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg grid place-items-center bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="font-serif text-xl text-primary mt-0.5">{value}</div>
        </div>
      </div>
    </Card>
  );
}
