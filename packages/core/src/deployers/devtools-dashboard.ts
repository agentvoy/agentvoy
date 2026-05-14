/**
 * DevTools Dashboard Generator
 *
 * Generates a single-page HTML dashboard for real-time agent tracing.
 * Served at GET /dev by the generated server.py.
 */

interface DashboardConfig {
  projectName: string;
  port: number;
}

export function generateDevtoolsDashboard(config: DashboardConfig): string {
  const { projectName, port } = config;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${projectName} — AgentVoy DevTools</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --bg: #06080f;
    --surface: #0d1220;
    --surface2: #131a2e;
    --border: rgba(108, 99, 255, 0.12);
    --border-bright: rgba(108, 99, 255, 0.3);
    --text: #e2e8f0;
    --text-dim: #64748b;
    --accent: #6C63FF;
    --accent-glow: rgba(108, 99, 255, 0.15);
    --green: #22c55e;
    --red: #ef4444;
    --yellow: #eab308;
    --blue: #3b82f6;
    --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  }
  body {
    font-family: var(--font);
    background: var(--bg);
    color: var(--text);
    height: 100vh;
    overflow: hidden;
  }

  /* ── Top Bar ── */
  .topbar {
    height: 48px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 16px;
  }
  .topbar-logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .topbar-logo svg { flex-shrink: 0; }
  .topbar-title {
    font-weight: 700;
    font-size: 14px;
    color: var(--text);
  }
  .topbar-sep {
    width: 1px;
    height: 20px;
    background: var(--border);
  }
  .topbar-project {
    font-size: 13px;
    color: var(--text-dim);
  }
  .topbar-spacer { flex: 1; }
  .topbar-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--red);
  }
  .status-dot.connected { background: var(--green); }

  /* ── Stats Bar ── */
  .statsbar {
    height: 44px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 32px;
  }
  .stat {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }
  .stat-label { color: var(--text-dim); }
  .stat-value {
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 600;
  }
  .stat-value.cost { color: var(--green); }
  .stat-value.tokens { color: var(--blue); }
  .stat-value.time { color: var(--yellow); }
  .stat-value.events { color: var(--accent); }

  /* ── Main Layout ── */
  .main {
    display: flex;
    height: calc(100vh - 92px);
  }

  /* ── Timeline Panel ── */
  .timeline-panel {
    width: 320px;
    min-width: 320px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
  }
  .timeline-header {
    padding: 12px 16px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent);
    border-bottom: 1px solid var(--border);
  }
  .timeline-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  .timeline-list::-webkit-scrollbar { width: 4px; }
  .timeline-list::-webkit-scrollbar-thumb { background: var(--border-bright); border-radius: 2px; }

  .event-card {
    padding: 10px 12px;
    border-radius: 8px;
    margin-bottom: 4px;
    cursor: pointer;
    transition: background 0.15s;
    border: 1px solid transparent;
  }
  .event-card:hover { background: var(--surface2); }
  .event-card.selected {
    background: var(--accent-glow);
    border-color: var(--border-bright);
  }
  .event-card-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .event-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    flex-shrink: 0;
  }
  .event-icon.agent_start { background: rgba(108,99,255,0.2); color: var(--accent); }
  .event-icon.llm_call { background: rgba(59,130,246,0.2); color: var(--blue); }
  .event-icon.tool_call { background: rgba(234,179,8,0.2); color: var(--yellow); }
  .event-icon.guard_check { background: rgba(34,197,94,0.2); color: var(--green); }
  .event-icon.guard_check.failed { background: rgba(239,68,68,0.2); color: var(--red); }
  .event-icon.pipeline_stage { background: rgba(168,85,247,0.2); color: #a855f7; }
  .event-icon.agent_complete { background: rgba(34,197,94,0.2); color: var(--green); }
  .event-icon.error { background: rgba(239,68,68,0.2); color: var(--red); }
  .event-name {
    font-size: 13px;
    font-weight: 500;
    flex: 1;
  }
  .event-time {
    font-size: 11px;
    font-family: var(--mono);
    color: var(--text-dim);
  }
  .event-detail {
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 4px;
    margin-left: 32px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Detail Panel ── */
  .detail-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .detail-header {
    padding: 12px 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent);
    border-bottom: 1px solid var(--border);
  }
  .detail-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  .detail-content::-webkit-scrollbar { width: 4px; }
  .detail-content::-webkit-scrollbar-thumb { background: var(--border-bright); border-radius: 2px; }

  .detail-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-dim);
    font-size: 14px;
  }
  .detail-section {
    margin-bottom: 20px;
  }
  .detail-section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
    margin-bottom: 8px;
  }
  .detail-kv {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 4px 12px;
    font-size: 13px;
  }
  .detail-kv dt { color: var(--text-dim); }
  .detail-kv dd { font-family: var(--mono); font-size: 12px; }

  .detail-text {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 16px;
    font-family: var(--mono);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 300px;
    overflow-y: auto;
  }

  /* ── Pipeline Viz ── */
  .pipeline-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .pipeline-node {
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-dim);
    transition: all 0.3s;
  }
  .pipeline-node.active {
    background: var(--accent-glow);
    border-color: var(--accent);
    color: var(--accent);
  }
  .pipeline-node.done {
    background: rgba(34,197,94,0.1);
    border-color: rgba(34,197,94,0.3);
    color: var(--green);
  }
  .pipeline-arrow {
    color: var(--text-dim);
    font-size: 12px;
  }

  /* ── Welcome State ── */
  .welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    gap: 16px;
  }
  .welcome-icon { font-size: 48px; opacity: 0.3; }
  .welcome h2 { font-size: 18px; font-weight: 600; }
  .welcome p { color: var(--text-dim); font-size: 14px; max-width: 400px; }

  /* ── Animations ── */
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .pulse { animation: pulse 2s infinite; }
  @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  .slide-in { animation: slideIn 0.2s ease-out; }
