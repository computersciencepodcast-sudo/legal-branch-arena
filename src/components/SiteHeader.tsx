import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, Globe2 } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { toast } from "sonner";

export function SiteHeader() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [country, setCountry] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);
      if (data.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("country")
          .eq("id", data.user.id)
          .maybeSingle();
        setCountry(prof?.country ?? "");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
      if (!session) setCountry("");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  const onCountryChange = async (value: string) => {
    if (!userId) return;
    const prev = country;
    setCountry(value);
    const { error } = await supabase
      .from("profiles")
      .update({ country: value })
      .eq("id", userId);
    if (error) {
      setCountry(prev);
      toast.error("Could not save country");
    } else {
      toast.success(`Country set to ${value}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-md grid place-items-center text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
            <Scale className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg font-semibold">Legal Scenario Simulator</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Reasoning Simulator</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          {email ? (
            <>
              <div className="hidden sm:flex items-center">
                <Select value={country || undefined} onValueChange={onCountryChange}>
                  <SelectTrigger className="w-[180px] h-9">
                    <div className="flex items-center gap-2 text-sm">
                      <Globe2 className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select country" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
