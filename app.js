// ============================================================
// CONSOLE — AI coding/problem-solving assistant
// No external backend server — everything lives in DB (database.js),
// which is backed by this browser's localStorage. Calls Gemini
// (Google AI Studio) directly from the browser.
// ============================================================

const ADMIN_PASSWORD = "Pubg Mere Jan";

const DEFAULT_ADMIN_SCRIPT =
  "You are an expert coding and problem-solving assistant. Give direct, correct, " +
  "well-explained answers. When writing code, use clear naming and add comments " +
  "only where they help. Be concise but complete — no filler.";

const els = {
  loginScreen: document.getElementById('loginScreen'),
  loginForm: document.getElementById('loginForm'),
  loginPassword: document.getElementById('loginPassword'),
  loginError: document.getElementById('loginError'),
  appRoot: document.getElementById('appRoot'),
  lockBtn: document.getElementById('lockBtn'),

  thread: document.getElementById('thread'),
  emptyState: document.getElementById('emptyState'),
  form: document.getElementById('composerForm'),
  input: document.getElementById('input'),
  sendBtn: document.getElementById('sendBtn'),
  chatList: document.getElementById('chatList'),
  newChatBtn: document.getElementById('newChatBtn'),
  modelSelect: document.getElementById('modelSelect'),
  statusDot: document.getElementById('statusDot'),
  sidebar: document.getElementById('sidebar'),
  openSidebar: document.getElementById('openSidebar'),
  closeSidebar: document.getElementById('closeSidebar'),

  adminScriptBtn: document.getElementById('adminScriptBtn'),
  adminScriptModal: document.getElementById('adminScriptModal'),
  adminScriptInput: document.getElementById('adminScriptInput'),
  saveAdminScriptBtn: document.getElementById('saveAdminScriptBtn'),
  closeAdminScriptBtn: document.getElementById('closeAdminScriptBtn'),

  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  dailyLimitInput: document.getElementById('dailyLimitInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  exportDbBtn: document.getElementById('exportDbBtn'),
  importDbBtn: document.getElementById('importDbBtn'),
  importDbFile: document.getElementById('importDbFile'),
};

marked.setOptions({ breaks: true });

let activeId = null;

// ============================================================
// PASSWORD GATE
// ============================================================
els.loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (els.loginPassword.value === ADMIN_PASSWORD) {
    sessionStorage.setItem('console_unlocked', '1');
    unlockApp();
  } else {
    els.loginError.textContent = 'Galat password.';
    els.loginPassword.value = '';
  }
});

els.lockBtn.onclick = () => {
  sessionStorage.removeItem('console_unlocked');
  location.reload();
};

function unlockApp() {
  els.loginScreen.style.display = 'none';
  els.appRoot.style.display = 'flex';
  init();
}

if (sessionStorage.getItem('console_unlocked') === '1') {
  unlockApp();
}

// ============================================================
// INIT
// ============================================================
function init() {
  const convos = DB.getConversations();
  if (convos.length > 0) activeId = convos[0].id;
  renderSidebar();
  renderThread();
  updateStatus();
  if (!DB.get('apiKey')) setTimeout(openSettings, 400);
}

// ============================================================
// CONVERSATIONS (stored in DB)
// ============================================================
function getActive() {
  return DB.getConversations().find(c => c.id === activeId);
}

function newConversation() {
  const convo = { id: 'c_' + Date.now(), title: 'New chat', messages: [] };
  DB.saveConversation(convo);
  activeId = convo.id;
  renderSidebar();
  renderThread();
  els.sidebar.classList.remove('open');
}

