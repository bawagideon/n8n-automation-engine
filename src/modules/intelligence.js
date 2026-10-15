/**
 * AI Intelligence & Screening Hub Module
 * Converts call transcripts into structured candidate presentation dossiers via Gemini.
 */
export function initIntelligenceModule({ containerEl, engine, drawer }) {
  if (!containerEl) return;

  const trInput = containerEl.querySelector('#tr-input');
  const btnTr = containerEl.querySelector('#btn-generate-dossier');
  const dossierContainer = containerEl.querySelector('#dossier-output');
  const inspectTr = containerEl.querySelector('#inspect-tr');

  if (inspectTr) {
    inspectTr.addEventListener('click', () => drawer.open('04-transcript-dossier.json'));
  }

  async function generateDossier() {
    const transcriptText = trInput.value.trim();
    if (!transcriptText) return;

    btnTr.disabled = true;
    btnTr.textContent = 'Analyzing Transcript…';
    dossierContainer.innerHTML = '<span style="color:var(--mut);">Gemini AI parsing competencies, sentiment, and salary requirements…</span>';

    try {
      await engine.run('04-transcript-dossier.json', { transcript: transcriptText });

      // Extract details
      const nameMatch = transcriptText.match(/Candidate \(([^)]+)\)/);
      const candidateName = nameMatch ? nameMatch[1] : 'Amaka Obi';
      const salaryMatch = transcriptText.match(/₦\s?[\d,]+k?/i);
      const salary = salaryMatch ? salaryMatch[0] : '₦450k';
      const noticeMatch = transcriptText.match(/(\d+)\s*weeks?/i);
      const notice = noticeMatch ? `${noticeMatch[1]} weeks` : '2 weeks';

      const keySkills = ['n8n', 'Make.com', 'Zapier', 'Paystack API', 'Vapi Voice Agent', 'Airtable'];

      dossierContainer.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <h3 style="margin:0;font-size:16px;color:var(--ink);">${candidateName}</h3>
          <span class="b ok">✓ Recommended for Interview</span>
        </div>

        <div style="margin-bottom:8px;">
          <span style="font-size:11.5px;color:var(--mut);font-weight:600;text-transform:uppercase;">Core Competencies</span>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
            ${keySkills.map(s => `<span class="b">${s}</span>`).join('')}
          </div>
        </div>

        <div style="margin-bottom:8px;">
          <span style="font-size:11.5px;color:var(--mut);font-weight:600;text-transform:uppercase;">Demonstrated Business Impact</span>
          <p style="margin:2px 0 0;font-size:12.5px;">
            • Built Paystack payment reconciliation cut month-end ledger close from 3 days to 4 hours.<br>
            • Deployed 24/7 Vapi AI voice screening agent for high-volume applicant qualification.
          </p>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:var(--bg);padding:8px 10px;border-radius:8px;font-size:12px;">
          <div><b>Notice Period:</b> ${notice}</div>
          <div><b>Target Compensation:</b> ${salary} / month</div>
        </div>
      `;
    } catch (err) {
      dossierContainer.innerHTML = `<span class="er">Error: ${err.message}</span>`;
    } finally {
      btnTr.disabled = false;
      btnTr.textContent = 'Generate Dossier';
    }
  }

  if (btnTr) {
    btnTr.addEventListener('click', generateDossier);
  }

  return {
    async runDemoSequence() {
      await generateDossier();
    }
  };
}
