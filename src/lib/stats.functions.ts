import { createServerFn } from "@tanstack/react-start";

export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact", head: true });
  const { data: countryRows } = await supabaseAdmin
    .from("profiles")
    .select("country")
    .not("country", "is", null);
  const unique = new Set((countryRows ?? []).map((r: any) => r.country).filter(Boolean));
  return { totalUsers: count ?? 0, totalCountries: unique.size };
});
