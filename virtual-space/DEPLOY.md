# Deploy — 숲

Minimal, free-tier production setup. Two hosts, no database.

| Piece | Host | URL example |
|-------|------|-------------|
| Next.js frontend | Vercel | `https://virtual-space.vercel.app` |
| WebSocket server | Fly.io | `wss://virtual-space-ws.fly.dev` |

Total cost: **$0/month** (free tiers). Uptime on free tier is best-effort; upgrade to the $5 hobby plan on either host if you need guarantees.

---

## 0. Prerequisites

```bash
brew install flyctl        # Fly CLI
npm i -g vercel            # Vercel CLI (optional — can also deploy via dashboard)
```

The repo must be pushed to GitHub/GitLab if you want auto-deploy from dashboard.

---

## 1. Deploy the WebSocket server to Fly.io

From the repo root:

```bash
cd virtual-space
fly auth login            # or: fly auth signup
```

Edit `fly.toml` if you want a different app name — the default is `virtual-space-ws`. Fly will complain if the name is taken; change it to something unique.

```bash
fly launch --copy-config --no-deploy --name YOUR-APP-NAME
```

The CLI may ask about Postgres/Upstash — say **no** to all. Accept Tokyo (`nrt`) as the primary region (closest to Korean users).

You DO NOT have the frontend URL yet, but set a placeholder so the server starts safely:

```bash
fly secrets set ALLOWED_ORIGINS=https://placeholder.example.com
fly deploy
```

Note the deployed URL, e.g. `https://virtual-space-ws.fly.dev`. The WSS URL is the same with `wss://`.

Health check:
```bash
curl https://YOUR-APP-NAME.fly.dev/health
# → {"status":"ok"}
```

---

## 2. Deploy the Next.js frontend to Vercel

### Option A — CLI (one-shot)

```bash
cd virtual-space
vercel                    # first run: links the project
# Answer prompts; root = virtual-space, build = auto-detected as Next.js

vercel env add NEXT_PUBLIC_WS_URL production
# paste: wss://YOUR-APP-NAME.fly.dev

vercel --prod             # production deploy
```

### Option B — Dashboard (GitHub integration)

1. Push this repo to GitHub.
2. https://vercel.com/new → Import the repo.
3. **Root Directory**: `virtual-space`
4. **Environment Variables** (Production):
   - `NEXT_PUBLIC_WS_URL` = `wss://YOUR-APP-NAME.fly.dev`
5. Deploy.

Note the Vercel URL, e.g. `https://virtual-space.vercel.app`.

---

## 3. Lock down the WS server origin

Now that you know the Vercel URL, replace the placeholder:

```bash
fly secrets set ALLOWED_ORIGINS=https://virtual-space.vercel.app
# Add preview domains too if desired (comma-separated):
# fly secrets set ALLOWED_ORIGINS=https://virtual-space.vercel.app,https://virtual-space-*.vercel.app
```

Fly restarts the app automatically after a secrets update.

---

## 4. Smoke test

1. Open `https://virtual-space.vercel.app` in two browser tabs.
2. Pick different colors, enter both.
3. Confirm:
   - Arrow keys move both characters, each sees the other.
   - Enter opens chat; messages appear above the character + in the panel.
   - Space on a vent teleports; other tab sees the animation too.
   - Space off a vent makes both characters hop.
4. Check `fly logs` for any warnings:
   ```bash
   fly logs -a YOUR-APP-NAME
   ```
   Warnings you might see safely: `Rejected WS from disallowed origin` (attacker scanning) or `too many connections` (spam).

---

## 5. Ongoing operations

| Task | Command |
|------|---------|
| Update server code | `cd virtual-space && fly deploy` |
| Update frontend code | push to GitHub (Vercel auto-deploys) or `vercel --prod` |
| Read server logs | `fly logs` |
| Scale to 2 machines | `fly scale count 2` (stateless — works but chat proximity uses in-memory map; shared state would need Redis) |
| Change tuning env | `fly secrets set MAX_PLAYERS=100` (etc. — see `.env.example`) |

Free-tier limits you may hit:
- Fly: 3 shared-cpu VMs × 256MB free — our `fly.toml` pins 1 always-on.
- Vercel: 100 GB bandwidth/month, 100 deploys/day. Plenty for this app.

---

## 6. Security notes

The server applies these defenses by default:
- **Origin whitelist** via `ALLOWED_ORIGINS` (required in prod).
- **Per-IP connection cap** (`MAX_CONNECTIONS_PER_IP`, default 3).
- **Global player cap** (`MAX_PLAYERS`, default 50).
- **Per-player rate limits** on move / chat / vent / jump.
- **Move validation**: rejects anything that isn't exactly 1 orthogonal tile.
- **Input sanitization**: name (16 ch) / chat (200 ch), control chars stripped.

There's no auth — anyone with the URL joins. If you need privacy, stick the app behind Cloudflare Access or a Vercel password.

---

## 7. Rollback

Fly keeps previous releases:
```bash
fly releases
fly releases rollback -v N
```

Vercel keeps every deployment and lets you promote any previous one from the dashboard.
