import { createFileRoute } from "@tanstack/react-router";

/**
 * Dynamic sitemap. Static pages come from the admin-managed `seo_pages` map,
 * product URLs are appended automatically. Cached at the edge so crawler
 * traffic never touches the database twice within the window.
 */
function env(...names: string[]): string {
  for (const name of names) {
    const value = typeof process !== "undefined" ? process.env[name] : undefined;
    if (value) return value;
  }
  return "";
}

async function rest<T>(path: string): Promise<T[]> {
  const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
  const key = env("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY");
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/${path}`, {
      headers: { apikey: key, Accept: "application/json" },
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

function esc(value: string) {
  return value.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;

        const [settings] = await rest<{ canonical_base_url: string | null; sitemap_enabled: boolean }>(
          "seo_settings?select=canonical_base_url,sitemap_enabled&limit=1",
        );
        const base = (settings?.canonical_base_url || origin).replace(/\/+$/, "");

        if (settings && settings.sitemap_enabled === false) {
          return new Response("", { status: 404 });
        }

        const pages = await rest<{
          path: string;
          priority: number;
          changefreq: string;
          updated_at: string;
        }>("seo_pages?select=path,priority,changefreq,updated_at&in_sitemap=eq.true&order=priority.desc");

        const products = await rest<{ slug: string; updated_at: string }>(
          "products?select=slug,updated_at&active=eq.true&order=updated_at.desc&limit=2000",
        );

        const entries = [
          ...(pages.length
            ? pages.map((p) => ({
                loc: `${base}${p.path === "/" ? "" : p.path}`,
                lastmod: p.updated_at,
                changefreq: p.changefreq,
                priority: Number(p.priority).toFixed(1),
              }))
            : [{ loc: base, lastmod: new Date().toISOString(), changefreq: "daily", priority: "1.0" }]),
          ...products.map((p) => ({
            loc: `${base}/product/${p.slug}`,
            lastmod: p.updated_at,
            changefreq: "weekly",
            priority: "0.8",
          })),
        ];

        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          entries
            .map(
              (e) =>
                `  <url><loc>${esc(e.loc)}</loc><lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` +
                `<changefreq>${esc(e.changefreq)}</changefreq><priority>${e.priority}</priority></url>`,
            )
            .join("\n") +
          `\n</urlset>\n`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
