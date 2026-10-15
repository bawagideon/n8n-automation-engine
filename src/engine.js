/**
 * AutoOps Workflow Engine
 * Validates, plans, executes, and visualizes n8n workflows with Story, Flow, and Blueprint views.
 */
import { bus } from './bus.js';

export const GLOSSARY = {
  webhook: 'A dedicated web address that automatically triggers the workflow the instant an external system sends data to it.',
  API: 'Application Programming Interface: A standardized protocol allowing different software systems to communicate and exchange data.',
  CRM: 'Customer Relationship Management: The central software platform where client records, deals, and communication histories are maintained.',
  trigger: 'The initializing event or rule (e.g. form submission, webhook, schedule timer) that sets an automation in motion.',
  JSON: 'JavaScript Object Notation: A lightweight, human-readable data format universally used by web APIs.',
  nurture: 'An automated, structured sequence of valuable messages sent over time to guide potential clients towards a purchase.',
  ATS: 'Applicant Tracking System: Software used by recruiters to organize candidates, resumes, and interview stages.',
  WebRTC: 'Web Real-Time Communication: A standard enabling direct, browser-to-browser voice and video calling without plugins.',
  cron: 'A time-based job scheduler that automatically runs commands or scripts at fixed intervals or times.'
};

export const KIND_ICONS = {
  webhook: '⚡',
  scheduleTrigger: '⏰',
  if: '🔀',
  httpRequest: '🌐',
  googleSheets: '📊',
  gmail: '✉️',
  slack: '💬',
  telegram: '✈️',
  respondToWebhook: '↩️',
  noOp: '⏸️',
  code: '💻',
  airtable: '📑',
  openAi: '🤖',
  calCom: '📅'
};

export function getIcon(nodeType) {
  const short = (nodeType || '').split('.').pop();
  return KIND_ICONS[short] || '⚙️';
}

export function escapeHtml(str) {
  return String(str || '').replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[c]));
}

export function annotateGlossary(text) {
  const escaped = escapeHtml(text);
  const terms = Object.keys(GLOSSARY).join('|');
  const regex = new RegExp(`\\b(${terms})\\b`, 'gi');
  return escaped.replace(regex, match => {
    const key = Object.keys(GLOSSARY).find(k => k.toLowerCase() === match.toLowerCase());
    const desc = GLOSSARY[key] || '';
    return `<abbr tabindex="0" title="${escapeHtml(desc)}">${match}</abbr>`;
  });
}

export function syntaxHighlight(obj) {
  const jsonStr = escapeHtml(JSON.stringify(obj, null, 2));
  return jsonStr.replace(
    /(&quot;(?:(?!&quot;).)*&quot;)(:)?|\b(true|false|null)\b|-?\b\d+\.?\d*\b/g,
    (match, str, colon) => {
      if (str) {
        return colon ? `<i class="k">${str}</i>:` : `<i class="s">${str}</i>`;
      }
      return `<i class="n">${match}</i>`;
    }
  );
}

export function stripMeta(workflow) {
  const clone = JSON.parse(JSON.stringify(workflow));
  if (clone.meta && clone.meta.autoops) {
    delete clone.meta.autoops;
    if (Object.keys(clone.meta).length === 0) {
      delete clone.meta;
    }
  }
  return clone;
}

export class Engine {
  constructor() {
    this.workflows = new Map();
    this.faultInjected = false;
    this.liveMode = false;
    this.baseUrl = '';
    this.running = false;
  }

  setFaultInjection(enabled) {
    this.faultInjected = !!enabled;
    bus.emit('config:fault', { faultInjected: this.faultInjected });
  }

  setLiveConfig(baseUrl, liveMode) {
    this.baseUrl = (baseUrl || '').trim().replace(/\/$/, '');
    this.liveMode = !!liveMode;
    bus.emit('config:live', { baseUrl: this.baseUrl, liveMode: this.liveMode });
  }

  validate(wf) {
    const errors = [];
    if (!wf || typeof wf !== 'object') {
      return ['The workflow is empty or not a valid JSON object.'];
    }
    if (!Array.isArray(wf.nodes) || wf.nodes.length === 0) {
      errors.push('The workflow has no "nodes" array. Please export a valid workflow from n8n.');
    }
    if (!wf.connections || typeof wf.connections !== 'object') {
      errors.push('The workflow is missing a "connections" object linking the nodes.');
    }
    const plain = wf?.meta?.autoops?.plain;
    if (!plain || !plain.what || !plain.when || !plain.result) {
      errors.push('Workflow missing "meta.autoops.plain" with "what", "when", and "result" fields for non-technical users.');
    }
    (wf?.nodes || []).forEach((n, idx) => {
      if (!n.name || !n.type) {
        errors.push(`Node #${idx + 1} must specify both a "name" and a "type".`);
      } else if (!n.notes) {
        errors.push(`Node "${n.name}" is missing a plain-English "notes" description.`);
      }
    });
    return errors;
  }

