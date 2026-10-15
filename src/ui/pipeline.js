/**
 * AutoOps Pipeline Strip Component
 * Renders the active workflow node chain in execution sequence and animates live state.
 */
import { bus } from '../bus.js';
import { getIcon, escapeHtml } from '../engine.js';

export function initPipeline(pipeEl) {
  if (!pipeEl) return;

  const defaultHtml = `
    <span class="pipe-title">Pipeline View:</span>
    <span style="font-size:13px;color:var(--mut);">Run any action or testbed module to watch the live node pipeline stream here.</span>
  `;
  pipeEl.innerHTML = defaultHtml;

  bus.on('run:start', ({ name, steps = [], skipped = [] }) => {
    if (!steps.length) return;
    
    const nodesHtml = steps.map((s, idx) => `
      <span class="node" id="pipe-node-${idx}" data-node-name="${escapeHtml(s)}">
        <span class="pipe-node-idx">${idx + 1}</span> ${escapeHtml(s)}
      </span>
    `).join('<span style="color:var(--mut);font-size:11px;">→</span>');

    const skippedHtml = skipped.length ? `
      <span style="color:var(--mut);font-size:11px;margin-left:8px;">(Skipped branch: ${skipped.map(escapeHtml).join(', ')})</span>
    ` : '';

    pipeEl.innerHTML = `
      <span class="pipe-title">${escapeHtml(name)}:</span>
      ${nodesHtml}
      ${skippedHtml}
    `;
  });

  bus.on('node:start', ({ node, index }) => {
    const el = document.getElementById(`pipe-node-${index}`);
    if (el) {
      el.classList.remove('done', 'skip');
      el.classList.add('on');
    }
  });

  bus.on('node:done', ({ node }) => {
    const el = pipeEl.querySelector(`[data-node-name="${CSS.escape(node)}"]`);
    if (el) {
      el.classList.remove('on');
      el.classList.add('done');
    }
  });

  bus.on('node:skipped', ({ node }) => {
    const el = pipeEl.querySelector(`[data-node-name="${CSS.escape(node)}"]`);
    if (el) {
      el.classList.remove('on', 'done');
      el.classList.add('skip');
    }
  });

  bus.on('run:done', () => {
    // Pipeline finishes with all active nodes green
  });
}
