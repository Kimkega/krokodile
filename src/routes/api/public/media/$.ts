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
          // Honour the browser's cached copy: a matching ETag costs us a 304
          // with no body instead of streaming the whole image again.
          const inm = request.headers.get("if-none-match");
          const upstream = await fetch(target, {
            headers: inm ? { apikey: key, "If-None-Match": inm } : { apikey: key },
          });

          if (upstream.status === 304) {
            return new Response(null, {
              status: 304,
              headers: {
                ETag: inm ?? "",
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
          }

          if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });

          const headers: Record<string, string> = {
            "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
            // Long-lived at the browser AND at the CDN edge, so a traffic spike
            // hits the edge cache rather than the storage backend.
            "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
            Vary: "Accept-Encoding",
          };
          const etag = upstream.headers.get("etag");
          if (etag) headers["ETag"] = etag;
          const len = upstream.headers.get("content-length");
          if (len) headers["Content-Length"] = len;

          return new Response(upstream.body, { headers });
        } catch (err) {
          console.error("[media] fetch failed", err);
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});
