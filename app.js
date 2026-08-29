// ============================================================
// CONSOLE — AI coding/problem-solving assistant
// Calls the Anthropic Messages API directly from the browser.
// ============================================================
 
const DEFAULT_SYSTEM_PROMPT =
  "You are an expert coding and problem-solving assistant. Give direct, correct, " +
  "well-explained answers. When writing code, use clear naming and add comments " +
  "only where they help. When debugging, ask for the minimum info you need, then " +
  "give a concrete fix. Be concise but complete — no filler.";
 
const els = {
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
  systemPromptInput: document.getElementById('systemPromptInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
};
 
// ---------- State (persisted in localStorage) ----------
let conversations = JSON.parse(localStorage.getItem('console_conversations') || '[]');
let activeId = localStorage.getItem('console_active_id');
let apiKey = localStorage.getItem('console_api_key') || '';
let systemPrompt = localStorage.getItem('console_system_prompt') || DEFAULT_SYSTEM_PROMPT;
 
marked.setOptions({ breaks: true });
 
function persist() {
  localStorage.setItem('console_conversations', JSON.stringify(conversations));
  localStorage.setItem('console_active_id', activeId || '');
}
 
function newConversation() {
  const convo = { id: 'c_' + Date.now(), title: 'New chat', messages: [] };
  conversations.unshift(convo);
  activeId = convo.id;
  persist();
  renderSidebar();
  renderThread();
}
 
function getActive() {
  return conversations.find(c => c.id === activeId);
}
 
function renderSidebar() {
  els.chatList.innerHTML = '';
  conversations.forEach(c => {
    const item = document.createElement('div');
    item.className = 'chat-item' + (c.id === activeId ? ' active' : '');
    item.innerHTML = `<span>${escapeHtml(c.title)}</span><span class="del mono">✕</span>`;
    item.querySelector('span:first-child').onclick = () => {
      activeId = c.id;
      persist();
      renderSidebar();
      renderThread();
      els.sidebar.classList.remove('open');
    };
    item.querySelector('.del').onclick = (e) => {
      e.stopPropagation();
      conversations = conversations.filter(x => x.id !== c.id);
      if (activeId === c.id) activeId = conversations[0]?.id || null;
      persist();
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
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + role;
  const tag = document.createElement('div');
  tag.className = 'role-tag mono';
  tag.textContent = role === 'user' ? 'you' : 'claude';
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
  return wrap;
}
 
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
 
// ---------- Sending messages ----------
els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;
 
  if (!apiKey) {
    openSettings();
    return;
  }
 
  let convo = getActive();
  if (!convo) {
    newConversation();
    convo = getActive();
  }
 
  convo.messages.push({ role: 'user', content: text });
  if (convo.title === 'New chat') convo.title = text.slice(0, 40);
  persist();
  renderSidebar();
  renderThread();
 
  els.input.value = '';
  autoGrow();
  els.sendBtn.disabled = true;
 
  // typing indicator
  const typingWrap = document.createElement('div');
  typingWrap.className = 'msg assistant';
  typingWrap.innerHTML = `<div class="role-tag mono">claude</div><div class="msg-body"><div class="typing"><i></i><i></i><i></i></div></div>`;
  els.thread.appendChild(typingWrap);
  els.thread.scrollTop = els.thread.scrollHeight;
 
  try {
    const reply = await callClaude(convo.messages);
    convo.messages.push({ role: 'assistant', content: reply });
    persist();
    renderThread();
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
 
async function callClaude(messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: els.modelSelect.value,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    })
  });
 
  if (!res.ok) {
    const errBody = await res.text();
    if (res.status === 401) throw new Error('API key invalid ya expired hai. Settings mein check karein.');
    throw new Error(`API error ${res.status}: ${errBody.slice(0, 200)}`);
  }
 
  const data = await res.json();
  const textBlock = data.content.find(b => b.type === 'text');
  return textBlock ? textBlock.text : '(no text response)';
}
 
// ---------- Settings ----------
function openSettings() {
  els.apiKeyInput.value = apiKey;
  els.systemPromptInput.value = systemPrompt;
  els.settingsModal.style.display = 'flex';
}
function closeSettings() { els.settingsModal.style.display = 'none'; }
 
els.settingsBtn.onclick = openSettings;
els.closeSettingsBtn.onclick = closeSettings;
els.settingsModal.addEventListener('click', (e) => { if (e.target === els.settingsModal) closeSettings(); });
 
els.saveSettingsBtn.onclick = () => {
  apiKey = els.apiKeyInput.value.trim();
  systemPrompt = els.systemPromptInput.value.trim() || DEFAULT_SYSTEM_PROMPT;
  localStorage.setItem('console_api_key', apiKey);
  localStorage.setItem('console_system_prompt', systemPrompt);
  updateStatus();
  closeSettings();
};
 
function updateStatus() {
  if (apiKey) {
    els.statusDot.textContent = '● connected';
    els.statusDot.classList.add('ok');
  } else {
    els.statusDot.textContent = '● not connected';
    els.statusDot.classList.remove('ok');
  }
}
 
// ---------- Sidebar mobile toggle ----------
els.openSidebar.onclick = () => els.sidebar.classList.add('open');
els.closeSidebar.onclick = () => els.sidebar.classList.remove('open');
 
// ---------- Init ----------
els.newChatBtn.onclick = newConversation;
if (conversations.length === 0) newConversation();
if (!activeId || !getActive()) activeId = conversations[0].id;
renderSidebar();
renderThread();
updateStatus();
if (!apiKey) setTimeout(openSettings, 400);
 
