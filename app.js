// ============================================================
// CONSOLE — AI coding/problem-solving assistant
// Backend: Firebase (Auth + Firestore) stores your instructions,
// settings, and chat history. Calls Gemini (Google AI Studio) directly.
// ============================================================

const DEFAULT_SYSTEM_PROMPT =
  "You are an expert coding and problem-solving assistant. Give direct, correct, " +
  "well-explained answers. When writing code, use clear naming and add comments " +
  "only where they help. When debugging, ask for the minimum info you need, then " +
  "give a concrete fix. Be concise but complete — no filler.";

const els = {
  loginScreen: document.getElementById('loginScreen'),
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  loginError: document.getElementById('loginError'),
  appRoot: document.getElementById('appRoot'),
  signOutBtn: document.getElementById('signOutBtn'),

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
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  dailyLimitInput: document.getElementById('dailyLimitInput'),
  systemPromptInput: document.getElementById('systemPromptInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
};

marked.setOptions({ breaks: true });

// ---------- State ----------
// API key stays LOCAL ONLY (per-device) — never sent to the backend, for safety.
let apiKey = (localStorage.getItem('console_api_key') || '').replace(/[^\x20-\x7E]/g, '');

// These now live in Firestore (backend) so they persist across devices:
let systemPrompt = DEFAULT_SYSTEM_PROMPT;
let dailyLimit = '';
let conversations = [];
let activeId = null;
let usedToday = 0;

let uid = null;
let convosUnsub = null;

// ============================================================
// AUTH
// ============================================================
els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.loginError.textContent = '';
  try {
    await auth.signInWithEmailAndPassword(els.loginEmail.value.trim(), els.loginPassword.value);
  } catch (err) {
    els.loginError.textContent = 'Sign in nahi hua — email/password check karein.';
  }
});

els.signOutBtn.onclick = () => auth.signOut();

auth.onAuthStateChanged(async (user) => {
  if (user) {
    uid = user.uid;
    els.loginScreen.style.display = 'none';
    els.appRoot.style.display = 'flex';
    await loadUserSettings();
    listenToConversations();
    await loadUsageToday();
    updateStatus();
    if (!apiKey) setTimeout(openSettings, 400);
  } else {
    uid = null;
    if (convosUnsub) convosUnsub();
    els.loginScreen.style.display = 'flex';
    els.appRoot.style.display = 'none';
  }
});

// ============================================================
// FIRESTORE — user settings (system prompt + daily limit)
// ============================================================
async function loadUserSettings() {
  const doc = await db.collection('users').doc(uid).get();
  const data = doc.exists ? doc.data() : {};
  systemPrompt = data.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  dailyLimit = data.dailyLimit || '';
}

async function saveUserSettings() {
  await db.collection('users').doc(uid).set({ systemPrompt, dailyLimit }, { merge: true });
}

// ============================================================
// FIRESTORE — conversations (live sync across devices)
// ============================================================
function listenToConversations() {
  convosUnsub = db.collection('users').doc(uid).collection('conversations')
    .orderBy('updatedAt', 'desc')
    .onSnapshot((snap) => {
      conversations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!activeId && conversations.length > 0) activeId = conversations[0].id;
      renderSidebar();
      renderThread();
    }, (err) => {
      console.error(err);
    });
}

function getActive() {
  return conversations.find(c => c.id === activeId);
}

async function newConversation() {
  const ref = await db.collection('users').doc(uid).collection('conversations').add({
    title: 'New chat',
    messages: [],
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  activeId = ref.id;
  els.sidebar.classList.remove('open');
}

async function saveConversation(convo) {
  await db.collection('users').doc(uid).collection('conversations').doc(convo.id).set({
    title: convo.title,
    messages: convo.messages,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function deleteConversation(id) {
  await db.collection('users').doc(uid).collection('conversations').doc(id).delete();
  if (activeId === id) activeId = conversations.find(c => c.id !== id)?.id || null;
}

// ============================================================
// FIRESTORE — daily usage (true cross-device daily cap)
// ============================================================
function todayId() {
  return new Date().toISOString().slice(0, 10); // e.g. 2026-08-30
}

async function loadUsageToday() {
  const doc = await db.collection('users').doc(uid).collection('usage').doc(todayId()).get();
  usedToday = doc.exists ? (doc.data().count || 0) : 0;
}

async function incrementUsedToday() {
  const ref = db.collection('users').doc(uid).collection('usage').doc(todayId());
  await ref.set({ count: firebase.firestore.FieldValue.increment(1) }, { merge: true });
  usedToday += 1;
}

function limitReached() {
  if (!dailyLimit) return false;
  return usedToday >= parseInt(dailyLimit, 10);
}

// ============================================================
// RENDERING
// ============================================================
function renderSidebar() {
  els.chatList.innerHTML = '';
  conversations.forEach(c => {
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
      deleteConversation(c.id);
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

  if (!apiKey) {
    openSettings();
    return;
  }

  if (limitReached()) {
    alert(`Aaj ka limit (${dailyLimit} messages) khatam ho chuka hai. Kal phir se use kar sakte hain, ya Settings mein limit badha lein.`);
    return;
  }

  let convo = getActive();
  if (!convo) {
    await newConversation();
    convo = { id: activeId, title: 'New chat', messages: [] };
    conversations.unshift(convo);
  }

  convo.messages.push({ role: 'user', content: text });
  if (convo.title === 'New chat') convo.title = text.slice(0, 40);
  renderSidebar();
  renderThread();
  await saveConversation(convo);

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
    await saveConversation(convo);
    await incrementUsedToday();
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
      systemInstruction: { parts: [{ text: systemPrompt }] },
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
// SETTINGS (systemPrompt + dailyLimit go to Firestore; apiKey stays local)
// ============================================================
function openSettings() {
  els.apiKeyInput.value = apiKey;
  els.dailyLimitInput.value = dailyLimit;
  els.systemPromptInput.value = systemPrompt;
  els.settingsModal.style.display = 'flex';
}
function closeSettings() { els.settingsModal.style.display = 'none'; }

els.settingsBtn.onclick = openSettings;
els.closeSettingsBtn.onclick = closeSettings;
els.settingsModal.addEventListener('click', (e) => { if (e.target === els.settingsModal) closeSettings(); });

els.saveSettingsBtn.onclick = async () => {
  // Strip anything outside printable ASCII — invisible/unicode chars (often
  // injected by browser autofill) break the fetch 'headers' object.
  apiKey = els.apiKeyInput.value.trim().replace(/[^\x20-\x7E]/g, '');
  dailyLimit = els.dailyLimitInput.value.trim().replace(/[^0-9]/g, '');
  systemPrompt = els.systemPromptInput.value.trim() || DEFAULT_SYSTEM_PROMPT;

  localStorage.setItem('console_api_key', apiKey); // local only, on purpose
  await saveUserSettings(); // systemPrompt + dailyLimit → backend

  updateStatus();
  closeSettings();
};

function updateStatus() {
  if (!apiKey) {
    els.statusDot.textContent = '● not connected';
    els.statusDot.classList.remove('ok');
    return;
  }
  els.statusDot.classList.add('ok');
  if (dailyLimit) {
    els.statusDot.textContent = `● ${usedToday}/${dailyLimit} today`;
  } else {
    els.statusDot.textContent = '● connected';
  }
}

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

// ---------- Init ----------
els.newChatBtn.onclick = newConversation;
