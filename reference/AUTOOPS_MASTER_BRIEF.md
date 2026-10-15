# AutoOps: Master Brief (build, deploy, win clients)

Give this file to your coding agent first. Put the two reference prototypes next to it in `/reference`:
- `reference/autoops-command-center.html` (the 6-module demo site with live log, pipeline strip, fault toggle, coverage tracker)
- `reference/automation-engine.html` (JSON-driven cards with Story / Flow / n8n blueprint views)

---

## 1. The product in one sentence

A public site where a visitor can **click, watch a real automation run step by step, and read exactly how it is built in the language they understand**. Non-technical buyers get the Story view. Automation people get the real, importable n8n JSON. The site itself is your sales funnel and is powered by your own automations.

## 2. How the two prototypes combine

**Rule: the engine is the brain, the Command Center is the shell.** Today the Command Center hardcodes each pipeline's steps inside its JS. After the merge, nothing is hardcoded. Every button calls `engine.run(automationId, payload)` and the n8n JSON decides what happens.

| Command Center piece | Becomes |
|---|---|
| Hardcoded `run(key, ids, steps)` | `engine.run(id, payload)` reading steps from the workflow JSON |
| Pipeline strip at the top | Rendered from the workflow's nodes in run order |
| Live activity log | Subscriber to the engine's event bus |
| Coverage tracker (26 automations) | Counts `meta.autoops.covers` ids from completed runs |
| Fault injection toggle | Engine flag: injects a 429 on the 2nd node, then runs the retry path |
| Module forms (inquiry, CV drop, checkout, chat, voice) | Thin UI that builds a payload and calls the engine |
| Card Story / Flow / Blueprint tabs | A "How it works" drawer on every module, opened with one click |

**Event bus (the glue).** The engine emits: `run:start {id, runId}`, `node:start {runId, node}`, `node:done {runId, node, summary, ms}`, `node:skipped`, `run:error`, `run:done {runId, ms}`. The log, pipeline strip, coverage bar, health light and card highlights all just listen. No module talks to another module directly.

## 3. Repo structure (no build step, deploys anywhere static)

```
autoops/
  index.html                 shell: header, tabs, log aside, dialogs
  src/
    engine.js                validate, plan, layout, highlight, run (simulate + live)
    bus.js                   tiny pub/sub
    ui/                      cards.js, log.js, pipeline.js, coverage.js, theme.js
    modules/                 recruitment.js, intelligence.js, commerce.js, chatvoice.js, marketing.js
    styles.css               tokens, light/dark, reduced motion
  automations/
    index.json               ["01-lead-router.json", ...]
    01-lead-router.json ...  one real n8n export each, plus meta.autoops
  api/
    hook/[key].js            Vercel serverless proxy to n8n (see section 6)
  reference/                 the two prototypes
  .env.example
  vercel.json
  README.md
```
Vanilla JS with ES modules. No framework, no bundler. The agent can finish it faster and it can't break on deploy.

## 4. Automation file contract

Each file is a valid n8n export (`name`, `nodes`, `connections`) plus:
```json
"meta": { "autoops": {
  "cat": "Recruitment",
  "covers": ["lead","route","crm"],
  "plain": { "what": "", "when": "", "result": "", "saves": "" },
  "take": { "<IF node name>": 0 },
  "sample": { "<node name>": "one plain sentence of what happened" },
  "live": { "key": "inquiry", "mode": "respond" }
}}
```
Rules: every node has `notes` (max 18 words, no jargon, starts with what happens to the customer). Node names read as actions. "Download" strips `meta.autoops` so n8n imports it cleanly. Validate on load and show human error messages.

**The 13 workflow files that cover all 26 automations:**

| File | Covers |
|---|---|
| 01-lead-router | lead, route, crm |
| 02-cv-scorer (Gemini Flash, JSON output) | cv, score, ats |
| 03-interview-booking (Cal.com booking.created) | book, rem |
| 04-transcript-dossier | tr, dos |
| 05-payment-reconciler (Paystack charge.success) | pay, led, inv, onb |
| 06-low-stock-alert (cron) | stk |
| 07-debt-reminders (cron, 7-day sequence) | debt |
| 08-faq-chatbot-lead-score | chat, qual |
| 09-voice-screening-postcall (Vapi/Retell webhook) | voice, post |
| 10-outbound-call (Zapier or n8n to Vapi) | out |
| 11-content-studio | cont, sch |
| 12-email-autoresponder-drip | eml, drip |
| 13-global-error-handler (n8n Error Trigger) | err |

