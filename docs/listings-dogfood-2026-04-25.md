# Listings dogfood — bug hunt — 2026-04-25

End-to-end run as agent + buyer against the live dev server.
Three test listings created via API: happy-path Mt Eden villa, minimal-fields auction, edge-case listing with special chars.
All API calls succeeded; all flagged issues are behavioural / inconsistency / polish, not 500s.

Server log + raw API output: [`scripts/dogfood-output.json`](../scripts/dogfood-output.json)
Driver script: [`scripts/dogfood-listings.mjs`](../scripts/dogfood-listings.mjs)

Test data is **still in the DB** if you want to click around — short codes:
- `o5psp` — 12 Mt Eden Road (full-feature)
- `4u0xj` — 88 Newton Street (auction, no docs/images)
- `r7cyv` — O'Connell's place (edge cases, XSS-y chattels)

---

## Severity legend

- **🔴 Broken** — security/data leak, or wrong result that buyer/agent will hit
- **🟠 Inconsistent** — works but contradicts another part of the app
- **🟡 Polish** — cosmetic, copy, empty-state, mobile niggles

---

## 🔴 Broken

| # | Where | Saw | Expected | One-line fix |
|---|---|---|---|---|
| B1 | `server/routes/listings.js:803` (`GET /download/:leadId/:docId`) | A `register_interest` lead can download every PDF on that listing — same as a `doc_request` lead. Confirmed: lead #4 (Bob, "register interest only") downloaded the LIM with HTTP 200. | Only `doc_request` leads should be able to download. "Register interest" is supposed to be a soft signal, not access. | Add `if (lead.intent !== 'doc_request') return notFound();` at line 818. |
| B2 | `server/routes/listings.js:280` (`GET /listings/:id`) | Agent-side detail returns leads but does **not** SELECT `intent` from `property_leads`. So the agent UI receives no intent data at all. | `intent` must be in the SELECT. | Add `intent` to the SELECT column list. |
| B3 | `client/src/pages/ListingDetail.jsx:1261-1356` (LeadRow) | Agent has no way to tell a "register interest" lead from a "doc request" lead — no badge, no filter, no icon. With B2 fixed the data is there; UI still doesn't render it. | Show a small chip ("📄 Docs requested" vs "👋 Interest only") on each lead row. | Render `lead.intent` as a chip next to the lead name. |
| B4 | `server/services/email.js:307,310,315,346,372` (lead-notification + doc-pack + register-interest emails) | `lead.name`, `lead.email`, `addr` are interpolated raw into HTML emails. Test lead with name `<script>alert(1)</script>` produced an HTML email with the literal `<script>` tag inside `<td>...</td>`. Most webmail clients strip `<script>`, but Outlook desktop in HTML view and many other clients render it as malformed HTML — at minimum the agent sees garbled output, at worst a payload runs. | Escape any user-supplied text before injecting into HTML. | Add a tiny `htmlEscape(s)` helper and wrap `lead.name`, `lead.email`, `lead.phone`, `addr`, `leadName` everywhere in HTML strings. The plaintext branch is fine. |
| B5 | `client/src/pages/PublicListing.jsx:830-860` (Document pack panel) | Document **labels** are visible to anyone hitting the public URL, before any form submission. The "Locked" badge is purely cosmetic — the JSON exposes `documents: [{id, kind, label}]` and the UI renders all of them. Roadmap explicitly calls for "buyers request access". | Either hide doc labels entirely until the form is submitted, or only show count + types ("3 documents — LIM, Title, Builders"). Real labels and download links only after `submitted`. | In `server/routes/listings.js:675`, return `documents` only as a count summary; or in the React, replace `{d.label}` with `KIND_LABELS[d.kind]` until `submitted`. |
| B6 | `server/services/email.js:328` (doc pack email) | Download link template: `${process.env.APP_URL || 'http://localhost:3001'}/api/listings/download/...`. If APP_URL isn't set in production, every emailed download link points to `localhost:3001` and is dead for the buyer. | Make APP_URL required at boot, or fall back to the request's `Host` header. | Throw at startup if `APP_URL` is unset and `NODE_ENV === 'production'`. |
| B7 | `server/routes/listings.js:803` (download endpoint) | No rate limiter. A scraper can brute-force `/api/listings/download/{leadId}/{docId}` pairs to harvest document PDFs. With sequential integer IDs, the search space is small. | Add `publicFormLimiter` to this route, plus consider unguessable tokens instead of integer IDs. | Slap `publicFormLimiter` on the route as a quick fix; longer-term, switch leadId to a random token stored alongside. |

## 🟠 Inconsistent

