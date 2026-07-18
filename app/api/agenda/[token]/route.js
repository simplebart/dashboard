import { createClient } from "@supabase/supabase-js";
import { buildIcs } from "../../../../lib/ics";

export const dynamic = "force-dynamic";

/**
 * Live agendafeed: /api/agenda/<token>.ics
 * Apple Agenda haalt dit adres periodiek op, dus wijzigingen komen vanzelf mee.
 * Hiervoor is een SUPABASE_SERVICE_ROLE_KEY nodig (server-side, nooit in de browser).
 */
export async function GET(request, { params }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return new Response("Deze feed werkt pas als SUPABASE_SERVICE_ROLE_KEY is ingesteld.", { status: 501 });
  }

  const token = String(params.token || "").replace(/\.ics$/i, "");
  if (token.length < 12) return new Response("Ongeldig adres", { status: 400 });

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("dashboards")
    .select("data")
    .eq("data->>feedToken", token)
    .maybeSingle();

  if (error || !data) return new Response("Niet gevonden", { status: 404 });

  // ?soort=verplicht|vrij|klus levert een aparte agenda op, zodat Apple Agenda
  // er een eigen kleur aan kan geven.
  const LABELS = { verplicht: "Verplicht", vrij: "Vrije tijd", klus: "Huishouden" };
  const soort = new URL(request.url).searchParams.get("soort");
  const alles = data.data?.events || [];
  const events = soort && LABELS[soort] ? alles.filter((e) => e.type === soort) : alles;

  const eigenaar = data.data?.profile?.name ? ` van ${data.data.profile.name}` : "";
  const naam = soort && LABELS[soort]
    ? `${LABELS[soort]}${eigenaar}`
    : `Dashboard${eigenaar}`;

  const ics = buildIcs(events, naam);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="dashboard.ics"',
      "Cache-Control": "public, max-age=900",
    },
  });
}
