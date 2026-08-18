import { createFileRoute } from "@tanstack/react-router";

/**
 * Host-agnostic image pipeline.
 *
 * Images live in the private `media` bucket. This proxy streams them with the
 * PUBLISHABLE key (never the service-role key) so it works identically on
 * Lovable, Vercel, Netlify or any Node host — the only env the deploy needs is
 * the Supabase URL + publishable key, which every deploy already has.
 */
function env(...names: string[]): string {
  for (const name of names) {
    const value = typeof process !== "undefined" ? process.env[name] : undefined;
    if (value) return value;
  }
  return "";
}

export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat ?? "";
        if (!path || path.includes("..")) return new Response("Not found", { status: 404 });

        const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
        const key = env("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY");
        if (!url || !key) {
          console.error("[media] Supabase env missing on this host");
          return new Response("Media backend not configured", { status: 500 });
        }

        const target = `${url.replace(/\/+$/, "")}/storage/v1/object/media/${path
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`;

        try {
          const upstream = await fetch(target, { headers: { apikey: key } });
          if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });
          return new Response(upstream.body, {
            headers: {
              "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch (err) {
          console.error("[media] fetch failed", err);
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});
