# Kroko Luxe Emporium

KROKO DILE  ,,,A LUXURY BAGS MEN AND WOMEN  SELLING WEBSITE , LOGIN AND A TRACKING  AND  MEN WOMEN AND ADMIN CAN ADD OTHER CARTEGORY,  ADD ADMIN DASHBOARD  admin can add  mpesa config for  mpesa express,  paybill , pass key short code consumer key and consumer secrest,  make sure proper status  polling on purchase, , in tracking users use email and number used to pay, , users buy ads guest, ,  and  create a mobile size recept after   they checkout, add a floating  cart,  add a whataap,  with json  of order after user pays he can follow up immedietly with a whataap message with pre filled   what he boght,  for  shipping add  all counties in kenya all sub counties  wards and towns all in kenya users will select when  on checkout,  on couriers add all  in kenya from g4s to all,  even all m,atatu saccos,  the admin can asssign courier when a purchase is made, ADD ADMIN  to ve able to upload a midium size logo of website , update website name  logo and socials,, be creative, the logo is in gold and dark brown color,   come up with best idea,  easy upload of product images, , be creative

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://krokodile.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3c703652-079b-43e3-a8b2-1c7dbb26c805).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Deploying to Render

This is a full-stack SSR app (it handles checkout, M-Pesa polling, media and email server-side),
so on Render it must be deployed as a **Web Service**, not a "Static Site".
(A Static Site expects a plain publish folder — that is what causes
`Publish directory dist does not exist!`.)

### Option A — Blueprint (recommended)

1. Render Dashboard → **New → Blueprint**, pick this repository.
2. Render reads `render.yaml` and asks you to fill in the variables marked `sync: false`.
3. Apply. Render builds (`npm run build`) and starts the Node server (`npm start`).

### Option B — Manual Web Service

- **Runtime:** Node · **Node version:** `22` (set `NODE_VERSION=22`)
- **Build command:** `npm install --no-audit --no-fund && npm run build`
- **Start command:** `npm start`
- **Environment variables** (required — point them at whichever Supabase/Lovable-Cloud
  project you want the site to use):

  | Variable | Where it is read | Example |
  | --- | --- | --- |
  | `NITRO_PRESET` | build | `node_server` |
  | `NODE_VERSION` | build/runtime | `22` |
  | `VITE_SUPABASE_URL` | browser bundle (build time) | `https://<project-ref>.supabase.co` |
  | `VITE_SUPABASE_PUBLISHABLE_KEY` | browser bundle (build time) | `sb_publishable_...` |
  | `SUPABASE_URL` | server at request time | same URL as above |
  | `SUPABASE_PUBLISHABLE_KEY` | server at request time | same key as above |
  | `SUPABASE_SERVICE_ROLE_KEY` | privileged server work | `sb_secret_...` |

- **Health check path:** `/robots.txt`

### Notes

- `VITE_*` values are compiled into the browser bundle during the build, so set them
  **before** the build runs (Render exposes env vars to the build automatically).
- The server keys are read per-request at runtime — changing `SUPABASE_*` and
  restarting/redeploying is enough to move the server to a different project.
- The target Supabase project must already contain the app's tables, policies and
  storage buckets (run the same migrations there) — the app only reads whatever
  project the variables point to.
- Everything admin-managed in-app (M-Pesa keys, SMTP settings, branding, SEO) lives
  in the database, so it follows whichever project you point at.
