import { createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (anon). Reads are deny-all under RLS, so data comes
 * through the `provider-families` edge function (service role, scoped). The
 * anon key is a public JWT — safe to ship; it only satisfies verify_jwt.
 */
const url = import.meta.env.VITE_SUPABASE_URL ?? "https://lrrovaqiudcbacxrdzkp.supabase.co";
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxycm92YXFpdWRjYmFjeHJkemtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTkxNDMsImV4cCI6MjA5NDM3NTE0M30.ALZQXb08Ix0YLYD43Nr3NAQWULUQfXRs8Av6RGowOFA";

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