function renderSidebar() {
  els.chatList.innerHTML = '';
  DB.getConversations().forEach(c => {
    const item = document.createElement('div');
    item.className = 'chat-item' + (c.id === activeId ? ' active' : '');
    item.innerHTML = `<span>${escapeHtml(c.title)}</span><span class="del mono">✕</span>`;
    item.querySelector('span:first-child').onclick = () => {
      activeId = c.id;
      renderSidebar();
      renderThread();
      els.sidebar.classList.remove('open');
    };
    item.querySelector('.del').onclick = (e) => {
      e.stopPropagation();
      DB.deleteConversation(c.id);
      if (activeId === c.id) {
        const remaining = DB.getConversations();
        activeId = remaining[0]?.id || null;
      }
      renderSidebar();
      renderThread();
    };
    els.chatList.appendChild(item);
  });
}

function renderThread() {
  const convo = getActive();
  els.thread.innerHTML = '';
  if (!convo || convo.messages.length === 0) {
    els.thread.appendChild(els.emptyState);
    return;
  }
  convo.messages.forEach(m => els.thread.appendChild(renderMessage(m.role, m.content)));
  els.thread.scrollTop = els.thread.scrollHeight;
}

function renderMessage(role, content) {
  const row = document.createElement('div');
  row.className = 'msg-row ' + role;
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + role;
  const tag = document.createElement('div');
  tag.className = 'avatar ' + role;
  tag.textContent = role === 'user' ? '🙂' : '🤖';
  const body = document.createElement('div');
  body.className = 'msg-body';
  if (role === 'user') {
    body.textContent = content;
  } else {
    body.innerHTML = marked.parse(content || '');
    body.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
      const btn = document.createElement('button');
      btn.className = 'copy-btn mono';
      btn.textContent = 'copy';
      btn.onclick = () => {
        navigator.clipboard.writeText(block.textContent);
        btn.textContent = 'copied';
        setTimeout(() => (btn.textContent = 'copy'), 1200);
      };
      block.parentElement.style.position = 'relative';
      block.parentElement.appendChild(btn);
    });
  }
  wrap.appendChild(tag);
  wrap.appendChild(body);
  row.appendChild(wrap);
  return row;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ============================================================
// SENDING MESSAGES
// ============================================================
els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;

  const apiKey = DB.get('apiKey');
  if (!apiKey) {
    openSettings();
    return;
  }

  const dailyLimit = DB.get('dailyLimit');
  if (dailyLimit && DB.getUsageToday() >= parseInt(dailyLimit, 10)) {
    alert(`Aaj ka limit (${dailyLimit} messages) khatam ho chuka hai. Kal phir se use kar sakte hain, ya Settings mein limit badha lein.`);
    return;
  }

  let convo = getActive();
  if (!convo) {
    newConversation();
    convo = getActive();
  }

  convo.messages.push({ role: 'user', content: text });
  if (convo.title === 'New chat') convo.title = text.slice(0, 40);
  DB.saveConversation(convo);
  renderSidebar();
  renderThread();

  els.input.value = '';
  autoGrow();
  els.sendBtn.disabled = true;

  const typingRow = document.createElement('div');
  typingRow.className = 'msg-row assistant';
  typingRow.innerHTML = `<div class="msg assistant"><div class="avatar assistant">🤖</div><div class="msg-body"><div class="typing"><i></i><i></i><i></i></div></div></div>`;
  els.thread.appendChild(typingRow);
  els.thread.scrollTop = els.thread.scrollHeight;
  const typingWrap = typingRow.firstElementChild;

  try {
    const reply = await callGemini(convo.messages);
    convo.messages.push({ role: 'assistant', content: reply });
    DB.saveConversation(convo);
    DB.incrementUsageToday();
    renderThread();
    updateStatus();
  } catch (err) {
    typingWrap.querySelector('.msg-body').innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
  } finally {
    els.sendBtn.disabled = false;
  }
});

els.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    els.form.requestSubmit();
  }
});
els.input.addEventListener('input', autoGrow);
function autoGrow() {
  els.input.style.height = 'auto';
  els.input.style.height = Math.min(els.input.scrollHeight, 160) + 'px';
}

