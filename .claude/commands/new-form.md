---
description: Scaffold a new NZ legal form end-to-end (component, routes, tests). Delegates to forms-builder subagent.
---

User wants to add a new NZ real estate form to the Formz CRM.

**Steps:**

1. Ask the user (interactively via AskUserQuestion) for:
   - Form name (e.g. "Tenancy Agreement")
   - Category — `vendor` or `buyer` (or propose a new category if neither fits)
   - Whether it requires a signature
   - Key field groups (e.g. Parties, Property, Terms, Special Conditions)

2. Delegate the actual build to the **forms-builder** subagent with a self-contained brief that includes:
   - The answers above
   - Instruction to follow [client/src/components/forms/](client/src/components/forms/) conventions
   - Instruction to wire it into [client/src/pages/ClientForm.jsx](client/src/pages/ClientForm.jsx) and [server/routes/forms.js](server/routes/forms.js)
   - Instruction to add a test in `server/__tests__/` for submission
   - Instruction to stop before running the server — just write code

3. After the subagent finishes, show the user:
   - Files created/changed
   - How to test locally (`npm run dev`, then send a form to a test client)
   - Any legal wording the user should confirm with the agency before production

4. Do **not** commit automatically — user will decide after review.
