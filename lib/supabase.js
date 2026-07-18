import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Staan de sleutels niet in .env.local, dan draait de app in lokale modus:
 * alles blijft dan in de browser staan en er is geen login nodig.
 */
export const supabase = url && key ? createClient(url, key) : null;
export const heeftSupabase = Boolean(supabase);