async function callGemini(messages) {
  const apiKey = DB.get('apiKey');
  const adminScript = DB.get('adminScript') || DEFAULT_ADMIN_SCRIPT;
  const model = els.modelSelect.value;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // Gemini has no separate "system" role — it takes a systemInstruction block,
  // and conversation turns use roles "user" / "model" (not "assistant").
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: adminScript }] },
      generationConfig: { maxOutputTokens: 4096 }
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    if (res.status === 400 || res.status === 403) throw new Error('API key invalid hai ya is model tak access nahi. Settings mein check karein.');
    throw new Error(`API error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map(p => p.text || '').join('');
  return text || '(no text response)';
}

// ============================================================
// ADMIN SCRIPT (the "teach it what to do" panel)
// ============================================================
els.adminScriptBtn.onclick = () => {
  els.adminScriptInput.value = DB.get('adminScript') || DEFAULT_ADMIN_SCRIPT;
  els.adminScriptModal.style.display = 'flex';
};
els.closeAdminScriptBtn.onclick = () => els.adminScriptModal.style.display = 'none';
els.adminScriptModal.addEventListener('click', (e) => { if (e.target === els.adminScriptModal) els.adminScriptModal.style.display = 'none'; });

els.saveAdminScriptBtn.onclick = () => {
  const val = els.adminScriptInput.value.trim() || DEFAULT_ADMIN_SCRIPT;
  DB.set('adminScript', val);
  els.adminScriptModal.style.display = 'none';
};

// ============================================================
// SETTINGS
// ============================================================
function openSettings() {
  els.apiKeyInput.value = DB.get('apiKey') || '';
  els.dailyLimitInput.value = DB.get('dailyLimit') || '';
  els.settingsModal.style.display = 'flex';
}
function closeSettings() { els.settingsModal.style.display = 'none'; }

els.settingsBtn.onclick = openSettings;
els.closeSettingsBtn.onclick = closeSettings;
els.settingsModal.addEventListener('click', (e) => { if (e.target === els.settingsModal) closeSettings(); });

els.saveSettingsBtn.onclick = () => {
  // Strip anything outside printable ASCII — invisible/unicode chars (often
  // injected by browser autofill) break the fetch 'headers' object.
  const cleanKey = els.apiKeyInput.value.trim().replace(/[^\x20-\x7E]/g, '');
  const cleanLimit = els.dailyLimitInput.value.trim().replace(/[^0-9]/g, '');
  DB.set('apiKey', cleanKey);
  DB.set('dailyLimit', cleanLimit);
  updateStatus();
  closeSettings();
};

function updateStatus() {
  const apiKey = DB.get('apiKey');
  const dailyLimit = DB.get('dailyLimit');
  if (!apiKey) {
    els.statusDot.textContent = '● not connected';
    els.statusDot.classList.remove('ok');
    return;
  }
  els.statusDot.classList.add('ok');
  if (dailyLimit) {
    els.statusDot.textContent = `● ${DB.getUsageToday()}/${dailyLimit} today`;
  } else {
    els.statusDot.textContent = '● connected';
  }
}

// ---------- Database export/import ----------
els.exportDbBtn.onclick = () => DB.exportToFile();
els.importDbBtn.onclick = () => els.importDbFile.click();
els.importDbFile.addEventListener('change', () => {
  const file = els.importDbFile.files[0];
  if (!file) return;
  DB.importFromFile(file, (ok) => {
    if (ok) {
      alert('Database import ho gaya.');
      location.reload();
    } else {
      alert('Ye file valid database.json nahi hai.');
    }
  });
});

// ---------- Sidebar mobile toggle ----------
els.openSidebar.onclick = () => els.sidebar.classList.add('open');
els.closeSidebar.onclick = () => els.sidebar.classList.remove('open');

// ---------- Suggestion chips ----------
document.querySelectorAll('.suggestion-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    els.input.value = chip.dataset.text;
    els.input.focus();
    autoGrow();
  });
});

// ---------- New chat ----------
els.newChatBtn.onclick = newConversation;
