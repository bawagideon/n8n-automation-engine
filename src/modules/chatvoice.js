/**
 * Conversational & Voice AI Sandbox Module
 * Wires FAQ Chatbot Lead Scoring, Voice Screening Console, and Outbound Call Dispatch.
 */
import { bus } from '../bus.js';

export function initChatVoiceModule({ containerEl, engine, drawer }) {
  if (!containerEl) return;

  // 1. FAQ Chatbot & Lead Scorer
  const chatBox = containerEl.querySelector('#chat-messages');
  const chatInput = containerEl.querySelector('#chat-input');
  const btnChatSend = containerEl.querySelector('#btn-chat-send');
  const scoreBadge = containerEl.querySelector('#chat-lead-score');
  const statusBadge = containerEl.querySelector('#chat-lead-status');
  const inspectChat = containerEl.querySelector('#inspect-chat');

  if (inspectChat) {
    inspectChat.addEventListener('click', () => drawer.open('08-faq-chatbot-lead-score.json'));
  }

  let cumulativeScore = 0;

  async function sendChatMessage(customMsg) {
    const text = customMsg || chatInput?.value.trim();
    if (!text) return;
    if (chatInput) chatInput.value = '';

    // Render user message
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'm u';
    userMsgEl.textContent = text;
    chatBox.appendChild(userMsgEl);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
      const res = await engine.run('08-faq-chatbot-lead-score.json', { msg: text });

      // Update lead score UI
      const lower = text.toLowerCase();
      let increment = 10;
      let replyText = 'I can help with pricing, booking, voice agents, and recruitment automation.';

      if (/price|cost|₦|fee|how much/i.test(lower)) {
        replyText = 'Retainers start at ₦150k/month. Would you like a tailored automation quote?';
        increment = 35;
      } else if (/book|call|demo|schedule|interview/i.test(lower)) {
        replyText = 'Happy to book you in! Please choose a convenient slot on our Recruitment booking calendar.';
        increment = 40;
      } else if (/voice|vapi|agent|phone/i.test(lower)) {
        replyText = 'Our AI voice agents screen candidates and answer phone calls around the clock using Vapi & ElevenLabs.';
        increment = 25;
      }

      cumulativeScore = Math.min(100, cumulativeScore + increment);
      if (scoreBadge) scoreBadge.textContent = cumulativeScore;

      const leadStatus = cumulativeScore >= 70 ? 'Qualified' : (cumulativeScore >= 35 ? 'Interested' : 'New');
      if (statusBadge) {
        statusBadge.textContent = leadStatus;
        statusBadge.className = 'b ' + (leadStatus === 'Qualified' ? 'ok' : (leadStatus === 'Interested' ? 'wn' : ''));
      }

      // Render bot message
      await new Promise(r => setTimeout(r, 350));
      const botMsgEl = document.createElement('div');
      botMsgEl.className = 'm';
      botMsgEl.textContent = replyText;
      chatBox.appendChild(botMsgEl);
      chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) {
      console.error(err);
    }
  }

  if (btnChatSend) {
    btnChatSend.addEventListener('click', () => sendChatMessage());
  }
  if (chatInput) {
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') sendChatMessage();
    });
  }

  // 2. Voice Agent Console
  const visualizer = containerEl.querySelector('#voice-visualizer');
  const btnStartCall = containerEl.querySelector('#btn-start-voice-call');
  const voiceStatus = containerEl.querySelector('#voice-call-status');
  const voiceTranscript = containerEl.querySelector('#voice-call-transcript');
  const inspectVoice = containerEl.querySelector('#inspect-voice');

  if (inspectVoice) {
    inspectVoice.addEventListener('click', () => drawer.open('09-voice-screening-postcall.json'));
  }

  let callActive = false;

  async function startVoiceCall() {
    if (callActive) return;
    callActive = true;
    btnStartCall.disabled = true;
    if (voiceStatus) voiceStatus.textContent = 'Connecting WebRTC…';
    if (voiceTranscript) voiceTranscript.textContent = '';

    const runPromise = engine.run('09-voice-screening-postcall.json', {});

    await new Promise(r => setTimeout(r, 800));
    if (voiceStatus) voiceStatus.textContent = 'Agent Speaking';
    if (visualizer) visualizer.classList.add('go');

    const dialogLines = [
      'Ada (AI Recruiter): "Hi, this is Ada from Lagos Talent. Do you have two minutes for a quick technical check?"',
      'Caller (Amaka): "Sure! I applied for the Senior Automation Specialist role."',
      'Ada (AI Recruiter): "Excellent. What core automation backbones have you shipped in production?"',
      'Caller (Amaka): "I build primarily in n8n and Make.com, plus Vapi voice agents and Paystack webhook reconcilers."'
    ];

    for (const line of dialogLines) {
      if (voiceTranscript) {
        voiceTranscript.textContent += line + '\n\n';
        voiceTranscript.scrollTop = voiceTranscript.scrollHeight;
      }
      await new Promise(r => setTimeout(r, 1100));
    }

    if (visualizer) visualizer.classList.remove('go');
    if (voiceStatus) voiceStatus.textContent = 'Call Completed';

    await runPromise;

    if (voiceTranscript) {
      voiceTranscript.textContent += '─────────────────────────────────────\nAI Post-Call Assessment: Qualified. Sentiment: Highly Positive. Recommendation: Advance to Partner Interview.\n';
      voiceTranscript.scrollTop = voiceTranscript.scrollHeight;
    }

    callActive = false;
    btnStartCall.disabled = false;
  }

  if (btnStartCall) {
    btnStartCall.addEventListener('click', startVoiceCall);
  }

  // 3. Outbound Call Dispatcher
  const btnOutbound = containerEl.querySelector('#btn-request-outbound');
  const outOutbound = containerEl.querySelector('#out-outbound');
  const inspectOutbound = containerEl.querySelector('#inspect-outbound');

  if (inspectOutbound) {
    inspectOutbound.addEventListener('click', () => drawer.open('10-outbound-call.json'));
  }

  async function requestOutboundCall() {
    const phone = containerEl.querySelector('#outbound-phone')?.value.trim() || '+234 803 000 0000';
    btnOutbound.disabled = true;
    btnOutbound.textContent = 'Initiating Call…';
    if (outOutbound) outOutbound.textContent = `Dispatching call to ${phone} via Vapi telecommunications gateway…`;

    try {
      await engine.run('10-outbound-call.json', { phone });
      if (outOutbound) {
        outOutbound.textContent = `✓ Call dispatched to ${phone}. AI agent is ringing now. Full conversation telemetry will stream to the live log.`;
      }
    } catch (err) {
      if (outOutbound) outOutbound.textContent = `Outbound dispatch error: ${err.message}`;
    } finally {
      btnOutbound.disabled = false;
      btnOutbound.textContent = 'Call Me Now';
    }
  }

  if (btnOutbound) {
    btnOutbound.addEventListener('click', requestOutboundCall);
  }

  return {
    async runDemoSequence() {
      await sendChatMessage('How much does the automation retainer cost?');
      await sendChatMessage('Can I schedule a quick demo call?');
      await requestOutboundCall();
    }
  };
}
