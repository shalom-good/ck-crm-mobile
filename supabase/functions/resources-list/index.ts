// resources-list — the full CK resources directory (RLS is deny-all for anon,
// so this runs with the service role). Field mapping is defensive: the
// resources table's exact column names vary, so we coalesce common candidates.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const pick = (r: Record<string, any>, keys: string[]) => {
  for (const k of keys) {
    const v = r[k];
    if (v != null && v !== "") return Array.isArray(v) ? v.filter(Boolean).join(", ") : String(v);
  }
  return undefined;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await sb.from("resources").select("*").limit(1000);
    if (error) return json({ error: error.message }, 500);

    const firstCat = (r: Record<string, any>) => {
      const c = r.categories ?? r.category ?? r.tags;
      if (Array.isArray(c)) return c.filter(Boolean)[0] ? String(c.filter(Boolean)[0]) : undefined;
      return c ? String(c) : undefined;
    };

    const resources = (data ?? [])
      .filter((r: Record<string, any>) => r.active !== false)
      .map((r: Record<string, any>) => ({
        id: r.id,
        name: pick(r, ["resource_name", "name", "title", "organization"]) ?? "Resource",
        category: firstCat(r) ?? "Other",
        contact: pick(r, ["contact_person", "contact", "contact_name", "point_of_contact"]),
        phone: pick(r, ["phone", "phone_number", "contact_phone"]),
        email: pick(r, ["email", "contact_email"]),
        description: pick(r, ["description", "notes", "about", "details", "summary"]),
        link: pick(r, ["url", "link", "website", "site"]),
      }));

    resources.sort((a, b) =>
      a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category),
    );
    return json({ count: resources.length, resources });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
