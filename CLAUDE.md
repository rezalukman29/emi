# CLAUDE.md — standing rules for AI agents working on EMI

This file is loaded automatically by Claude Code. Other AI tools/models: read it first.
It holds **rules that always apply**. The running log of what changed lives in
[`docs/ai-handoff.md`](docs/ai-handoff.md).

## Role

Always work as **head of design, head of product and head of engineering** at once:
question the UX and the copy, not just the code; ship polished, consistent UI;
keep the engineering safe (build, lint, no API breakage).

## Branch & git rules (set by the owner)

- Working branch: **`daniel-staging-web`**. Commit and push directly to it.
- Do **not** open pull requests or merge into other branches unless the owner asks.
- Before starting work, check that push works (`git push --dry-run origin daniel-staging-web`).
  If it is refused (403), tell the owner immediately, before doing the work.

### Team flow — ALWAYS sync with `main` before working

The owner's flow: (1) owner pushes to `daniel-staging-web` → (2) the main dev reviews and
merges it into `main` (possibly with other people's work) → (3) before the next change,
pull first → (4) work again. So at the **start of every task**:

```
git fetch --depth=1000 origin daniel-staging-web main   # bounded; the clone is shallow
git pull --ff-only origin daniel-staging-web             # get the latest branch
git log --oneline daniel-staging-web..origin/main        # anything on main we don't have?
```

- If that last command lists commits, **merge `origin/main` into `daniel-staging-web`**
  (`git merge origin/main`), run build + lint, and tell the owner what came in.
  On conflicts, stop and report them; do not guess.
- If it lists nothing, say "main has no new changes" and continue.
- Never rebase or force-push `daniel-staging-web`; it is shared with the main dev.
- The sidebar footer shows the branch + commit each build came from (see "Build info"),
  so the owner can see at a glance which update is deployed.

## Needs the API? Stop and ask first (set by the owner, 2026-11-20)

If a request (or part of it) needs a **new or changed backend API** — a new endpoint, a new
field or query param, a changed payload, or data the current responses do not contain —
**stop before building that part and tell the owner** what is needed and why, in plain words.
Build only the part that works with the API as it is today, and say clearly what was left out.
Record every such case in `docs/api-impact-log.md` with status **"Needs API — waiting for owner
/ backend"** (what the UI needs, which endpoint, which fields), so the developers can pick it up.
Do not mock a missing API into a feature that looks finished unless the owner asks for a mock preview.

## Mandatory logging — every change, every time

| What happened | Where to write it |
|---|---|
| Any change (for the next AI / model hand-off) | `docs/ai-handoff.md` (newest first) |
| Any change (for human developers) | `docs/update-history.md` (newest first) |
| A change that may affect the backend API (endpoints, payloads, field names, query params, response parsing, cache keys) — or explicitly "no API impact" when it is close | `docs/api-impact-log.md` |
| Any AI lapse/mistake (wrong assumption, skipped check, broken thing, miscommunication) | `docs/ai-incident-log.md` |

Write the entries in the same commit as the change. Be honest in the incident log.

## Project facts

- React 19 + Vite 8 + TypeScript/JSX mix, Tailwind installed but most styling is plain CSS
  in `src/style.css` (tokens on `:root`), `src/sourceResponsive.css` (mobile overrides),
  `src/eventUpgrade.css`.
- Backend: axios instance `src/service/axios.ts` (`VITE_BACKEND_URL`, default staging host).
  React Query hooks live in `src/hooks/api/`.
- i18n: `src/locales/en/translation.json` and `src/locales/id/translation.json` —
  **every new string goes in both**.
- App version: `package.json` `version`, shown at the bottom of both sidebars.
- Build info: `vite.config.js` injects `__BUILD_INFO__` (branch, short commit, commit date,
  message, author, build time) from Vercel's `VERCEL_GIT_*` env vars or local git;
  rendered by `src/components/BuildInfo.tsx` in both sidebars (type in `src/types/build-info.d.ts`).
- Front-end-first modules: when the backend does not exist yet, build the UI on mock data in
  `src/data/*Mock.ts`, show a "Preview · mock data" badge, and write the needed API
  contract as comments + DTO types in `src/hooks/api/*Contract.ts` (example: Event Checklist).
  Record the new endpoints in `docs/api-impact-log.md` and the product decision in `docs/prd/`.
- Install deps with `yarn install --frozen-lockfile` (`npm ci` fails: `package-lock.json`
  is out of sync, and npm needs `--legacy-peer-deps` because of react-query 3 + React 19).
- Unit tests: `node --test tests/*.test.cjs`. **Baseline: 2 pre-existing failures** (tests 19/22 on
  `a25b133`: Cutting Stock exclusivity, card return/transfer chips) — do not add new ones.
- Checks: `npm run build` must pass. `npm run lint` has a **pre-existing baseline of
  12 errors + 1 warning** (AreaPage, AreaDetailPage, PrintPlanModal…) — do not add new ones.
- `.card` gets `padding: 16px 14px` on mobile from `sourceResponsive.css`; use a more
  specific selector (`.card.your-class`) when a card needs its own padding.
- **Light / dark mode:** `html[data-theme="light|dark"]`, chosen in the header Theme menu
  (`src/lib/theme.ts`, `src/components/ThemeSwitcher.tsx`; localStorage `emi.theme.v1`).
  Dark token values live in `src/theme-dark.css`. **New CSS must use the tokens** (`var(--white)`
  for surfaces, `var(--bg)`, `var(--text*)`, `var(--*-bg)` tints); a hard-coded light colour needs
  an override in `theme-dark.css`. Check new screens in both modes. Print always stays light.
  Inline styles in TSX: use `var(--white)` etc., or `var(--dk-name, #lightColour)` with `--dk-name`
  defined only in the dark block of `theme-dark.css` (keeps light mode identical).
- **A/B layouts:** `useUiVariant()` (`src/lib/uiVariant.ts`) + floating `VariantSwitcher` (admins only,
  mounted in `Layout.tsx`). B-only styles live in a scoped CSS file (e.g. `src/edLayoutB.css`, scope `.ed-b`).
  Keep A unchanged; when the owner picks a winner, delete the other branch and the switcher for that page.
- **emi-source** (the browser-state prototype the owner designs in) is the public repo `sandmanzz/emi`.
  Port its changes with a `docs/source-migration-<commit>.md` note (what was ported, what needs backend).
- The "Context every dev should know" section at the top of `docs/update-history.md`
  is outdated (it says "no backend / no TypeScript"); trust the code.

## Visual verification

Most pages need the backend. For screenshots, run `npx vite preview` and mock the API with
Playwright `page.route(/emi\.web\.id/, …)`: return a user plan with every
`*_price: 1` from `/v1/user/plan`, otherwise feature-gated pages redirect to `/log`.
Put `{"id":1,"user_type":"ADMIN","is_admin":1,"token":"x"}` in `localStorage.auth`.
