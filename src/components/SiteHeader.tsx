import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Scale } from "lucide-react";

export function SiteHeader() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-md grid place-items-center text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
            <Scale className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg font-semibold">Legal Scenario Arena</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Reasoning Simulator</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          {email ? (
            <>
              <Link to="/dashboard" className="hidden sm:inline-block px-3 py-2 text-sm rounded-md hover:bg-secondary transition">Dashboard</Link>
              <Link to="/simulator">
                <Button size="sm" variant="default">New Scenario</Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
            </>
          ) : (
            <>
              <Link to="/auth"><Button size="sm" variant="ghost">Sign in</Button></Link>
              <Link to="/auth"><Button size="sm">Get started</Button></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