Also build one Make.com scenario and one Zapier Zap for the same job (e.g. lead router). Your pitch is "tool agnostic," so show it. Put their screenshots and a short "why I'd choose this tool here" note in the card.

## 5. Real-time: two tiers

**Tier 1, ship first.** The site POSTs to the proxy. n8n runs the workflow and its last node (Respond to Webhook) returns `{ status, steps:[{node, summary}], result }`. The engine animates the nodes and uses the real summaries where returned, sample text elsewhere. It feels live and needs no extra infrastructure.

**Tier 2, after you have clients looking.** n8n writes an event row at each key step to a free Supabase table (`run_events`). The site subscribes through Supabase Realtime and lights nodes as they actually finish. Needed for long jobs (voice calls, scheduled crons).

**Honesty rule (non-negotiable).** Every card and run shows a badge: `Simulated` or `Live`. Never present a simulated run as a real client result. Label sample stories "Demo scenario". Your credibility is the whole business.

## 6. Security and cost protection (a public demo gets abused)

- n8n URL and keys never appear in browser code. The browser calls `/api/hook/<key>` on your own domain. The Vercel function checks `key` against an allowlist, adds the secret header n8n expects, forwards the request, and enforces CORS.
- Rate limit per IP (e.g. 10 runs/hour) using Upstash Redis free tier or Vercel KV. Add a honeypot field and a daily global cap.
- Paid actions (SMS, outbound voice calls, Gemini on big files): simulate by default. Go live only for a number the visitor enters, capped at 1 per day, with a size limit on CVs (e.g. 2 MB). Set spend limits in Termii, Vapi and Google AI Studio.
- Paystack: `pk_test_...` only in the browser. Verify webhook signatures (`x-paystack-signature`) inside n8n.
- Gemini, Termii, Vapi keys live only in n8n credentials.
- Add n8n basic auth or owner login, keep `N8N_ENCRYPTION_KEY` backed up, and export workflows to the repo weekly.

## 7. Build phases (agent works one phase at a time, you approve each)

1. **Port.** Create the repo, move the Command Center shell into `index.html`, extract engine code from the prototype into `src/engine.js`. Acceptance: the old demo still runs identically.
2. **Engine v2.** Add the event bus, modes (Simulate/Live), `covers`, fault injection through the engine, validation, a drawer that opens Story/Flow/Blueprint for any workflow. Acceptance: the 4 sample workflows run from files.
3. **Content.** Write all 13 workflow files. Import each into real n8n and confirm it imports without errors. Acceptance: all import; sample text reads clearly to a non-technical person (test on a friend).
4. **Wire modules.** Replace hardcoded runs with `engine.run`. Acceptance: Run full demo lights all covered automations.
5. **Live mode.** Proxy function, Tier 1 responses, Paystack test checkout, Cal.com webhook, Gemini CV parsing, Vapi web call. Acceptance: each live badge works end to end with the n8n Railway instance.
6. **Polish.** Mobile at 375px, keyboard tabs, light/dark, reduced motion, loading and error states, OG image, title and meta tags, favicon, analytics (Plausible or Vercel Analytics).
7. **Ship.** See section 9.

## 8. First message to paste to your agent

> Read `AUTOOPS_MASTER_BRIEF.md` fully, then open both files in `/reference`. Do not write code yet. First reply with: (1) your understanding of the merge in 10 lines, (2) any ambiguities, (3) the exact file list you will create for Phase 1. Then wait for my go. Rules: vanilla JS with ES modules, no build step, no new dependencies without asking. Never put secrets in client code. Work one phase at a time and finish each with a short test checklist I can run. Keep every automation file importable into n8n. Never invent an API response shape; if unsure, ask me or read the docs. Commit after each phase with a clear message.

## 9. Deployment (about 90 minutes)

