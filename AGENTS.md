<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Deployment outside Lovable

- Non-Lovable hosts (Render, Railway, etc.) must build with `NITRO_PRESET=node_server` and start with `npm start` (`node .output/server/index.mjs`) — the default Lovable build targets Cloudflare Workers, which Node hosts cannot run; `render.yaml` already sets both. Supabase env vars must be set at build time for `VITE_*` and at runtime for server keys.
