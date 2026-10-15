/**
 * SME Commerce & Financial Operations Module
 * Wires Paystack Checkout, Low-Stock Inventory Alerts, and Invoice Debt Reminders.
 */
import { bus } from '../bus.js';

export function initCommerceModule({ containerEl, engine, drawer, paystackModalEl }) {
  if (!containerEl) return;

  // 1. Paystack Checkout
  const btnOpenPay = containerEl.querySelector('#btn-open-pay');
  const btnConfirmPay = paystackModalEl?.querySelector('#btn-confirm-pay');
  const outPay = containerEl.querySelector('#out-pay');
  const inspectPay = containerEl.querySelector('#inspect-pay');

  if (inspectPay) {
    inspectPay.addEventListener('click', () => drawer.open('05-payment-reconciler.json'));
  }

  if (btnOpenPay && paystackModalEl) {
    btnOpenPay.addEventListener('click', () => paystackModalEl.showModal());
  }

  // 2. Inventory State & Table
  const inventoryData = [
    { name: 'Wireless 4G Routers', qty: 14 },
    { name: 'SIM Activation Packs', qty: 8 },
    { name: 'Solar Power Banks', qty: 22 },
    { name: 'POS Thermal Paper Rolls', qty: 31 }
  ];

  const invTable = containerEl.querySelector('#table-inventory');
  const btnStockCron = containerEl.querySelector('#btn-run-stock-cron');
  const inspectStock = containerEl.querySelector('#inspect-stock');

  if (inspectStock) {
    inspectStock.addEventListener('click', () => drawer.open('06-low-stock-alert.json'));
  }

  function renderInventory() {
    if (!invTable) return;
    invTable.innerHTML = `
      <thead>
        <tr>
          <th>Item SKU</th>
          <th>Stock Qty</th>
          <th>Status</th>
          <th style="text-align:right;">Adjust</th>
        </tr>
      </thead>
      <tbody>
        ${inventoryData.map((item, idx) => `
          <tr>
            <td><b>${item.name}</b></td>
            <td>${item.qty} units</td>
            <td>${item.qty < 10 ? '<span class="b er">Low Stock (&lt;10)</span>' : '<span class="b ok">Healthy</span>'}</td>
            <td style="text-align:right;">
              <button class="btn btn-inv-dec" data-idx="${idx}" style="padding:2px 8px;font-size:12px;">−</button>
              <button class="btn btn-inv-inc" data-idx="${idx}" style="padding:2px 8px;font-size:12px;">+</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;

    invTable.querySelectorAll('.btn-inv-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.idx;
        inventoryData[i].qty = Math.max(0, inventoryData[i].qty - 1);
        renderInventory();
        bus.emit('log', { source: 'Warehouse DB', message: `Stock level updated: ${inventoryData[i].name} → ${inventoryData[i].qty}` });
      });
    });

    invTable.querySelectorAll('.btn-inv-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.idx;
        inventoryData[i].qty += 1;
        renderInventory();
        bus.emit('log', { source: 'Warehouse DB', message: `Stock level updated: ${inventoryData[i].name} → ${inventoryData[i].qty}` });
      });
    });
  }
  renderInventory();

  if (btnStockCron) {
    btnStockCron.addEventListener('click', async () => {
      btnStockCron.disabled = true;
      btnStockCron.textContent = 'Running 08:00 Cron…';
      try {
        const lowItems = inventoryData.filter(i => i.qty < 10);
        await engine.run('06-low-stock-alert.json', { lowItems });
      } finally {
        btnStockCron.disabled = false;
        btnStockCron.textContent = 'Run Daily Stock Cron Now';
      }
    });
  }

  // 3. Invoice Ledger & Overdue Reminders
  const ledgerData = [
    { id: 'INV-101', customer: 'Ada Global Foods', amount: 48000, status: 'Paid' },
    { id: 'INV-102', customer: 'Bello Tech Solutions', amount: 72000, status: 'Overdue' },
    { id: 'INV-103', customer: 'Kemi Styles Boutique', amount: 15500, status: 'Unpaid' },
    { id: 'INV-104', customer: 'Zenith Agritech Farms', amount: 90000, status: 'Overdue' }
  ];

  const ledTable = containerEl.querySelector('#table-ledger');
  const btnDebtScan = containerEl.querySelector('#btn-run-debt-scan');
  const inspectDebt = containerEl.querySelector('#inspect-debt');

  if (inspectDebt) {
    inspectDebt.addEventListener('click', () => drawer.open('07-debt-reminders.json'));
  }

  function renderLedger() {
    if (!ledTable) return;
    ledTable.innerHTML = `
      <thead>
        <tr>
          <th>Invoice</th>
          <th>Customer</th>
          <th>Amount (₦)</th>
          <th>Payment Status</th>
        </tr>
      </thead>
      <tbody>
        ${ledgerData.map((row, idx) => `
          <tr>
            <td><code>${row.id}</code></td>
            <td><b>${row.customer}</b></td>
            <td>₦${row.amount.toLocaleString()}</td>
            <td>
              <select class="sel-ledger-status" data-idx="${idx}" style="padding:3px 6px;font-size:12px;width:auto;">
                <option value="Paid" ${row.status === 'Paid' ? 'selected' : ''}>Paid</option>
                <option value="Unpaid" ${row.status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
                <option value="Overdue" ${row.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
              </select>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;

    ledTable.querySelectorAll('.sel-ledger-status').forEach(sel => {
      sel.addEventListener('change', () => {
        const i = +sel.dataset.idx;
        ledgerData[i].status = sel.value;
        bus.emit('log', {
          source: 'Ledger Audit',
          message: `Invoice ${ledgerData[i].id} status changed to ${sel.value}`,
          level: sel.value === 'Paid' ? 'ok' : (sel.value === 'Overdue' ? 'wn' : '')
        });
      });
    });
  }
  renderLedger();

  // Paystack modal execution
  async function completePayment() {
    if (paystackModalEl) paystackModalEl.close();
    const customer = containerEl.querySelector('#pay-customer')?.value || 'Chidi Eze';
    const amount = +containerEl.querySelector('#pay-amount')?.value || 25000;
    const invId = `INV-${105 + ledgerData.length - 4}`;

    if (outPay) outPay.textContent = `Authorizing Paystack test charge for ₦${amount.toLocaleString()}…`;

    try {
      await engine.run('05-payment-reconciler.json', {
        customer,
        amount,
        invoiceId: invId
      });

      ledgerData.push({ id: invId, customer, amount, status: 'Paid' });
      renderLedger();

      if (outPay) {
        outPay.textContent = `✓ Payment verified (charge.success). Invoice ${invId}.pdf generated & dispatched to ${customer}. Telegram onboarding link sent.`;
      }
    } catch (err) {
      if (outPay) outPay.textContent = `Payment reconciliation error: ${err.message}`;
    }
  }

  if (btnConfirmPay) {
    btnConfirmPay.addEventListener('click', completePayment);
  }

  if (btnDebtScan) {
    btnDebtScan.addEventListener('click', async () => {
      btnDebtScan.disabled = true;
      btnDebtScan.textContent = 'Scanning Overdue Ledger…';
      try {
        const overdue = ledgerData.filter(r => r.status === 'Overdue');
        await engine.run('07-debt-reminders.json', { overdue });
      } finally {
        btnDebtScan.disabled = false;
        btnDebtScan.textContent = 'Run Overdue Debt Scan';
      }
    });
  }

  return {
    async runDemoSequence() {
      await completePayment();
      if (btnStockCron) await btnStockCron.click();
      if (btnDebtScan) await btnDebtScan.click();
    }
  };
}