  plan(wf) {
    const nodeMap = Object.fromEntries(wf.nodes.map(n => [n.name, n]));
    const targetSet = new Set(
      wf.nodes.flatMap(n => Object.values(wf.connections[n.name] || {}).flat(2).map(c => c.node))
    );
    const take = wf?.meta?.autoops?.take || {};
    const seq = [];
    
    // Trigger is node with no incoming connections, or first node
    const trigger = wf.nodes.find(n => !targetSet.has(n.name)) || wf.nodes[0];
    const queue = trigger ? [trigger.name] : [];

    while (queue.length > 0) {
      const currentName = queue.shift();
      if (seq.includes(currentName) || !nodeMap[currentName]) continue;
      seq.push(currentName);

      const nodeObj = nodeMap[currentName];
      const mainOutputs = wf.connections[currentName]?.main || [];

      if (nodeObj.type && (nodeObj.type.endsWith('.if') || nodeObj.type.includes('if'))) {
        const branchIndex = take[currentName] ?? 0;
        const chosenBranch = mainOutputs[branchIndex] || [];
        chosenBranch.forEach(conn => queue.push(conn.node));
      } else {
        mainOutputs.forEach(branch => branch.forEach(conn => queue.push(conn.node)));
      }
    }

    const allNames = wf.nodes.map(n => n.name);
    const skip = allNames.filter(name => !seq.includes(name));
    return { seq, skip, trigger: trigger?.name };
  }

  renderFlow(wf) {
    const depths = {};
    const counts = {};
    const positions = {};

    wf.nodes.forEach(n => (depths[n.name] = 0));
    for (let i = 0; i < 10; i++) {
      wf.nodes.forEach(n => {
        const outList = Object.values(wf.connections[n.name] || {}).flat(2);
        outList.forEach(c => {
          depths[c.node] = Math.max(depths[c.node] || 0, (depths[n.name] || 0) + 1);
        });
      });
    }

    wf.nodes.forEach(n => {
      const d = depths[n.name] || 0;
      counts[d] = counts[d] || 0;
      positions[n.name] = [16 + d * 180, 16 + (counts[d]++) * 72];
    });

    const maxW = Math.max(...Object.values(positions).map(p => p[0])) + 160;
    const maxH = Math.max(...Object.values(positions).map(p => p[1])) + 74;

    const paths = wf.nodes.flatMap(n => {
      const conns = Object.values(wf.connections[n.name] || {}).flat(2);
      return conns.map(c => {
        const [x1, y1] = positions[n.name];
        const [x2, y2] = positions[c.node] || [x1 + 180, y1];
        const startX = x1 + 144;
        const startY = y1 + 24;
        const endX = x2;
        const endY = y2 + 24;
        const cp1X = startX + 22;
        const cp2X = endX - 22;
        return `<path class="ed" d="M${startX},${startY} C${cp1X},${startY} ${cp2X},${endY} ${endX},${endY}" />`;
      });
    }).join('');

    const nodesSvg = wf.nodes.map(n => {
      const [x, y] = positions[n.name];
      const icon = getIcon(n.type);
      const label = n.name.length > 18 ? n.name.slice(0, 17) + '…' : n.name;
      const typeLabel = n.type.split('.').pop();
      return `
        <g class="nd" data-n="${escapeHtml(n.name)}">
          <rect x="${x}" y="${y}" width="144" height="48" rx="8" />
          <text x="${x + 10}" y="${y + 20}">${icon} ${escapeHtml(label)}</text>
          <text x="${x + 10}" y="${y + 37}" fill="var(--mut)" style="fill:var(--mut)">${escapeHtml(typeLabel)}</text>
        </g>
      `;
    }).join('');

    return `
      <div style="overflow-x:auto;padding:8px 0;">
        <svg viewBox="0 0 ${maxW} ${maxH}" width="${maxW}" height="${maxH}" role="img" aria-label="${escapeHtml(wf.name)} visual flow">
          ${paths}
          ${nodesSvg}
        </svg>
      </div>
    `;
  }

