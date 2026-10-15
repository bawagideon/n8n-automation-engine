/**
 * AutoOps Live Log Component
 * Subscribes to the bus and renders real-time streaming execution telemetry.
 */
import { bus } from '../bus.js';

export function initLog(containerEl, clearBtnEl) {
  if (!containerEl) return;

  function appendLog({ source = 'System', message = '', level = '' }) {
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const row = document.createElement('div');
    if (level) row.className = level;

    row.innerHTML = `<span class="ts">[${timeStr}]</span> <b>${source}:</b> ${message}`;
    containerEl.appendChild(row);
    containerEl.scrollTop = containerEl.scrollHeight;
  }

  bus.on('log', appendLog);

  if (clearBtnEl) {
    clearBtnEl.addEventListener('click', () => {
      containerEl.innerHTML = '';
      appendLog({ source: 'System', message: 'Activity log cleared.', level: 'wn' });
    });
  }

  // Initial welcome message
  appendLog({
    source: 'AutoOps Kernel',
    message: 'Event bus initialized. All operational modules ready in Simulation mode.',
    level: 'ok'
  });
}