</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body>

<!-- Top Bar -->
<div class="topbar">
  <div class="topbar-logo">
    <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
      <line x1="50" y1="8" x2="50" y2="22" stroke="#6C63FF" stroke-width="4" stroke-linecap="round"/>
      <circle cx="50" cy="6" r="4" fill="#6C63FF"/>
      <rect x="22" y="22" width="56" height="42" rx="12" fill="#131a2e" stroke="#6C63FF" stroke-width="3"/>
      <circle cx="38" cy="40" r="5" fill="#6C63FF"/>
      <circle cx="62" cy="40" r="5" fill="#6C63FF"/>
      <rect x="36" y="52" width="28" height="3" rx="1.5" fill="#6C63FF" opacity="0.6"/>
    </svg>
    <span class="topbar-title">AgentVoy DevTools</span>
  </div>
  <div class="topbar-sep"></div>
  <span class="topbar-project">${projectName}</span>
  <div class="topbar-spacer"></div>
  <div class="topbar-status">
    <div class="status-dot" id="statusDot"></div>
    <span id="statusText">Connecting...</span>
  </div>
</div>

<!-- Stats Bar -->
<div class="statsbar">
  <div class="stat">
    <span class="stat-label">Cost</span>
    <span class="stat-value cost" id="statCost">$0.000</span>
  </div>
  <div class="stat">
    <span class="stat-label">Tokens</span>
    <span class="stat-value tokens" id="statTokens">0</span>
  </div>
  <div class="stat">
    <span class="stat-label">Time</span>
    <span class="stat-value time" id="statTime">0.0s</span>
  </div>
  <div class="stat">
    <span class="stat-label">Events</span>
    <span class="stat-value events" id="statEvents">0</span>
  </div>
  <div class="stat">
    <span class="stat-label">Session</span>
    <span class="stat-value" id="statSession" style="color: var(--text-dim)">—</span>
  </div>
</div>

<!-- Pipeline Bar (hidden until pipeline events arrive) -->
<div class="pipeline-bar" id="pipelineBar" style="display:none"></div>

<!-- Main -->
<div class="main">
  <!-- Timeline -->
  <div class="timeline-panel">
    <div class="timeline-header">Event Timeline</div>
    <div class="timeline-list" id="timeline">
      <div class="welcome">
        <div class="welcome-icon">&#x1F50D;</div>
        <h2>Waiting for events</h2>
        <p>Send a request to your agent and watch the trace appear here in real-time.</p>
        <p style="font-family: var(--mono); font-size: 12px; color: var(--accent); margin-top: 8px;">
          POST http://localhost:${port}/run
        </p>
      </div>
    </div>
  </div>

  <!-- Detail -->
  <div class="detail-panel">
    <div class="detail-header">Event Detail</div>
    <div class="detail-content" id="detailContent">
      <div class="detail-empty">Select an event to inspect</div>
    </div>
  </div>
</div>

