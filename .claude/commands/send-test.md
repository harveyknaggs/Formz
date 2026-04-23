---
description: Send a test form to a fake client and verify the full flow works locally.
---

User wants to smoke-test the form-send → fill → submit → review flow.

**Steps:**

1. Ensure the dev server is running. If not, start it with `npm run dev` and wait for "FormFlow RE server running".

2. Use the default dev admin to log in and obtain a JWT:
   ```
   POST /api/auth/login { email: "agent@hometownrealty.co.nz", password: "admin123" }
   ```
   Capture the returned token.

3. Create or reuse a test client via `POST /api/clients`:
   ```
   { name: "Test Vendor", email: "test+vendor@example.com", phone: "+64 21 000 0000" }
   ```

4. Send a form via `POST /api/forms/send`:
   ```
   { client_id: <id>, form_type: "agency_agreement", form_category: "vendor" }
   ```
   Capture the returned token URL.

5. Open the public form URL in a browser or simulate a submission via `POST /api/submissions/public/:token` with plausible form_data.

6. Trigger an AI summary via the submissions review endpoint.

7. Report:
   - Which step succeeded / failed
   - The form URL that was generated
   - The submission id + AI summary excerpt
   - Any 4xx/5xx responses and their bodies

**Do not** hit production APIs or use real client emails.
