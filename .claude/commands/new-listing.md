---
description: Scaffold a new property listing feature — listing page, doc pack, lead capture. Delegates to property-listings subagent.
---

User wants to add or extend the property listings module (PropertyFiles / AgentSend-style features).

**Steps:**

1. Check whether the foundational listings schema exists (grep for `properties` table in migrations and [server/db.js](server/db.js)). If not, the first run of this command sets up the base module; subsequent runs extend it.

2. Ask the user (via AskUserQuestion):
   - What exactly: base module? new field? new engagement metric? public-side UX tweak?
   - Does it touch the public page, the agent dashboard, or both?
   - Any data-model changes? (triggers db-architect involvement)

3. Delegate the build to **property-listings** subagent. If a schema change is needed, first run **db-architect** to write the migration, then property-listings for the feature code.

4. For every new feature, ensure:
   - Agent-side UI under `client/src/pages/listings/`
   - Public-side UI under `/p/:shortCode`
   - Engagement tracking middleware logs `document_events`
   - Email notification to agent on lead registration
   - Branding pulled from the agent's agency record (never hardcoded)
   - Tests via test-writer

5. Report back what was built and how to verify locally.