<script>
const EVENT_ICONS = {
  agent_start: '\\u25B6',
  llm_call: '\\u2728',
  tool_call: '\\u2699',
  guard_check: '\\u26A1',
  pipeline_stage: '\\u27A1',
  agent_complete: '\\u2705',
  error: '\\u274C',
};

const EVENT_LABELS = {
  agent_start: 'Agent Start',
  llm_call: 'LLM Call',
  tool_call: 'Tool Call',
  guard_check: 'Guard Check',
  pipeline_stage: 'Pipeline Stage',
  agent_complete: 'Complete',
  error: 'Error',
};

let events = [];
let selectedIdx = -1;
let sessionStart = 0;
let ws = null;
let pipelineStages = {};
let timerInterval = null;

function connect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(proto + '//' + location.host + '/ws/trace');

  ws.onopen = () => {
    document.getElementById('statusDot').className = 'status-dot connected';
    document.getElementById('statusText').textContent = 'Connected';
  };

  ws.onclose = () => {
    document.getElementById('statusDot').className = 'status-dot';
    document.getElementById('statusText').textContent = 'Disconnected';
    setTimeout(connect, 2000);
  };

  ws.onmessage = (msg) => {
    const event = JSON.parse(msg.data);
    handleEvent(event);
  };
}

function handleEvent(event) {
  events.push(event);

  if (event.type === 'agent_start') {
    sessionStart = event.timestamp;
    events = [event];
    selectedIdx = -1;
    pipelineStages = {};
    document.getElementById('pipelineBar').style.display = 'none';
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 100);
  }

  if (event.type === 'agent_complete') {
    clearInterval(timerInterval);
  }

  if (event.type === 'pipeline_stage') {
    pipelineStages[event.data.stage] = event.data.status;
    renderPipeline(event.data.total);
  }

  updateStats(event);
  renderTimeline();

  // Auto-select latest event
  selectedIdx = events.length - 1;
  renderDetail(events[selectedIdx]);
}

function updateStats(event) {
  document.getElementById('statEvents').textContent = events.length;
  if (event.data.total_cost !== undefined) {
    document.getElementById('statCost').textContent = '$' + event.data.total_cost.toFixed(4);
  }
  if (event.type === 'llm_call') {
    const totalIn = events.filter(e => e.type === 'llm_call').reduce((s, e) => s + (e.data.tokens_in || 0), 0);
    const totalOut = events.filter(e => e.type === 'llm_call').reduce((s, e) => s + (e.data.tokens_out || 0), 0);
    document.getElementById('statTokens').textContent = (totalIn + totalOut).toLocaleString();
  }
  if (event.data.total_tokens_in !== undefined) {
    document.getElementById('statTokens').textContent =
      (event.data.total_tokens_in + event.data.total_tokens_out).toLocaleString();
  }
  if (event.data.session_id) {
    document.getElementById('statSession').textContent = event.data.session_id || '';
  }
}

function updateTimer() {
  if (!sessionStart) return;
  const elapsed = (Date.now() / 1000) - sessionStart;
  document.getElementById('statTime').textContent = elapsed.toFixed(1) + 's';
}

function renderTimeline() {
  const container = document.getElementById('timeline');
  container.innerHTML = '';
  events.forEach((event, idx) => {
    const card = document.createElement('div');
    card.className = 'event-card slide-in' + (idx === selectedIdx ? ' selected' : '');
    card.onclick = () => { selectedIdx = idx; renderTimeline(); renderDetail(event); };

    const iconClass = event.type + (event.type === 'guard_check' && !event.data.passed ? ' failed' : '');
    const elapsed = sessionStart ? ((event.timestamp - sessionStart) * 1000).toFixed(0) + 'ms' : '';
    const detail = getEventDetail(event);

    card.innerHTML =
      '<div class="event-card-top">' +
        '<div class="event-icon ' + iconClass + '">' + (EVENT_ICONS[event.type] || '?') + '</div>' +
        '<span class="event-name">' + (EVENT_LABELS[event.type] || event.type) + '</span>' +
        '<span class="event-time">+' + elapsed + '</span>' +
      '</div>' +
      (detail ? '<div class="event-detail">' + escHtml(detail) + '</div>' : '');

    container.appendChild(card);
  });
  container.scrollTop = container.scrollHeight;
}

