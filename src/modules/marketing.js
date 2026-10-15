/**
 * SME Marketing & Social Media Engine Module
 * Wires AI Content Generation, Content Calendar Sync, and Email Autoresponder Drip.
 */
export function initMarketingModule({ containerEl, engine, drawer }) {
  if (!containerEl) return;

  // 1. AI Content Studio
  const topicInput = containerEl.querySelector('#content-topic');
  const toneSelect = containerEl.querySelector('#content-tone');
  const btnGenContent = containerEl.querySelector('#btn-generate-content');
  const outContent = containerEl.querySelector('#out-content-preview');
  const calTable = containerEl.querySelector('#table-calendar');
  const inspectContent = containerEl.querySelector('#inspect-content');

  if (inspectContent) {
    inspectContent.addEventListener('click', () => drawer.open('11-content-studio.json'));
  }

  const calendarEvents = [];

  function renderCalendar() {
    if (!calTable) return;
    if (calendarEvents.length === 0) {
      calTable.innerHTML = '<tr><td style="color:var(--mut);">No scheduled posts yet. Run the Content Studio above to generate posts.</td></tr>';
      return;
    }
    calTable.innerHTML = `
      <thead>
        <tr>
          <th>Scheduled Slot</th>
          <th>Channel</th>
          <th>Post Topic / Excerpt</th>
        </tr>
      </thead>
      <tbody>
        ${calendarEvents.map(ev => `
          <tr>
            <td><code>${ev.time}</code></td>
            <td><span class="b ok">${ev.platform}</span></td>
            <td><b>${ev.excerpt}</b></td>
          </tr>
        `).join('')}
      </tbody>
    `;
  }
  renderCalendar();

  async function generateContent() {
    const topic = topicInput?.value.trim() || 'How AI automation saves SMEs 10 hours a week';
    const tone = toneSelect?.value || 'confident';

    btnGenContent.disabled = true;
    btnGenContent.textContent = 'Generating Copy & Scheduling…';
    if (outContent) outContent.textContent = 'Gemini generating multi-channel drafts and optimizing for algorithm engagement…';

    try {
      await engine.run('11-content-studio.json', { topic, tone });

      const posts = [
        {
          platform: 'LinkedIn',
          text: `🚀 ${topic}\n\nMost business owners spend 40% of their day on repetitive administrative manual labor. A ${tone} approach to operations:\n\n1. Automatically route leads within 5 seconds\n2. Reconcile Paystack payments into your ledger\n3. Use AI voice agents to pre-screen inquiries\n\nAutomate the routine. Focus on high-leverage revenue.`
        },
        {
          platform: 'X (Twitter)',
          text: `1/ ${topic} 🧵\n2/ First: Eliminate manual lead copying. Connect webhooks straight to your CRM.\n3/ Second: Reconcile payments in real-time with zero human error.\n4/ The result? 10+ hours reclaimed every single week.`
        },
        {
          platform: 'Instagram',
          text: `✨ ${topic} ✨\n\nStop letting administrative bottlenecks stall your growth. Save this post for your quarterly systems audit! 📲 link in bio for free workflow audit.\n\n#automation #n8n #businessgrowth #sme`
        }
      ];

      if (outContent) {
        outContent.textContent = posts.map(p => `[${p.platform}]\n${p.text}`).join('\n\n─────────────\n\n');
      }

      posts.forEach((p, idx) => {
        calendarEvents.push({
          time: `Day +${calendarEvents.length + 1} · 09:00 AM`,
          platform: p.platform,
          excerpt: p.text.slice(0, 42) + '…'
        });
      });
      renderCalendar();
    } catch (err) {
      if (outContent) outContent.textContent = `Error: ${err.message}`;
    } finally {
      btnGenContent.disabled = false;
      btnGenContent.textContent = 'Generate & Schedule Across Channels';
    }
  }

  if (btnGenContent) {
    btnGenContent.addEventListener('click', generateContent);
  }

  // 2. Email Auto-responder & Drip Progression
  const emailInput = containerEl.querySelector('#email-body-input');
  const btnEmailReply = containerEl.querySelector('#btn-generate-email');
  const outEmail = containerEl.querySelector('#out-email-reply');
  const inspectEmail = containerEl.querySelector('#inspect-email');

  if (inspectEmail) {
    inspectEmail.addEventListener('click', () => drawer.open('12-email-autoresponder-drip.json'));
  }

  async function generateEmailReply() {
    const emailText = emailInput?.value.trim() || 'Hi, do you offer WhatsApp automation for a small pharmacy? What would it cost?';
    btnEmailReply.disabled = true;
    btnEmailReply.textContent = 'Drafting & Queuing Drip…';
    if (outEmail) outEmail.textContent = 'Generating contextual response and calculating nurture sequencing…';

    try {
      await engine.run('12-email-autoresponder-drip.json', { email: emailText });

      if (outEmail) {
        outEmail.textContent = `Subject: Re: Your Automation Inquiry\n\nHello,\n\nThank you for reaching out! Yes, we build production-grade WhatsApp and CRM automations specifically for healthcare and retail SMEs—including instant prescription reminders, inventory alerts, and order confirmations.\n\nOur starter operational retainers begin at ₦150k/month with end-to-end management. Would you like me to share a 10-minute Loom walkthrough showing our live pharmacy architecture this week?\n\nBest regards,\nLead Automation Architect\n\n[Status: Nurture Drip Step 2 of 5 armed for auto-dispatch in 48 hours]`;
      }
    } catch (err) {
      if (outEmail) outEmail.textContent = `Error: ${err.message}`;
    } finally {
      btnEmailReply.disabled = false;
      btnEmailReply.textContent = 'Draft AI Reply & Arm Drip';
    }
  }

  if (btnEmailReply) {
    btnEmailReply.addEventListener('click', generateEmailReply);
  }

  return {
    async runDemoSequence() {
      await generateContent();
      await generateEmailReply();
    }
  };
}
