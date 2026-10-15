/**
 * AutoOps Card Component
 * Renders the 3-view switcher (Story, Flow SVG, n8n Blueprint) with real-time execution animation.
 */
import { bus } from '../bus.js';
import {
  escapeHtml,
  annotateGlossary,
  syntaxHighlight,
  stripMeta,
  getIcon
} from '../engine.js';

export function copyToClipboard(text, buttonEl) {
  const orig = buttonEl.textContent;
  const notify = () => {
    buttonEl.textContent = 'Copied!';
    setTimeout(() => { buttonEl.textContent = orig; }, 1400);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(notify).catch(fallback);
  } else {
    fallback();
  }

  function fallback() {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      notify();
    } catch (e) {
      console.error('Copy failed:', e);
    }
    ta.remove();
  }
}

export function downloadJson(workflow, buttonEl) {
  const clean = stripMeta(workflow);
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(clean, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const fileName = (workflow.name || 'workflow').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json';
  downloadAnchor.setAttribute('download', fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  copyToClipboard(JSON.stringify(clean, null, 2), buttonEl);
}

export function createCardElement(workflow, engine, options = {}) {
  const planned = engine.plan(workflow);
  const plain = workflow.meta?.autoops?.plain || {
    what: 'Automates business operations.',
    when: 'Triggered by events.',
    result: 'Streamlined workflow execution.',
    saves: 'Hours weekly'
  };
  const category = workflow.meta?.autoops?.cat || 'Operations';
  const toolNotes = workflow.meta?.autoops?.toolNotes || {
    n8n: 'Native execution engine, zero cloud lock-in, handles binary buffers directly.',
    make: 'Great visual branching and modular mapping; higher cost at high task volume.',
    zapier: 'Fastest 2-step setup for quick client wins; limited multi-step logic on basic tier.'
  };

  const card = document.createElement('article');
  card.className = 'c automation-card';
  card.dataset.workflowName = workflow.name;
  card.dataset.key = options.key || workflow.name;

  card.innerHTML = `
    <div class="c-head">
      <div>
        <h2 style="margin-bottom:4px;">${escapeHtml(workflow.name)}</h2>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <span class="b ok">${escapeHtml(category)}</span>
          <span class="b">${workflow.nodes.length} nodes</span>
          <span class="b wn">Tool-Agnostic</span>
        </div>
      </div>
      <button class="pr btn-run-card" style="padding:5px 12px;font-size:12.5px;">▶ Run Live</button>
    </div>

    <!-- View Switcher Tabs -->
    <div class="tabs-nav" role="tablist">
      <button role="tab" aria-selected="true" data-tab="0">Story</button>
      <button role="tab" aria-selected="false" data-tab="1">Flow</button>
      <button role="tab" aria-selected="false" data-tab="2">n8n Blueprint</button>
      <button role="tab" aria-selected="false" data-tab="3">Tool Compare</button>
    </div>

    <!-- Tab 0: Story (Non-Technical & Clients) -->
    <div class="v-panel on" data-panel="0">
      <div class="facts">
        <div><b>What It Does</b>${annotateGlossary(plain.what)}</div>
        <div><b>Starts When</b>${annotateGlossary(plain.when)}</div>
        <div><b>You Get</b>${annotateGlossary(plain.result)}</div>
        <div><b>Time Saved</b>${escapeHtml(plain.saves)}</div>
      </div>
      <ol class="st">
        ${workflow.nodes.map((node, idx) => `
          <li data-n="${escapeHtml(node.name)}">
            <span class="q">${idx + 1}</span>
            <div>
              <p><b>${escapeHtml(node.name)}:</b> ${annotateGlossary(node.notes || '')}</p>
              <small class="step-status"></small>
            </div>
          </li>
        `).join('')}
      </ol>
    </div>

    <!-- Tab 1: Flow SVG -->
    <div class="v-panel" data-panel="1">
      ${engine.renderFlow(workflow)}
      <p style="color:var(--mut);font-size:11.5px;margin:8px 0 0;">
        Interactive flow: Orange glow marks active processing node. Green indicates completed steps. Faded nodes represent alternate branches bypassed by logic.
      </p>
    </div>

    <!-- Tab 2: n8n Blueprint (Automation Gurus) -->
    <div class="v-panel" data-panel="2">
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center;">
        <button class="btn btn-copy-json" style="font-size:12px;">Copy for n8n</button>
        <button class="btn btn-dl-json" style="font-size:12px;">Download .json</button>
        <span style="font-size:11.5px;color:var(--mut);">100% Importable (strips AutoOps meta)</span>
      </div>

      ${workflow.nodes.map(n => `
        <div class="blk" data-n="${escapeHtml(n.name)}">
          <div class="why"><b>Step Logic:</b> ${annotateGlossary(n.notes || '')}</div>
          <pre>${syntaxHighlight(n)}</pre>
        </div>
      `).join('')}

      <div class="blk">
        <div class="why"><b>Execution Graph Connections:</b></div>
        <pre>${syntaxHighlight(workflow.connections)}</pre>
      </div>
    </div>

    <!-- Tab 3: Tool-Agnostic Architecture (Make.com & Zapier) -->
    <div class="v-panel" data-panel="3">
      <div style="background:var(--bg);border:1px solid var(--ln);border-radius:8px;padding:12px;margin-bottom:10px;">
        <h4 style="margin:0 0 6px;font-size:13px;color:var(--ink);">Architectural Breakdown Across Systems</h4>
        <p style="margin:0;font-size:12.5px;color:var(--mut);">
          Clients often ask: "Can you build this in Make.com or Zapier instead?" As an automation architect, here is how and why each tool applies to this specific workflow:
        </p>
      </div>

      <div class="facts" style="grid-template-columns:1fr;">
        <div>
          <b>n8n (Selected Choice)</b>
          ${escapeHtml(toolNotes.n8n)}
        </div>
        <div>
          <b>Make.com Equivalent</b>
          ${escapeHtml(toolNotes.make)}
        </div>
        <div>
          <b>Zapier Equivalent</b>
          ${escapeHtml(toolNotes.zapier)}
        </div>
      </div>
    </div>

    <!-- Execution result bar -->
    <div class="rc" aria-live="polite"></div>
  `;

  // Tab switching logic
  const tabButtons = card.querySelectorAll('.tabs-nav button');
  const panels = card.querySelectorAll('.v-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.tab;
      tabButtons.forEach(b => b.setAttribute('aria-selected', b === btn));
      panels.forEach(p => p.classList.toggle('on', p.dataset.panel === idx));
    });
  });

  // Action buttons
  const cleanJsonStr = JSON.stringify(stripMeta(workflow), null, 2);
  const copyBtn = card.querySelector('.btn-copy-json');
  if (copyBtn) copyBtn.addEventListener('click', () => copyToClipboard(cleanJsonStr, copyBtn));

  const dlBtn = card.querySelector('.btn-dl-json');
  if (dlBtn) dlBtn.addEventListener('click', () => downloadJson(workflow, dlBtn));

  const runBtn = card.querySelector('.btn-run-card');
  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      if (card.busy) return;
      card.busy = true;
      runBtn.disabled = true;
      runBtn.textContent = 'Running…';
      try {
        await engine.run(options.key || workflow.name);
      } catch (e) {
        console.error(e);
      } finally {
        card.busy = false;
        runBtn.disabled = false;
        runBtn.textContent = '▶ Run Live';
      }
    });
  }

  // Subscribe to real-time events for this card
  function markNode(nodeName, stateClass) {
    const elements = card.querySelectorAll(`[data-n="${CSS.escape(nodeName)}"]`);
    elements.forEach(el => {
      el.classList.remove('on', 'done', 'skip');
      if (stateClass) el.classList.add(stateClass);
    });
  }

  bus.on('run:start', ({ id, name, skipped = [] }) => {
    if (id !== (options.key || workflow.name) && name !== workflow.name) return;
    
    // Clear previous status
    card.querySelectorAll('li small.step-status').forEach(s => (s.textContent = ''));
    const rc = card.querySelector('.rc');
    if (rc) rc.textContent = 'Automation execution running…';

    workflow.nodes.forEach(n => {
      markNode(n.name, skipped.includes(n.name) ? 'skip' : '');
    });
  });

  bus.on('node:start', ({ node }) => {
    markNode(node, 'on');
  });

  bus.on('node:done', ({ node, summary }) => {
    markNode(node, 'done');
    const li = card.querySelector(`li[data-n="${CSS.escape(node)}"]`);
    if (li) {
      const status = li.querySelector('.step-status');
      if (status) status.textContent = `✓ ${summary}`;
    }
    const rc = card.querySelector('.rc');
    if (rc) rc.textContent = `✓ ${summary}`;
  });

  bus.on('node:skipped', ({ node }) => {
    markNode(node, 'skip');
    const li = card.querySelector(`li[data-n="${CSS.escape(node)}"]`);
    if (li) {
      const status = li.querySelector('.step-status');
      if (status) status.textContent = 'Bypassed by conditional logic';
    }
  });

  bus.on('run:done', ({ id, name, ms, covers }) => {
    if (id !== (options.key || workflow.name) && name !== workflow.name) return;
    const rc = card.querySelector('.rc');
    if (rc) {
      rc.textContent = `✓ Workflow completed in ${(ms / 1000).toFixed(1)}s. Covered: [${covers.join(', ')}]`;
    }
  });

  return card;
}