function getEventDetail(event) {
  const d = event.data;
  switch (event.type) {
    case 'agent_start': return d.model ? d.agent + ' \\u2022 ' + d.model : d.agent;
    case 'llm_call': return d.model + ' \\u2022 ' + (d.tokens_in||0) + ' in / ' + (d.tokens_out||0) + ' out';
    case 'tool_call': return d.tool + '(' + (d.input || '') + ')';
    case 'guard_check': return d.check_type + ': ' + (d.passed ? 'passed' : 'BLOCKED');
    case 'pipeline_stage': return d.stage + ' (' + d.status + ')';
    case 'agent_complete': return '$' + (d.total_cost||0).toFixed(4) + ' \\u2022 ' + (d.total_latency||0) + 's';
    case 'error': return d.message;
    default: return '';
  }
}

function renderDetail(event) {
  const container = document.getElementById('detailContent');
  if (!event) {
    container.innerHTML = '<div class="detail-empty">Select an event to inspect</div>';
    return;
  }

  let html = '';
  const d = event.data;

  // Meta section
  html += '<div class="detail-section"><div class="detail-section-title">Event</div>';
  html += '<dl class="detail-kv">';
  html += '<dt>Type</dt><dd>' + (EVENT_LABELS[event.type] || event.type) + '</dd>';
  html += '<dt>Time</dt><dd>+' + ((event.timestamp - sessionStart) * 1000).toFixed(0) + 'ms</dd>';
  html += '<dt>ID</dt><dd>' + event.id + '</dd>';
  html += '</dl></div>';

  // Type-specific sections
  switch (event.type) {
    case 'agent_start':
      html += section('Agent', kv({Agent: d.agent, Model: d.model || '—'}));
      html += section('Prompt', textBlock(d.prompt));
      break;
    case 'llm_call':
      html += section('Model', kv({
        Model: d.model,
        'Tokens In': d.tokens_in,
        'Tokens Out': d.tokens_out,
        Cost: '$' + (d.cost||0).toFixed(6),
        Latency: (d.latency||0).toFixed(2) + 's',
      }));
      if (d.prompt_preview) html += section('Prompt Preview', textBlock(d.prompt_preview));
      if (d.response_preview) html += section('Response Preview', textBlock(d.response_preview));
      break;
    case 'tool_call':
      html += section('Tool', kv({
        Name: d.tool,
        Latency: (d.latency||0).toFixed(2) + 's',
      }));
      if (d.input) html += section('Input', textBlock(d.input));
      if (d.output) html += section('Output', textBlock(d.output));
      break;
    case 'guard_check':
      html += section('Guardrail', kv({
        Type: d.check_type,
        Result: d.passed ? '\\u2705 Passed' : '\\u274C Blocked',
        Details: d.details || '—',
      }));
      break;
    case 'pipeline_stage':
      html += section('Pipeline', kv({
        Stage: d.stage,
        Index: (d.index + 1) + ' of ' + d.total,
        Status: d.status,
      }));
      break;
    case 'agent_complete':
      html += section('Summary', kv({
        Agent: d.agent,
        Latency: (d.total_latency||0) + 's',
        Cost: '$' + (d.total_cost||0).toFixed(4),
        'Tokens In': d.total_tokens_in,
        'Tokens Out': d.total_tokens_out,
      }));
      if (d.result_preview) html += section('Result', textBlock(d.result_preview));
      break;
    case 'error':
      html += section('Error', textBlock(d.message));
      break;
  }

  container.innerHTML = html;
}

function renderPipeline(total) {
  const bar = document.getElementById('pipelineBar');
  bar.style.display = 'flex';
  const stages = Object.keys(pipelineStages);
  bar.innerHTML = stages.map((name, i) => {
    const status = pipelineStages[name];
    const cls = status === 'done' ? 'done' : status === 'running' ? 'active' : '';
    return '<div class="pipeline-node ' + cls + '">' + name + '</div>' +
      (i < stages.length - 1 ? '<span class="pipeline-arrow">\\u2192</span>' : '');
  }).join('');
}

function section(title, content) {
  return '<div class="detail-section"><div class="detail-section-title">' + title + '</div>' + content + '</div>';
}
function kv(obj) {
  let html = '<dl class="detail-kv">';
  for (const [k, v] of Object.entries(obj)) {
    html += '<dt>' + k + '</dt><dd>' + escHtml(String(v ?? '')) + '</dd>';
  }
  return html + '</dl>';
}
function textBlock(text) {
  return '<div class="detail-text">' + escHtml(text || '') + '</div>';
}
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Start
connect();
</script>
</body>
</html>`;
}