| # | Where | Saw | Expected | One-line fix |
|---|---|---|---|---|
| I1 | `client/src/pages/PublicListing.jsx:100-106` (`parsePriceParts`) | Listing 1 has `asking_price = "By Negotiation"`. Regex doesn't match (no digits) so the function returns `{ currency: '', number: 'By Negotiation', suffix: '' }`. UI then renders `<span class="pl-currency">$</span>By Negotiation` → buyer sees **"$ By Negotiation"** with a literal `$` glued to it. | Either suppress currency when no digits, or skip the price block entirely for non-numeric prices. | If `currency === ''` after parsing AND no digits in `number`, render the string plain (no `$`, no `pl-currency`). |
| I2 | `client/src/pages/PublicListing.jsx:328` | Listing 3 has `asking_price = "$0"`, `sale_method = "price"`. Public page shows **"Asking price · $0"**. Looks broken. | If `sale_method === 'price'` and price is "$0" or "0", show "Price on application" or hide the block. | Treat zero/blank price as missing — only render the block when there's a meaningful number. |
| I3 | `client/src/pages/ListingForm.jsx:195-197` | Validation has a placeholder block: `if (form.sale_method && SALE_METHODS_WITH_DEADLINE.has(form.sale_method) && !form.sale_deadline_at) { /* not required, just a nudge */ }` — does nothing. Auction listings can be created with no deadline; buyer page then shows badge "Auction" with no date. | Either enforce the deadline for auction/tender/deadline_sale, or inline-warn the user (but don't block save). | Replace the empty block with `setError('Auction/tender/deadline sales need a date.'); return;` (or render a non-blocking warning). |
| I4 | `client/src/pages/ListingDetail.jsx:1307,1330,1336` | UI references `lead.message` repeatedly — but the schema has no `message` column and the API never returns one. Dead code path: line 1307 falls back to email; the message bubble at 1330-1338 never renders. | Either add a "message" field to the lead form + schema, or rip out the references. Right now it's confusing dead code that hides bugs. | Delete `lead.message` references (5 lines) — net cleanup. |
| I5 | `server/routes/listings.js:712,800` | Endpoint is `POST /public/:shortCode/lead` (singular). Plan/docs/roadmap and many people would expect `/leads`. Not breaking, just a convention split. | Either-or — pick one and stick. The collection-creation REST convention is `POST /leads`. | Rename route to `/public/:shortCode/leads`; client only has one caller (`PublicListing.jsx:181`). |
| I6 | `client/src/pages/Listings.jsx:96-103` | Index shows Code / Address / Status / Docs / Leads / Created — but **no image count**. ListingDetail uploads images, but you can't tell from the index which listings have photos. Most agent-list views in PropertyFiles/AgentSend show a thumbnail. | Add a small thumb of the hero image, or at least an "Images" column. | Add `image_count` to the GET `/listings` SELECT and a column in the index. |
| I7 | `server/routes/listings.js:548-593` (`POST /:id/images`) | Loop awaits `processPropertyImage` for each file; if file 3 of 5 fails, files 1-2 are committed to DB and disk but the response is HTTP 400 with no rollback. Half-uploaded gallery in the DB. | Either process all in a transaction-like manner or report partial-success. | Wrap the loop in try/catch that rolls back already-inserted rows on first failure (DELETE + `removeImageFiles` for the inserted ids). |
| I8 | `server/services/email.js:297,342,352,375` | Email signature is hard-coded `Formz`. CLAUDE.md insists every brand element must come from agency settings. | Pull `agency.name` (and footer) from the agent's agency record and inject. | Pass `agencyName` through `sendLeadNotification` etc., default to the global brand only as fallback. |
| I9 | `client/src/pages/PublicListing.jsx:840` ("Locked" / "Emailed" badges) | Doc cards say "Locked" before submit, "Emailed" after. But there's never a clickable download from the page itself — the buyer must dig the email out of their inbox to download anything. | Once submitted, the page itself should expose the download links inline (using the lead_id returned from the POST). | After successful submit, fetch fresh listing data with the leadId in scope and render `<a href="/api/listings/download/{leadId}/{docId}">` for each doc. |
| I10 | `server/routes/listings.js:509-533` (`POST /:id/open-homes`) | No future-date check on `start_at` — agents can post an open home in 2010. Public endpoint filters past ones, but the agent UI shows them as if scheduled. | Reject `start_at` in the past (or warn). | Add `if (new Date(startAt).getTime() < Date.now() - 60*1000) return res.status(400)…` at line 521. |
| I11 | `server/routes/listings.js:653-710` (public endpoint) | Returns `agent_email` and `agent_phone` to anyone who knows the short code. While agents *want* their phone public on a listing, exposing the email enables bot harvesting at scale. The public page already has a tappable mailto button — it doesn't need the literal address. | Trim email from the public payload, or obfuscate it (e.g. `name@…`) and only reveal on click. | Drop `agent_email` from the SELECT at 667; rebuild `mailto` from `agent_id`-keyed contact form on the buyer side. |

## 🟡 Polish

| # | Where | Saw | Suggested |
|---|---|---|---|
| P1 | `client/src/pages/PublicListing.jsx:299-304` (Save button) | "Save" button toggles a heart icon visually but persists nothing — page reload loses the state. Buyers will think it saved their interest. | Either persist (localStorage at minimum), or remove the button until you wire a real "favourites" feature. |
| P2 | `client/src/pages/PublicListing.jsx:223-225` (Back button) | If there's no history (direct visit from a shared link), the Back button does nothing. | Hide the button when `window.history.length <= 1`, or fall back to "Open listings on Formz". |
| P3 | `client/src/pages/PublicListing.jsx:131,154` | `document.title` is set to `${address} — Formz`, then reset to "Formz" on unmount. Should reflect the agency brand, not the global app name. | Use the agency name from a context provider if available. |
| P4 | `client/src/pages/ListingForm.jsx:184-193` (URL validations) | Manual `^https?://` regex for `hero_image_url`, `matterport_url`, `youtube_url`, `floor_plan_url`. Doesn't catch `https://` followed by garbage; doesn't reject `javascript:`. | Use `new URL(v)` in a try/catch and check protocol is `http:` or `https:`. |
| P5 | `client/src/pages/PublicListing.jsx:307-311` | When there are zero photos AND no `hero_image_url`, the hero block is omitted entirely — no fallback image. The page jumps straight to the address card. Looks half-finished. | Render a soft gradient placeholder with the address overlaid (matches the redesign vibe). |
| P6 | `client/src/pages/PublicListing.jsx:618-625` (chattels chips) | Each chattel chunk is split on `[\n,]+`. Listing 1's chattels include "stove, dishwasher, rangehood" — fine. Listing 3 includes `"as is"` with embedded comma → splits awkwardly. Nothing crashes, just ugly chips. | Document the format as line-separated only, or strip quoted regions before splitting. |
| P7 | `server/routes/listings.js:397-422` (DELETE) | Five sequential DELETEs and two `fs.rmSync` calls, no transaction. If one DB DELETE fails midway, the rest run anyway. SQLite makes this cheap to wrap. | Wrap the five DELETEs in a single `db.transaction(() => { ... })`. |
| P8 | `server/middleware/upload.js:7` | PDF upload check is by MIME type only. A `.exe` with `Content-Type: application/pdf` slips through (then served back to a buyer with the same MIME). | Sniff magic bytes (`%PDF-`) on the buffer before saving. |
| P9 | `client/src/pages/PublicListing.jsx:434-485` (Share row) | No `navigator.share` fallback — modern phones have a native share sheet. WhatsApp/SMS/Email/Copy is fine but feels dated next to AgentSend. | If `navigator.share` exists, render a single "Share" button that opens the OS sheet, with the four-button row as a fallback. |
| P10 | `client/src/pages/ListingDetail.jsx:340` | `const leads = listing.leads || []` — but you also count leads as `(listing.leads || []).length` in the delete-confirm dialog at line 237. Tiny duplication; harmless. | Hoist to one variable at the top of the component. |
| P11 | `server/routes/listings.js:653` and `:712` | `publicFormLimiter` (30 req / 15 min) is applied to both page-view and form-submit. A buyer who reloads the page a few times then submits could get throttled. | Use `publicFormLimiter` only on the submit, and a much looser limit on the page view (genericApiLimiter or even none). |

---

## Smoke-test results (what worked)

✅ Listing creation with full + partial + edge fields all returned 201.
✅ Image upload pipeline works (Sharp resizes, saves to `/uploads/property-images/{shortCode}/`).
✅ PDF upload + multer 20MB cap works.
✅ Open-home POST creates rows; public endpoint correctly filters past ones.
✅ Lead validation rejects missing name, missing email, bad intent.
✅ Doc download streams a PDF with `Content-Disposition: attachment`.
✅ Cross-listing download attempt (lead from listing A, doc from listing B) returns 404.
✅ XSS-y `<script>` tag in chattels and lead name is **safe in the React UI** (auto-escaped). Only unsafe in the email HTML — see B4.
✅ Path traversal guards in `download/:leadId/:docId` (line 825) reject paths outside UPLOADS_DIR.
✅ Tenant scoping: every authenticated query has `agent_id = ?` filter.
✅ `req.ip` works because `app.set('trust proxy', 1)` is set.

## What I didn't test

- Real browser rendering / mobile breakpoints (read Tailwind classes only)
- Concurrent short-code collisions (loop tries 10 attempts, looked correct on read)
- Image upload at the 12MB cap or HEIC handling specifically
- Gmail OAuth flow — emails were captured in dev-mode console only
- Linz address autocomplete (depends on env config, not configured)
- Postgres backend (still SQLite locally)

---

## Suggested triage order if you only have an hour

1. **B1** — broken access control (5 min fix)
2. **B5** — public doc-pack leakage (15 min, gating logic + UI tweak)
3. **B2 + B3** — agent can't see lead intent (10 min)
4. **B4** — email XSS escaping (10 min, one helper function)
5. **I1 + I2** — price rendering for non-numeric / zero (10 min)
6. **I3** — auction-without-deadline form validation (5 min)

Everything else is comfortable backlog.
