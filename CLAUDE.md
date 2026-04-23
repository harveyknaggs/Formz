# Formz — NZ Real Estate CRM

## What this is
An NZ real estate transaction hub for Ram Rangi's agency. It combines:
- **Digital forms** — NZ legal forms (Agency Agreement, Market Appraisal, Vendor Disclosure, Sale & Purchase Agreement, Purchaser Acknowledgement) sent to clients, filled, signed, AI-summarised
- **Property doc packs** — PropertyFiles-style: agent uploads LIM, Title, builders reports per listing; buyers request access and supply contact info
- **Lead capture & engagement tracking** — AgentSend-style: open/download notifications, branded per-agency URLs, lead scoring by engagement

The app **is** the CRM. No external CRM sync. Ram accesses everything through the UI — he has no repo access — so **every configuration knob must be exposed in the in-app admin panel**, never hardcoded.

## Reference products
- [propertyfiles.co.nz](https://propertyfiles.co.nz) — agent doc distribution + buyer lead capture
- [agentsend.co.nz](https://agentsend.co.nz) — branded file sharing, engagement tracking, $25/property

See [docs/REFERENCES.md](docs/REFERENCES.md) for feature-level breakdown.

## Stack
| Layer | Tech |
|---|---|
| Client | React 18, Vite, Tailwind, React Router 6 |
| Server | Express 4, Node |
| DB | SQLite (sql.js) now → **Postgres on Railway** |
| Auth | JWT (7-day), localStorage |
| AI | Anthropic Claude Sonnet (`claude-sonnet-4-20250514`) |
| Email | Gmail API per-agent OAuth + Make.com/SMTP fallbacks |
| Hosting | Railway — auto preview-deploy per PR |
| E-sign | In-app: SignaturePad + IP/timestamp/hash audit trail (NZ ETA 2002) |

## Project layout
```
client/          React app (Vite)
  src/pages/     Top-level routed pages
  src/components/forms/  Form definitions (one file per NZ form)
server/          Express API
  routes/        auth, clients, forms, submissions, gmail
  services/      ai (Claude), email (Gmail + fallbacks)
  public/forms/  Static HTML form pages served to clients
docs/            Roadmap + reference analysis
.claude/
  agents/        6 specialist subagents (forms, listings, APIs, UI, DB, tests)
  commands/      Slash commands (/new-form, /new-listing, /send-test, etc.)
```

## Conventions
- **Plan-first for big changes.** New pages, API surface, DB schema, auth — lay out a short plan and wait for approval. Small tweaks (copy, styling, single-function bug): just edit.
- **Commit-per-change to `main`.** No PR workflow locally; Railway preview deploys happen per push.
- **SaaS-ready single-tenant.** Launching for Ram's agency only, but every feature must scope by `agent_id` (or future `agency_id`) — never global. Branding via admin panel, not hardcoded.
- **Full test coverage target.** Tests alongside features. Priorities: auth, submissions, payments, form flows.
- **NZ context.** Use NZ English spelling, NZ dollars, NZ phone format (+64), REA 2008 / ETA 2002 references. Addresses default to NZ.
- **No comments unless non-obvious.** Well-named identifiers > comments.

## Never touch without asking
- DB migrations that drop/rename columns
- Auth logic ([server/routes/auth.js](server/routes/auth.js), [server/middleware/auth.js](server/middleware/auth.js), [client/src/contexts/AuthContext.jsx](client/src/contexts/AuthContext.jsx))
- Gmail OAuth credentials / `.env`
- Production deploys or DNS
- Existing real client data

## How to work on this codebase
- **Routine feature work:** use the specialist subagent that matches (see [.claude/agents/](.claude/agents/)). E.g. new form → `forms-builder`, new property feature → `property-listings`.
- **Scaffolds:** use slash commands — `/new-form`, `/new-listing`, `/send-test`, `/feature-plan`, `/ship`.
- **Running locally:** `npm run dev` from root (runs client + server concurrently). Client on Vite default, server on 3001.
- **Default admin login (dev only):** `agent@hometownrealty.co.nz / admin123`.

## Open work (as of 2026-04-20)
See [docs/ROADMAP.md](docs/ROADMAP.md). Highlights: Postgres migration, admin branding editor, property listings module, doc-pack + lead capture, e-sign audit trail, Ram's account.
