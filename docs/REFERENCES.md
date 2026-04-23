# Reference products

Snapshot captured 2026-04-20. Both are NZ-focused; both solve a narrower problem than Formz aims to. Formz's goal is to unify their feature sets with the existing digital-forms product into one transaction hub.

## propertyfiles.co.nz

**Tagline:** "Save time distributing listing information to buyers."

**Model:** Free (no visible paywall).

### Features
- Upload listing documents (LIM, Title, Builders Report, etc.) per property
- Buyers enter contact info to access files
- Agent gets lead notifications by email on every buyer registration
- Agent-side listing management + profile page

### User roles
- **Agent** — uploads docs, manages listings, monitors buyer engagement
- **Buyer** — self-serves property info after giving contact details

### Flow
1. Agent uploads docs to a listing
2. Buyer lands on listing page, supplies contact to unlock docs
3. System emails docs to buyer
4. Agent receives lead notification
5. Agent follows up with qualified prospects

### What we emulate
- Contact-gate on doc packs (capture buyer info before delivering files)
- Agent email notifications on every new lead
- Lead-list view per listing

## agentsend.co.nz / agentsend.com

**Tagline:** Branded file sharing for real estate agents with open/download tracking.

**Model:** **$25 per property (one-time, excludes GST).**

### Features
- File sharing per property (LIM, Title, builders reports, EQC, valuations)
- **Open/download notifications** to agent
- Agency-branded (logo + colours on public pages)
- Mobile + tablet optimised
- Short 4-char property URLs (e.g. `agentsend.com/XK4Z`)
- Lead export
- 256-bit encryption, AWS-hosted
- Agent onboarding in under 60 seconds (enter address → drag docs → share URL)

### User roles
- **Agent** — uploads, tracks engagement, manages properties
- **Buyer** — requests docs, receives files after contact capture

### What we emulate
- Per-agency branding on public pages (not the platform brand)
- Short 4-char URLs for marketing materials
- Engagement tracking (who opened what, when) as a lead-quality signal
- Sub-60-second listing creation

## What Formz does that neither reference does
- **NZ legal forms** — Agency Agreement, Market Appraisal, Vendor Disclosure, Sale & Purchase, Purchaser Acknowledgement — fillable, signable, AI-summarised for the agent
- **In-app CRM** — clients, submissions, leads all in one place (no external CRM)
- **Claude AI** — summarises form submissions for faster agent review
- **Gmail-integrated email** — per-agent OAuth so emails send *from* the agent's own address

## Product positioning
Formz = PropertyFiles + AgentSend + digital-forms workflow, bundled as one per-agency CRM. One login for Ram. One dashboard. One bill.