1. **GitHub:** push the repo (private is fine, public is better for credibility once secrets are clean).
2. **Vercel (free Hobby plan):** import the repo, framework preset "Other", no build command, output directory `.`. Add env vars: `N8N_BASE_URL`, `N8N_HOOK_SECRET`, rate-limit store keys.
3. **Railway n8n checks:**
   - `WEBHOOK_URL=https://<your-app>.up.railway.app/` set exactly.
   - Attach a **volume or Postgres** so workflows and credentials survive redeploys.
   - 1 GB RAM minimum. Use a paid plan so the service never sleeps.
   - Every workflow **Active**, and the site calls the **production** `/webhook/` URL, not `/webhook-test/`.
   - `N8N_ENCRYPTION_KEY` set and backed up somewhere safe.
4. **Domain:** buy `yourname.com` or `yourbrand.xyz` and attach it in Vercel (HTTPS automatic). A custom domain makes you look established; `yourname.vercel.app` works while you wait.
5. **Monitoring:** UptimeRobot (free) pinging an n8n health-check webhook every 5 minutes, with an email alert. Do a full test run before every outreach push.
6. **Cal.com:** create the free account, add the booking webhook pointing to your n8n production URL.
7. **Final test:** open on your phone over mobile data, run every module once, check the n8n execution list shows the runs.

## 10. Getting clients with it

**Positioning.** Don't say "automation engineer." Say what the buyer gets: *"I build AI systems that reply to leads, screen candidates and chase payments for you, so your team stops doing it by hand."* Lead with the recruitment angle: it is a clear niche, you have the full pipeline, and recruiters feel the pain daily.

**Homepage order.** Hero with one sentence and "Try a live demo" button. Then the demo. Then three outcome cards: problem, automation, time saved (use your own measured demo numbers and label them as demo scenarios). Then a 60 to 90 second Loom walkthrough. Then pricing tiers and "Book a free automation audit" (Cal.com). Every form on the site runs through your own lead-router workflow. Say so on the page: *"This inquiry form is itself an automation. You'll get a reply in seconds."*

**Offers (starting points, adjust to your market):**
- **Audit** (free 20 min call or a paid 1-hour deep dive): you map their top 3 repetitive tasks and leave a written plan.
- **Quick win:** one workflow live in 3 to 5 days, fixed price.
- **Growth build:** 3 to 5 workflows plus a chatbot or voice agent, fixed price with a 30-day support window.
- **Monthly retainer:** monitoring, fixes, and one new automation a month.

Fixed prices beat hourly for first clients: they buy outcomes and you profit from speed.

**Where to find them, in order of speed:**
1. **Warm network.** Message 20 people who run or work in a business: "I'm automating X for Y; can I build you one for free in exchange for a testimonial and permission to showcase?" Two case studies beat any certificate.
2. **LinkedIn DMs to recruiters, agency owners, ops heads.** Use a personalised 60-second Loom: "I built this lead router for your hiring form." Send 10 a day.
3. **Marketplaces:** Upwork, Contra, Fiverr, and the Make and Zapier expert directories. Open every proposal with your live link and the exact card matching their job.
4. **WhatsApp and Instagram SMEs** (pharmacies, logistics, schools, real estate, restaurants): demo the payment reconciler, low-stock alert and WhatsApp bot with their own numbers on screen.
5. **Content:** post one workflow breakdown a week (screenshot of the Story view plus the result). X, LinkedIn and the n8n community forum.

**Proposal skeleton (keep under 150 words):** their problem in their words, the matching live demo link, the exact workflow you'd build and in how many days, the price, one question to start.

**Credibility checklist:** GitHub README with a GIF of a run, 2 testimonials, your n8n/Make/Zapier profiles linked, a short "How I work" section (discovery, build, test, handover, support), and real security notes (you never store client secrets in the browser).

**For job applications:** put the link at the top of your CV with one metric line, e.g. "Built a 26-automation recruitment and SME operations demo: lead routing, AI CV scoring, payments, voice agents." Attach the Loom.

## 11. Seven-day plan

| Day | Goal |
|---|---|
| 1 | Hand the brief to the agent, approve Phase 1 plan, set up GitHub and Vercel |
| 2 | Phases 1 and 2 done, deployed to a preview URL |
| 3 | Write and import the first 6 workflows |
| 4 | Remaining workflows, wire modules, Run full demo passes |
| 5 | Live mode for lead router, CV scorer and Paystack |
| 6 | Polish, record Loom, buy domain, set monitoring |
| 7 | Launch: post it, send 20 DMs, submit 5 proposals |

Keep a simple tracker (Notion or a sheet) of outreach sent, replies, calls and closes. Improve the message that gets replies and drop the rest.
