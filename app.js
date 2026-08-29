// ============================================================
// CONSOLE — AI coding/problem-solving assistant
// Calls the Google Gemini API directly from the browser.
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
  dailyLimitInput: document.getElementById('dailyLimitInput'),
};

// ---------- State (persisted in localStorage) ----------
let conversations = JSON.parse(localStorage.getItem('console_conversations') || '[]');
let activeId = localStorage.getItem('console_active_id');
let apiKey = localStorage.getItem('console_api_key') || '';
let systemPrompt = localStorage.getItem('console_system_prompt') || DEFAULT_SYSTEM_PROMPT;
let dailyLimit = parseInt(localStorage.getItem('console_daily_limit')) || 0;
let dailyCount = parseInt(localStorage.getItem('console_daily_count')) || 0;
let lastResetDate = localStorage.getItem('console_last_reset') || new Date().toDateString();

// Reset daily count if date changed
if (lastResetDate !== new Date().toDateString()) {
  dailyCount = 0;
  localStorage.setItem('console_daily_count', '0');
  localStorage.setItem('console_last_reset', new Date().toDateString());
}

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
  tag.textContent = role === 'user' ? 'you' : 'gemini';
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
        btn.textContent = 'copied!';
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

// ---------- Check daily limit ----------
function checkDailyLimit() {
  if (dailyLimit > 0 && dailyCount >= dailyLimit) {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'msg error';
    errorMsg.innerHTML = `<div class="role-tag mono">⚠️</div><div class="msg-body">Daily message limit (${dailyLimit}) reached. Please try again tomorrow. ✨</div>`;
    els.thread.appendChild(errorMsg);
    els.thread.scrollTop = els.thread.scrollHeight;
    return false;
  }
  return true;
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

  // Check daily limit
  if (!checkDailyLimit()) return;

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
  typingWrap.innerHTML = `<div class="role-tag mono">gemini</div><div class="msg-body"><div class="typing"><i></i><i></i><i></i></div></div>`;
  els.thread.appendChild(typingWrap);
  els.thread.scrollTop = els.thread.scrollHeight;

  try {
    const reply = await callGemini(convo.messages);
    convo.messages.push({ role: 'assistant', content: reply });
    
    // Increment daily count
    dailyCount++;
    localStorage.setItem('console_daily_count', dailyCount.toString());
    
    persist();
    renderThread();
  } catch (err) {
    typingWrap.querySelector('.msg-body').innerHTML = `<div class="error-msg">⚠️ ${escapeHtml(err.message)}</div>`;
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

// ---------- Gemini API Call ----------
async function callGemini(messages) {
  // Prepare conversation history for Gemini
  const history = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  // System prompt as first message
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I\'ll follow these instructions.' }] },
    ...history
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${els.modelSelect.value}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    })
  });

  if (!res.ok) {
    const errData = await res.json();
    const errorMsg = errData.error?.message || 'Unknown error';
    
    if (res.status === 400 && errorMsg.includes('API key')) {
      throw new Error('❌ API key invalid hai. Settings mein check karein.');
    } else if (res.status === 429) {
      throw new Error('⏳ Too many requests. Please wait a moment and try again.');
    } else if (res.status === 403) {
      throw new Error('🔒 API key has no access to this model. Please check your key.');
    } else {
      throw new Error(`API error ${res.status}: ${errorMsg}`);
    }
  }

  const data = await res.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    if (data.promptFeedback?.blockReason) {
      throw new Error(`⛔ Content blocked: ${data.promptFeedback.blockReason}`);
    }
    throw new Error('No response from Gemini. Please try again.');
  }

  const text = data.candidates[0].content.parts[0].text;
  return text || '(empty response)';
}

// ---------- Settings ----------
function openSettings() {
  els.apiKeyInput.value = apiKey;
  els.systemPromptInput.value = systemPrompt;
  els.dailyLimitInput.value = dailyLimit || '';
  els.settingsModal.style.display = 'flex';
}

function closeSettings() {
  els.settingsModal.style.display = 'none';
}

els.settingsBtn.onclick = openSettings;
els.closeSettingsBtn.onclick = closeSettings;
els.settingsModal.addEventListener('click', (e) => {
  if (e.target === els.settingsModal) closeSettings();
});

els.saveSettingsBtn.onclick = () => {
  const newApiKey = els.apiKeyInput.value.trim();
  const newSystemPrompt = els.systemPromptInput.value.trim() || DEFAULT_SYSTEM_PROMPT;
  const newDailyLimit = parseInt(els.dailyLimitInput.value) || 0;
  
  if (!newApiKey) {
    alert('⚠️ Please enter your Gemini API key.');
    return;
  }

  apiKey = newApiKey;
  systemPrompt = newSystemPrompt;
  dailyLimit = newDailyLimit;
  
  localStorage.setItem('console_api_key', apiKey);
  localStorage.setItem('console_system_prompt', systemPrompt);
  localStorage.setItem('console_daily_limit', dailyLimit.toString());
  
  updateStatus();
  closeSettings();
  
  // Show success feedback
  const statusMsg = document.createElement('div');
  statusMsg.className = 'msg system';
  statusMsg.innerHTML = `<div class="role-tag mono">✅</div><div class="msg-body">Settings saved successfully! Daily limit: ${dailyLimit || 'No limit'}</div>`;
  els.thread.appendChild(statusMsg);
  els.thread.scrollTop = els.thread.scrollHeight;
  setTimeout(() => statusMsg.remove(), 3000);
};

function updateStatus() {
  if (apiKey) {
    els.statusDot.textContent = `● connected ${dailyLimit > 0 ? `(${dailyCount}/${dailyLimit})` : ''}`;
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

// Set default model
if (!els.modelSelect.querySelector('option[selected]')) {
  els.modelSelect.value = 'gemini-2.0-flash-exp';
}

// Load existing conversations
if (conversations.length === 0) newConversation();
if (!activeId || !getActive()) activeId = conversations[0]?.id;
renderSidebar();
renderThread();
updateStatus();

// Show settings if no API key
if (!apiKey) {
  setTimeout(openSettings, 400);
}

// ---- Keyboard shortcuts ----
document.addEventListener('keydown', (e) => {
  // Ctrl+Shift+N for new chat
  if (e.ctrlKey && e.shiftKey && e.key === 'N') {
    e.preventDefault();
    newConversation();
  }
  // Escape to close modal
  if (e.key === 'Escape' && els.settingsModal.style.display === 'flex') {
    closeSettings();
  }
});

// ---- Auto-save on tab close ----
window.addEventListener('beforeunload', () => {
  persist();
});

console.log('🚀 CONSOLE with Gemini API loaded successfully!');
console.log('💡 Get your API key from: https://aistudio.google.com/apikey');
