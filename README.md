# Command Deck — your project management tool, online

Deployable version of the app. Your data lives in **Supabase** (Postgres),
hosting is **Netlify**, and email magic-link login keeps everything private
and synced across your devices.

Total setup: ~15 minutes, all on free tiers.

---

## 1) Supabase — database + login

1. Sign up at **supabase.com**, create a new project (pick a region near you —
   *Singapore* is closest for PH). Save the database password somewhere.
2. In the project: **SQL Editor → New query**, paste everything from
   `supabase-schema.sql`, and click **Run**. This creates the `app_state`
   table plus the security rules that keep each account's data separate.
3. Go to **Project Settings → API** and copy two things:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long string — safe to use in the browser)
4. Email login (magic link) is on by default — nothing to configure yet.

## 2) Run it locally first (optional but nice)

1. Install **Node 18+**.
2. `cp .env.example .env` and paste your URL + anon key into `.env`.
3. `npm install`
4. `npm run dev` → open the printed URL, sign in with your email, and click
   the magic link that lands in your inbox.

## 3) Deploy to Netlify

**Recommended — via GitHub:**
1. Push this folder to a new GitHub repo.
2. On **netlify.com**: *Add new site → Import an existing project → GitHub →*
   pick the repo. Build settings are auto-detected from `netlify.toml`
   (`npm run build`, publish `dist`).
3. **Site configuration → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   Then **Deploys → Trigger deploy** so the values get baked in.

**Or drag & drop:** run `npm install && npm run build` locally (with `.env`
filled in), then drag the resulting `dist` folder onto netlify.com.

## 4) Point the login link back to your live site

Once Netlify gives you a URL (e.g. `https://command-deck.netlify.app`):
- Supabase → **Authentication → URL Configuration** → set **Site URL** to that
  URL and add it under **Redirect URLs**. Otherwise the magic link tries to
  open localhost and won't work.

---

## Good to know

- The anon key is *meant* to be public — the row-level security from step 1
  ensures every person only ever reads and writes their own data.
- **Team members are still simulated** (for planning + the "View as" preview).
  Real separate logins that share the same projects is a bigger upgrade —
  relational tables and sharing rules instead of one JSON doc per user. Happy
  to build that layer when you're ready.
- Want a branded address like `app.yourstudio.com`? Netlify → **Domain
  management** lets you attach a custom domain.
