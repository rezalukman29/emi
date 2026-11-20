# AI incident log

Every lapse made by an AI agent while working on this repo: wrong assumptions, skipped
checks, broken output, miscommunication. The goal is learning, not blame: each entry says
what happened, its impact, and the rule adopted so it does not happen again. Newest first.

---

## 2026-11-20 — Reported on a stale clone of the branch

- **What:** working from another repo session, the agent cloned `rezalukman29/emi`, then a
  little later told the owner that `daniel-staging-web` was "identical to `staging`"
  (`5a4f489`) without fetching again. Meanwhile six commits (build info, Event Checklist,
  sidebar redesign…) had been pushed. The owner noticed the report was out of date.
- **Impact:** a wrong status report; no code was changed on the stale base.
- **Rule:** fetch (`git fetch origin daniel-staging-web main`) immediately before any
  statement about branch state, and quote the commit hash and time the statement is based on.

## 2026-11-20 — `*/` inside a block comment in the API contract

- **What:** while extending `eventChecklistContract.ts` the agent wrote
  `signature?: string /* PNG data URL … */` inside the big `/** … */` contract comment. The inner
  `*/` would have closed the comment early and broken the file.
- **Impact:** none — caught by re-reading the diff before running the checks; fixed before commit.
- **Rule:** never write `/*` or `*/` inside a block comment; use parentheses. After editing a
  comment-only contract file, run `npx tsc --noEmit -p .`.

## 2026-11-20 — Checklist v1 shipped without field requirements

- **What:** the first Event Checklist only supported a tick per task. The owner had to point out
  that field teams need photo proof and sign-off. The agent should have asked "how is this used
  on site?" before designing v1.
- **Impact:** a second round of design and code (v2) on the same day.
- **Rule:** for any operational feature, list the on-site scenarios (proof, exceptions,
  handover, offline, phone use) in the PRD before building the UI.

## 2026-11-20 — Unstyled class shipped earlier (found during redesign)

- **What:** the Event Settings header used `className="link-btn"`, a class that does not
  exist in any stylesheet, so the browser's default button (gray box, black border) was
  shown. Whoever added it did not check it visually.
- **Impact:** an ugly control on a main settings page, reported by the owner.
- **Rule:** after any UI change, take a screenshot (desktop + mobile) and look at it
  before committing; grep that every new class name has CSS.

## 2026-11-20 — Push access not checked before starting work

- **What:** the agent built and committed the sidebar-version change before checking that
  it could push. The push failed with 403 (Claude GitHub App has no write access to
  `rezalukman29/emi`), so the work stayed local and the owner had to get involved after
  the fact. Retries after the owner reconnected GitHub also failed in the same session.
- **Impact:** commit `0187b9d` (and later local commits) not on GitHub; a patch file was
  handed to the owner instead.
- **Rule:** run `git push --dry-run origin daniel-staging-web` at the start of a task and
  report a 403 right away. Do not keep retrying a 403 in the same session.

## 2026-11-20 — First Event Settings screenshot taken without API mock

- **What:** the first verification screenshot loaded `/event-status` without mocking the
  backend; the user-plan check redirected to `/log`, and the run was wasted.
- **Impact:** minor (time only).
- **Rule:** documented in `CLAUDE.md` → "Visual verification": mock `/v1/user/plan`.
