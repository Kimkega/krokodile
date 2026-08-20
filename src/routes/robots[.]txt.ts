import { createFileRoute } from "@tanstack/react-router";

/** Robots policy driven by the admin SEO settings (indexing switch + extra rules). */
function env(...names: string[]): string {
  for (const name of names) {
    const value = typeof process !== "undefined" ? process.env[name] : undefined;
    if (value) return value;
  }
  return "";
}

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
        const key = env("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY");

        let indexing = true;
        let extra = "";
        let base = origin;

        if (url && key) {
          try {
            const res = await fetch(
              `${url.replace(/\/+$/, "")}/rest/v1/seo_settings?select=indexing_enabled,robots_extra,canonical_base_url&limit=1`,
              { headers: { apikey: key, Accept: "application/json" } },
            );
            if (res.ok) {
              const rows = (await res.json()) as {
                indexing_enabled: boolean;
                robots_extra: string | null;
                canonical_base_url: string | null;
              }[];
              const row = rows[0];
              if (row) {
                indexing = row.indexing_enabled !== false;
                extra = row.robots_extra ?? "";
                base = (row.canonical_base_url || origin).replace(/\/+$/, "");
              }
            }
          } catch {
            /* fall back to permissive defaults */
          }
        }

        const body = indexing
          ? [
              "User-agent: *",
              "Allow: /",
              "Disallow: /kingdanstore",
              "Disallow: /auth",
              "Disallow: /checkout",
              "Disallow: /order/",
              "Disallow: /api/",
              "",
              extra.trim(),
              "",
              `Sitemap: ${base}/sitemap.xml`,
              "",
            ].join("\n")
          : ["User-agent: *", "Disallow: /", ""].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
