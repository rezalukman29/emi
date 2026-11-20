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
- Front-end-first modules: when the backend does not exist yet, build the UI on mock data in
  `src/data/*Mock.ts`, show a "Preview · mock data" badge, and write the needed API
  contract as comments + DTO types in `src/hooks/api/*Contract.ts` (example: Event Checklist).
  Record the new endpoints in `docs/api-impact-log.md` and the product decision in `docs/prd/`.
- Install deps with `yarn install --frozen-lockfile` (`npm ci` fails: `package-lock.json`
  is out of sync, and npm needs `--legacy-peer-deps` because of react-query 3 + React 19).
- Checks: `npm run build` must pass. `npm run lint` has a **pre-existing baseline of
  12 errors + 1 warning** (AreaPage, AreaDetailPage, PrintPlanModal…) — do not add new ones.
- `.card` gets `padding: 16px 14px` on mobile from `sourceResponsive.css`; use a more
  specific selector (`.card.your-class`) when a card needs its own padding.
- The "Context every dev should know" section at the top of `docs/update-history.md`
  is outdated (it says "no backend / no TypeScript"); trust the code.

## Visual verification

Most pages need the backend. For screenshots, run `npx vite preview` and mock the API with
Playwright `page.route(/emi\.web\.id/, …)`: return a user plan with every
`*_price: 1` from `/v1/user/plan`, otherwise feature-gated pages redirect to `/log`.
Put `{"id":1,"user_type":"ADMIN","is_admin":1,"token":"x"}` in `localStorage.auth`.
