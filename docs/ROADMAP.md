# Formz Roadmap

Living doc. Top of each section = most urgent. As features ship, move them under **Done**.

## Now (foundations to unblock everything else)

### 1. Postgres migration — `db-architect`
Move from `sql.js` SQLite to Postgres on Railway. Build a Knex-based migration framework, mirror current schema, write a one-shot import script from the live `formflow.db`. Route code should not change — keep the `prepare().get()/.all()/.run()` API in `server/db.js`.

### 2. Agency branding editor — `ui-designer` + `db-architect`
Add `agencies` table + CSS-variable theme system. Admin panel gets a brand editor page: logo upload, primary/accent colours, agency name, email footer, contact details. Public listings and forms render in the agency's brand. Seed Ram Rangi's agency (ask Ram for name, colours, logo).

### 3. Create Ram's account — admin panel action
Once branding editor is live, create Ram's agent + agency record via admin. No code required.

## Next (the new modules)

### 4. Property listings module — `property-listings` + `db-architect`
Tables: `properties`, `property_documents`, `property_leads`, `document_events`. Agent CRUD UI + public listing page at `/p/:shortCode`. Short 4–6 char URLs, collision-checked.

### 5. Doc-pack request + lead capture — `property-listings`
Public listing page gates the documents behind a contact-capture form. On submit, email the docs + register a `property_lead`. Agent gets an email notification.

### 6. Engagement tracking — `property-listings`
Log every document view/download as a `document_events` row. Compute an engagement score per lead. Surface on a leads list sorted by engagement.

### 7. E-signature audit trail — `forms-builder` + `db-architect`
New `e_signatures` table: signer IP, UA, timestamp, SHA-256 hash of form_data, signature PNG. Display in submission review. Satisfies NZ ETA 2002.

### 8. Full test suite — `test-writer`
Set up Vitest + Supertest + Playwright. Write tests for auth, forms submission, listings, lead capture. Target 80% server / 70% client coverage. Gate CI on passing tests.

## Later (SaaS prep)

### 9. Multi-tenant hardening — `db-architect`
Every query scoped to `agency_id`. Add middleware that injects the active agency from the authed user. Audit all routes for leak risk.

### 10. Stripe subscriptions — `api-integrator`
Per-agency monthly plan. Checkout + webhook + subscription status in `agencies` table. Gate premium features (more listings, custom domain) on status.

### 11. Property data integration — `api-integrator`
CoreLogic or Linz for CV lookup, address autocomplete, suburb comparables. Cache aggressively — CoreLogic charges per call.

### 12. Custom domains per agency — `ui-designer` + `api-integrator`
`yourname.co.nz` points at Railway; we serve the agency's branded listings. Railway supports custom domains with automatic TLS.

### 13. Mobile PWA — `ui-designer`
Manifest, service worker, offline form draft saving. Public form pages work fully on mobile already — this is about installability.

## Done
- Digital NZ forms (Agency Agreement, Market Appraisal, Vendor Disclosure, Sale & Purchase, Purchaser Acknowledgement)
- JWT auth + admin panel
- Claude AI form summaries
- Gmail OAuth per agent + email fallback chain
- AI-driven dev scaffold (CLAUDE.md + 6 subagents + 5 slash commands)