  register(key, workflow) {
    const errs = this.validate(workflow);
    if (errs.length > 0) {
      return { success: false, errors: errs };
    }
    const planned = this.plan(workflow);
    this.workflows.set(key, { workflow, planned, key });
    return { success: true, key, workflow };
  }

  get(key) {
    return this.workflows.get(key);
  }

  async run(keyOrWorkflow, payload = {}, options = {}) {
    let item;
    if (typeof keyOrWorkflow === 'string') {
      item = this.workflows.get(keyOrWorkflow);
      if (!item) {
        throw new Error(`Workflow "${keyOrWorkflow}" not found in engine registry.`);
      }
    } else {
      const tempKey = 'custom_' + Date.now();
      const res = this.register(tempKey, keyOrWorkflow);
      if (!res.success) {
        throw new Error(`Invalid workflow: ${res.errors.join('; ')}`);
      }
      item = this.workflows.get(tempKey);
    }

    const { workflow, planned, key } = item;
    const runId = 'run_' + Math.random().toString(36).substring(2, 9);
    const covers = workflow.meta?.autoops?.covers || [];
    const samples = workflow.meta?.autoops?.sample || {};
    const liveKey = workflow.meta?.autoops?.live?.key || key;

    const tStart = Date.now();
    bus.emit('run:start', {
      id: key,
      runId,
      name: workflow.name,
      steps: planned.seq,
      skipped: planned.skip,
      live: this.liveMode
    });

    let liveResult = null;

    // If live mode is enabled and a base URL or proxy is configured, send the initial POST
    if (this.liveMode) {
      try {
        const targetUrl = this.baseUrl
          ? `${this.baseUrl}/webhook/${liveKey}`
          : `/api/hook/${liveKey}`;
        
        bus.emit('log', {
          source: 'n8n Live',
          message: `Dispatching webhook to: ${targetUrl}`,
          level: 'wn'
        });

        const resp = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'autoops-site',
            ts: Date.now(),
            ...payload
          })
        });

        if (resp.ok) {
          liveResult = await resp.json();
          bus.emit('log', {
            source: 'n8n Live',
            message: `Response 200 OK: ${JSON.stringify(liveResult).slice(0, 100)}…`,
            level: 'ok'
          });
        } else {
          bus.emit('log', {
            source: 'n8n Live',
            message: `Webhook returned HTTP ${resp.status}. Falling back to simulation replay.`,
            level: 'wn'
          });
        }
      } catch (err) {
        bus.emit('log', {
          source: 'n8n Live',
          message: `Network/CORS error (${err.message}). Replaying with simulated telemetry.`,
          level: 'wn'
        });
      }
    }

    // Step through the planned sequence
    for (let i = 0; i < planned.seq.length; i++) {
      const nodeName = planned.seq[i];
      bus.emit('node:start', { runId, node: nodeName, index: i, total: planned.seq.length });

      // Fault injection simulation on node index 1 (2nd step)
      if (i === 1 && this.faultInjected) {
        bus.emit('run:fault', {
          runId,
          node: nodeName,
          error: 'HTTP 429 Too Many Requests (Rate limit exceeded)'
        });
        bus.emit('log', {
          source: nodeName,
          message: '429 Rate limit encountered on upstream API',
          level: 'er'
        });
        await new Promise(r => setTimeout(r, 900));
        bus.emit('log', {
          source: 'Error Handler',
          message: 'Exponential backoff triggered (2.0s delay) → Restored connection',
          level: 'wn'
        });
        bus.emit('run:fault:recovered', { runId, node: nodeName });
        // Fire error recovery tag
        bus.emit('automation:covered', { code: 'err' });
      }

      await new Promise(r => setTimeout(r, options.delay || 550));

      const stepSummary = (liveResult && liveResult.steps && liveResult.steps[i]?.summary) ||
                          samples[nodeName] ||
                          `Processed ${nodeName} successfully.`;

      bus.emit('node:done', {
        runId,
        node: nodeName,
        summary: stepSummary,
        ms: Date.now() - tStart
      });

      bus.emit('log', {
        source: nodeName,
        message: stepSummary,
        level: 'ok'
      });
    }

    // Mark skipped nodes
    planned.skip.forEach(nodeName => {
      bus.emit('node:skipped', { runId, node: nodeName });
    });

    // Mark covered automation tags
    covers.forEach(c => bus.emit('automation:covered', { code: c }));

    const duration = Date.now() - tStart;
    bus.emit('run:done', {
      runId,
      id: key,
      ms: duration,
      covers,
      result: liveResult
    });

    return { runId, duration, liveResult };
  }
}

export const engine = new Engine();
