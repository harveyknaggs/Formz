---
description: Produce a structured plan for a big feature before any code is written. Use before touching auth, DB schema, or a new module.
---

User is about to start non-trivial work. Produce a plan before executing.

**Steps:**

1. Confirm you understand the feature by restating it in one sentence. If ambiguous, ask via AskUserQuestion.

2. Read the parts of the codebase the feature touches. List each file you read so the user can correct course.

3. Draft the plan with these sections:
   - **What changes** — 3–6 bullets
   - **Files to touch** — concrete paths
   - **Data model changes** — tables/columns added, migrations needed
   - **API surface** — new/changed endpoints with method + path
   - **UI surface** — new/changed pages or components
   - **Tests** — what to cover, where the file goes
   - **Rollout** — is this a single commit, a series, feature-flagged?
   - **Risks / open questions**

4. Identify which subagent(s) will execute each section (forms-builder, property-listings, db-architect, api-integrator, ui-designer, test-writer).

5. Use **ExitPlanMode** to present the plan for approval. Do not edit code until the user approves.

6. On approval, hand off to the named subagents — each with a self-contained brief — and report back when done.
