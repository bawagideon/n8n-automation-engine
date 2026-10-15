# AutoOps Command Center: Production Automation Engine & Showcase

> **"A public interactive site where prospective clients and engineering leaders can click, watch real business automations execute step-by-step, inspect visual graphs, and copy importable production n8n workflows."**

[![Built for n8n](https://img.shields.io/badge/n8n-Workflow%20Engine-EA4B71?style=flat&logo=n8n)](https://n8n.io)
[![Multi-Tool Support](https://img.shields.io/badge/Agnostic-n8n%20%7C%20Make%20%7C%20Zapier-4A3CF0?style=flat)](https://autoops.dev)
[![Deployment](https://img.shields.io/badge/Deploy-Vercel%20%2B%20Railway-000000?style=flat&logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Product Overview

The **AutoOps Command Center** bridges the gap between technical automation engineering and non-technical business buyers:
- **For Non-Technical Clients & Hiring Managers:** The **Story View** explains every process in plain English ("What it does", "Starts when", "You get", and "Time saved") with accessible tooltips explaining technical jargon.
- **For Automation Gurus & DevOps Engineers:** The **n8n Blueprint View** provides clean, per-node syntax-highlighted JSON, connection graphs, and one-click copy/download with metadata stripped for direct import into any n8n canvas (`Ctrl+V` or *Workflows → Import*).
- **Tool-Agnostic Comparison:** Every workflow includes architecture notes comparing implementation tradeoffs across **n8n**, **Make.com**, and **Zapier**.

---

## 2. Architecture: Brain + Shell

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AutoOps Command Center                          │
│                                                                        │
│ [Recruitment]  [AI Intelligence]  [Commerce]  [Voice/Chat]  [Marketing]│
└──────┬────────────────────┬─────────────────┬──────────────┬───────────┘
       │                    │                 │              │
       ▼                    ▼                 ▼              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    AutoOps Engine (src/engine.js)                      │
│                                                                        │
│ • Graph Planner & Topological Traversal (Handles IF node branching)   │
│ • Dual-Tier Execution: Simulation Mode & Real-time Live Mode           │
│ • Fault Injector (429 rate-limit testing with backoff recovery)        │
│ • Dynamic Card Renderer (Story, Flow SVG, Blueprint JSON)             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Pub/Sub Event Bus
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Live Pipeline Ribbon  │  Streaming Terminal Log  │  26-Coverage Chips │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 13 Production Workflows & 26 Covered Automations

The repository includes 13 complete, valid, importable n8n workflows located in `/automations`:

| # | Workflow File | Covered Automation Capabilities | Key Integrations |
|---|---|---|---|
| **01** | `01-lead-router.json` | `lead` (Auto-responder), `route` (Budget routing), `crm` (CRM sync) | Webhook, IF, Slack, Google Sheets, Gmail |
| **02** | `02-cv-scorer.json` | `cv` (CV parsing), `score` (Match scoring), `ats` (ATS logging) | Gemini 2.0 Flash Vision, Sheets, Webhook |
| **03** | `03-interview-booking.json` | `book` (Calendar booking), `rem` (SMS/WA reminders) | Cal.com, Google Meet, Termii SMS, WhatsApp Cloud |
| **04** | `04-transcript-dossier.json`| `tr` (Meeting summarizer), `dos` (Dossier builder) | Fathom/Otter, Gemini Flash, Airtable |
| **05** | `05-payment-reconciler.json`| `pay` (Reconciliation), `led` (Ledger), `inv` (PDF), `onb` (Invite)| Paystack Webhook, Sheets, PDF Engine, Telegram |
| **06** | `06-low-stock-alert.json` | `stk` (Low-stock daily alert) | Schedule Cron, Google Sheets, Termii SMS |
| **07** | `07-debt-reminders.json` | `debt` (Overdue debt sequence) | Daily Scan Cron, Sheets, WhatsApp API |
| **08** | `08-faq-chatbot-lead-score.json`| `chat` (FAQ chatbot), `qual` (Lead qualification) | Chatbase/Voiceflow, Intent Scorer, CRM |
| **09** | `09-voice-screening-postcall.json`| `voice` (Voice screening), `post` (Post-call summary) | Vapi WebRTC, ElevenLabs, Gemini, Slack |
| **10** | `10-outbound-call.json` | `out` (Outbound call request) | Webhook, E.164 Formatter, Vapi Outbound API |
| **11** | `11-content-studio.json` | `cont` (Social content), `sch` (Content scheduling) | Gemini 2.0, Notion Calendar, Buffer API |
| **12** | `12-email-autoresponder-drip.json`| `eml` (Email auto-draft), `drip` (Drip progression) | Gmail Trigger, Gemini, Hubspot Drip API |
| **13** | `13-global-error-handler.json` | `err` (Error recovery & 429 backoff) | n8n Error Trigger, Exponential Backoff, Slack |

---

## 4. Security & Cost Protection (Zero Client Secrets)

1. **Proxy Protection (`/api/hook/[key].js`):** The client browser NEVER talks directly to n8n Railway or knows API keys. The frontend dispatches to `/api/hook/[key]` on your domain, which checks an allowlist, applies rate limits, and forwards requests with private authentication headers.
2. **Rate Limiting:** IP-based sliding window prevents automated abuse and denial-of-wallet attacks.
3. **Payload Sanitization:** Rejects inputs over 2MB and enforces honeypot checks against bots.
4. **Honesty Badges:** The application explicitly flags executions as **Simulated (Demo Scenario)** or **Live Production**, protecting your engineering credibility.

---

## 5. Local Setup & Quick Start

The project runs on **vanilla ES Modules with zero external dependencies**:

```bash
# Clone the repository
git clone https://github.com/your-username/n8n-automation-engine.git
cd n8n-automation-engine

# Start the built-in development server
npm start
# or: node server.js
```

Open **`http://localhost:3000`** in your browser.

---

## 6. Deployment Guide (90-Minute Setup)

### Step 1: Deploy Frontend to Vercel
1. Push this repository to GitHub.
2. Import the project into [Vercel](https://vercel.com) (Preset: **Other**, Output Directory: `.`).
3. Add Environment Variables in Vercel:
   - `N8N_BASE_URL`: `https://your-n8n-app.up.railway.app`
   - `N8N_HOOK_SECRET`: your secret token
4. Deploy! Your site is live with HTTPS and serverless API proxying.

### Step 2: Self-Host n8n on Railway
1. Deploy n8n on [Railway.app](https://railway.app).
2. Set service environment variables:
   - `WEBHOOK_URL`: `https://your-n8n-app.up.railway.app/`
   - `N8N_ENCRYPTION_KEY`: Keep this securely backed up.
3. Attach a persistent storage volume or PostgreSQL database so workflows and credentials survive redeployments.
4. Import the workflows from `/automations` and activate them!

---

## 7. Client Acquisition & Pitch Strategy

- **Core Pitch:** *"I build AI systems that reply to leads in 5 seconds, screen candidate resumes, and reconcile payments for you so your team stops doing it by hand."*
- **Live Demo Link:** Send prospective clients directly to your hosted URL with the matching module tab opened.
- **Conversion Loop:** The site's corporate inquiry form and audit booking CTA run directly through your own lead routing workflow.

---

## 8. License

MIT © [Gideon Bawa](https://github.com/GideonBawa)
