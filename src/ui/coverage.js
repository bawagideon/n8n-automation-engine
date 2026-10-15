/**
 * AutoOps Coverage Tracker (26 Automations)
 * Tracks and visualizes completion across all covered operational automations.
 */
import { bus } from '../bus.js';

export const AUTOMATION_CATALOG = {
  lead: 'Lead auto-responder',
  route: 'Budget routing',
  crm: 'CRM sync',
  cv: 'CV parsing',
  score: 'Match scoring',
  ats: 'ATS logging',
  book: 'Interview booking',
  rem: 'SMS/WA reminders',
  tr: 'Meeting summarizer',
  dos: 'Dossier builder',
  pay: 'Payment reconciliation',
  led: 'Ledger update',
  inv: 'PDF invoice',
  onb: 'Onboarding invite',
  stk: 'Low-stock alert',
  debt: 'Debt reminders',
  chat: 'FAQ chatbot',
  qual: 'Lead qualification',
  voice: 'Voice screening',
  out: 'Outbound call',
  cont: 'Social content',
  sch: 'Content scheduling',
  eml: 'Email auto-draft',
  drip: 'Drip progression',
  err: 'Error recovery',
  post: 'Post-call summary'
};

export class CoverageTracker {
  constructor({ barEl, countEl, chipsEl, covEl }) {
    this.barEl = barEl;
    this.countEl = countEl;
    this.chipsEl = chipsEl;
    this.covEl = covEl;
    this.fired = new Set();
    this.total = Object.keys(AUTOMATION_CATALOG).length;

    this.renderInitial();
    this.listen();
  }

  renderInitial() {
    if (this.chipsEl) {
      this.chipsEl.innerHTML = Object.entries(AUTOMATION_CATALOG).map(([key, label]) => `
        <span id="chip_${key}" title="${key}: ${label}">${label}</span>
      `).join('');
    }

    if (this.covEl) {
      this.covEl.innerHTML = Object.entries(AUTOMATION_CATALOG).map(([key, label]) => `
        <span class="b" id="cov_${key}" style="opacity:0.5;margin:3px;">${label}</span>
      `).join('');
    }

    this.updateStats();
  }

  updateStats() {
    const count = this.fired.size;
    const pct = Math.round((count / this.total) * 100);

    if (this.countEl) {
      this.countEl.textContent = `${count}/${this.total}`;
    }

    if (this.barEl) {
      this.barEl.style.width = `${pct}%`;
    }
  }

  fire(key) {
    if (!AUTOMATION_CATALOG[key] || this.fired.has(key)) return;
    this.fired.add(key);

    const chip = document.getElementById(`chip_${key}`);
    if (chip) chip.classList.add('f');

    const cov = document.getElementById(`cov_${key}`);
    if (cov) {
      cov.style.opacity = '1';
      cov.classList.add('ok');
    }

    this.updateStats();

    if (this.fired.size === this.total) {
      bus.emit('log', {
        source: 'Coverage Milestone',
        message: '100% of all 26 core business automations successfully executed and verified!',
        level: 'ok'
      });
    }
  }

  listen() {
    bus.on('automation:covered', ({ code }) => {
      this.fire(code);
    });

    bus.on('run:done', ({ covers = [] }) => {
      covers.forEach(c => this.fire(c));
    });
  }

  reset() {
    this.fired.clear();
    if (this.chipsEl) {
      this.chipsEl.querySelectorAll('span').forEach(s => s.classList.remove('f'));
    }
    if (this.covEl) {
      this.covEl.querySelectorAll('span').forEach(s => {
        s.style.opacity = '0.5';
        s.classList.remove('ok');
      });
    }
    this.updateStats();
  }
}
