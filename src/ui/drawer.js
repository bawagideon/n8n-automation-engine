/**
 * AutoOps Workflow Inspector Drawer
 * Opens the 3-view card (Story / Flow / n8n Blueprint) for any automation on demand.
 */
import { createCardElement } from './cards.js';

export class WorkflowDrawer {
  constructor(dialogEl, engine) {
    this.dialogEl = dialogEl;
    this.engine = engine;
    this.contentEl = dialogEl.querySelector('.drawer-content') || dialogEl;
    
    const closeBtn = dialogEl.querySelector('.drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    dialogEl.addEventListener('click', (e) => {
      const rect = dialogEl.getBoundingClientRect();
      const inDialog = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!inDialog) {
        this.close();
      }
    });
  }

  open(workflowKey) {
    const item = this.engine.get(workflowKey);
    if (!item) {
      console.warn(`Workflow "${workflowKey}" not found in engine.`);
      return;
    }

    // Render card
    const cardEl = createCardElement(item.workflow, this.engine, { key: workflowKey });
    
    // Clear and insert
    this.contentEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:12px;font-weight:600;color:var(--mut);text-transform:uppercase;">Workflow Architecture Inspector</span>
        <button class="btn drawer-close" style="padding:3px 10px;font-size:12px;">Close ✕</button>
      </div>
    `;
    this.contentEl.appendChild(cardEl);

    const closeBtn = this.contentEl.querySelector('.drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    this.dialogEl.showModal();
  }

  close() {
    this.dialogEl.close();
  }
}
