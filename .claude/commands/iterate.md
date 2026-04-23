---
description: Dogfood the app, find bugs & missing features, propose a prioritised list, wait for user approval, then build the approved items. Full test→use→change→ship loop.
---

User wants an autonomous iteration pass: exercise the app, compare against the reference products and roadmap, surface improvements, get approval, implement.

**Scope:** unless the user specified a page/feature in the command args, cover the whole app.

## Phase 1 — Exercise the app

1. Start the dev server if not running (`npm run dev`). Wait for "FormFlow RE server running".

2. Walk the critical paths, capturing issues at each step:
   - **Auth** — signup, login, JWT persistence, admin gating, password change
   - **Clients** — create, edit, list, delete, search
   - **Forms** — send each form type (agency agreement, market appraisal, vendor disclosure, sale & purchase, purchaser acknowledgement), open the public link, fill, sign, submit
   - **Submissions** — list view, grouping, filter, AI summary generation, agent notes, mark reviewed
   - **Settings** — profile edit, Gmail connect, password change
   - **Admin** — list users, toggle admin, delete user, stats
   - **Public pages** — confirmation page after submit, expired token handling

3. For each path, note:
   - Does it work? (functional)
   - Is it fast? (loading states, perceived latency)
   - Is it clear? (labels, CTAs, error messages)
   - Is it branded? (currently Hometown hardcoding — every instance is a finding)
   - Is it on mobile? (check at 400px width)

4. Compare the app to the reference products:
   - **propertyfiles.co.nz** — what listing/doc-pack features are missing entirely?
   - **agentsend.co.nz** — what branded-share/engagement-tracking features are missing?
   - Cross-reference against [docs/ROADMAP.md](../../docs/ROADMAP.md) — which roadmap items are still open?

## Phase 2 — Categorise findings

Group every finding into one of these buckets. Drop anything trivial (single typo) unless the user asked for a polish pass.

| Bucket | Examples |
|---|---|
| **Bug** | Broken flow, 500 error, data loss, regression |
| **UX** | Confusing labels, missing empty states, bad mobile layout, slow feedback |
| **Missing feature** | Roadmap item not yet built, gap vs reference products |
| **Tech debt** | Hardcoded brand values, missing tests, duplicated code, unscoped queries |
| **Security** | Auth leak, missing rate limit, unescaped input |

Estimate effort per item: `S` (under 30min), `M` (half-day), `L` (multi-day). Flag anything that touches auth, DB schema, or existing client data with `⚠️ risky`.

## Phase 3 — Propose

Present findings as a single skimmable report:

```
## Findings (N total)

### 🔴 Bugs (n)
- [S] Title — one-line symptom (file:line)
- ...

### 🟡 UX (n)
- [M] Title — one-line description
- ...

### 🟢 Missing features (n)
- [L] Title — which reference product has it
- ...

### 🔵 Tech debt (n)
- [S] Title — why it matters
- ...
```

Then use **AskUserQuestion** with `multiSelect: true` to let the user pick which items to tackle in this iteration. Default the recommended set to the top 3–5 by impact-per-effort. If the list is long, split into 2–3 questions (e.g. "which bugs", "which features") rather than one giant checklist.

## Phase 4 — Execute approved items

For each approved item:
1. Pick the right subagent (`forms-builder`, `property-listings`, `ui-designer`, `db-architect`, `api-integrator`, `test-writer`).
2. If the item is `⚠️ risky` or `L`, run `/feature-plan` first and get a second approval before coding.
3. Delegate with a self-contained brief. Wait for completion.
4. After each item, re-walk the affected flow to verify no regression.

## Phase 5 — Report

When all approved items are done (or blocked), report:
- ✅ Shipped — item + one-line outcome
- ⏳ Partial — item + what remains
- ❌ Blocked — item + blocker

Ask the user: ship with `/ship`, or start another `/iterate` round.

## Guardrails

- **Never skip Phase 3.** No code changes without explicit approval of specific items.
- **Don't exceed the approved scope.** If you find a new issue while fixing an approved one, note it for next round — don't sneak it into this commit.
- **Don't run against production.** This command is local-dev only.
- **Stop on destructive findings** — if you find a schema change is needed to fix a bug, stop and escalate to `/feature-plan` rather than auto-migrating.
