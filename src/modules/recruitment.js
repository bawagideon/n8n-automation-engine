/**
 * Recruitment Operations Module
 * Wires Corporate Inquiry, Resume Dropzone / Parser, and Interview Booking to the Engine.
 */
import { bus } from '../bus.js';

export function initRecruitmentModule({ containerEl, engine, drawer }) {
  if (!containerEl) return;

  // Helper string hash for deterministic mock variations
  const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

  // 1. Corporate Inquiry
  const btnInq = containerEl.querySelector('#btn-inq');
  const outInq = containerEl.querySelector('#out-inq');
  const inspectInq = containerEl.querySelector('#inspect-inq');

  if (inspectInq) {
    inspectInq.addEventListener('click', () => drawer.open('01-lead-router.json'));
  }

  if (btnInq) {
    btnInq.addEventListener('click', async () => {
      const company = containerEl.querySelector('#inq-co').value.trim() || 'Lagos Logistics Ltd';
      const role = containerEl.querySelector('#inq-ro').value.trim() || 'Head of Operations';
      const budget = +containerEl.querySelector('#inq-bu').value || 120000;
      const timeline = containerEl.querySelector('#inq-tl').value;

      btnInq.disabled = true;
      btnInq.textContent = 'Processing…';
      outInq.textContent = '';

      try {
        await engine.run('01-lead-router.json', {
          company,
          role,
          budget,
          timeline
        });

        const isPriority = budget >= 50000;
        outInq.textContent = isPriority
          ? `✓ Priority Routing (₦${budget.toLocaleString()} ≥ ₦50k): Senior recruiter alerted via Slack #priority-leads. Confirmation auto-responder dispatched to ${company}.`
          : `✓ Nurture Routing (₦${budget.toLocaleString()} < ₦50k): Added to automated nurture drip sequence. Confirmation email sent with self-service booking options.`;
      } catch (err) {
        outInq.textContent = `Error: ${err.message}`;
      } finally {
        btnInq.disabled = false;
        btnInq.textContent = 'Send Inquiry';
      }
    });
  }

  // 2. Resume Parser
  const dropzone = containerEl.querySelector('#cv-drop');
  const fileInput = containerEl.querySelector('#cv-fi');
  const sampleCvBtn = containerEl.querySelector('#btn-sample-cv');
  const outCv = containerEl.querySelector('#out-cv');
  const inspectCv = containerEl.querySelector('#inspect-cv');

  if (inspectCv) {
    inspectCv.addEventListener('click', () => drawer.open('02-cv-scorer.json'));
  }

  async function processCV(fileName, fileSize) {
    if (outCv) outCv.innerHTML = '<span style="color:var(--mut);">AI multimodal vision analyzing CV layout and skills…</span>';

    try {
      const res = await engine.run('02-cv-scorer.json', {
        fileName,
        fileSize
      });

      const score = res.liveResult?.score ?? (72 + (hash(fileName + fileSize) % 24));
      const allSkills = ['n8n', 'Make.com', 'Zapier', 'Paystack API', 'Webhooks', 'Airtable', 'Gemini Vision', 'Vapi'];
      const skills = allSkills.filter((_, i) => (hash(fileName) >> i) & 1).slice(0, 4);
      if (skills.length < 2) skills.push('n8n', 'Webhooks');

      const circ = 2 * Math.PI * 34;
      const strokeDash = `${(circ * score) / 100} ${circ}`;

      outCv.innerHTML = `
        <svg class="ring" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r="34" fill="none" stroke="var(--ln)" stroke-width="8" />
          <circle cx="42" cy="42" r="34" fill="none" stroke="var(--ac)" stroke-width="8"
                  stroke-linecap="round" stroke-dasharray="${strokeDash}" transform="rotate(-90 42 42)" />
          <text x="42" y="49" text-anchor="middle">${score}</text>
        </svg>
        <div class="out" style="display:block;flex:1;margin:0;font:12px 'JetBrains Mono',monospace;">
{
  "candidate": "${fileName.replace(/[-_.]/g, ' ').replace(/(pdf|docx)$/i, '').trim()}",
  "match_score": ${score},
  "verified_skills": ${JSON.stringify(skills)},
  "ats_status": "Logged to Sheet Row 42"
}
        </div>
      `;
    } catch (err) {
      outCv.innerHTML = `<span class="er">Parsing failed: ${err.message}</span>`;
    }
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', e => { if (e.key === 'Enter') fileInput.click(); });
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('h'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('h'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('h');
      const file = e.dataTransfer.files[0];
      if (file) processCV(file.name, file.size);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) processCV(fileInput.files[0].name, fileInput.files[0].size);
    });
  }

  if (sampleCvBtn) {
    sampleCvBtn.addEventListener('click', () => {
      processCV('Amaka_Obi_Senior_Automation_CV.pdf', 184000);
    });
  }

  // 3. Interview Booking
  const slotsContainer = containerEl.querySelector('#booking-slots');
  const outBooking = containerEl.querySelector('#out-booking');
  const inspectBooking = containerEl.querySelector('#inspect-booking');

  if (inspectBooking) {
    inspectBooking.addEventListener('click', () => drawer.open('03-interview-booking.json'));
  }

  const SLOTS = ['Mon 10:00', 'Mon 14:00', 'Tue 09:30', 'Tue 15:00', 'Wed 11:00', 'Thu 16:30'];

  if (slotsContainer) {
    slotsContainer.innerHTML = SLOTS.map(slot => `
      <button class="btn-slot" data-slot="${slot}">${slot}</button>
    `).join('');

    slotsContainer.querySelectorAll('.btn-slot').forEach(btn => {
      btn.addEventListener('click', async () => {
        slotsContainer.querySelectorAll('.btn-slot').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        const slot = btn.dataset.slot;

        outBooking.textContent = `Locking calendar slot: ${slot}…`;
        try {
          await engine.run('03-interview-booking.json', { slot });
          outBooking.textContent = `✓ Confirmed for ${slot}. Google Meet invite generated; automated Termii SMS queued for T-24h and WhatsApp reminder for T-1h.`;
        } catch (err) {
          outBooking.textContent = `Booking error: ${err.message}`;
        }
      });
    });
  }

  return {
    async runDemoSequence() {
      if (btnInq) await btnInq.click();
      await processCV('Amaka_Obi_CV.pdf', 184000);
      const slotBtn = slotsContainer?.querySelector('.btn-slot');
      if (slotBtn) await slotBtn.click();
    }
  };
}
