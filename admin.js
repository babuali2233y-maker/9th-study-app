// ============================================================
// Admin dashboard logic
// ============================================================

// --- decorative waveform (idle by default, pulses per-card while generating) ---
(function drawWave() {
  const wave = document.getElementById('wave');
  for (let i = 0; i < 40; i++) {
    const bar = document.createElement('i');
    bar.style.height = (8 + Math.round(Math.random() * 26)) + 'px';
    bar.style.animationDelay = (Math.random() * 1.4).toFixed(2) + 's';
    wave.appendChild(bar);
  }
})();

const loginScreen = document.getElementById('loginScreen');
const dash = document.getElementById('dash');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// --- AUTH ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    loginError.textContent = 'Sign in nahi hua — email/password check karein.';
  }
});

document.getElementById('signOutBtn').addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged((user) => {
  if (user) {
    loginScreen.style.display = 'none';
    dash.style.display = 'block';
    startQueue();
  } else {
    loginScreen.style.display = 'flex';
    dash.style.display = 'none';
  }
});

// --- SETTINGS (stored locally only — never in code/GitHub) ---
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const apiBaseInput = document.getElementById('apiBase');
const apiKeyInput = document.getElementById('apiKey');
const apiPathInput = document.getElementById('apiPath');

apiBaseInput.value = localStorage.getItem('suno_api_base') || '';
apiKeyInput.value = localStorage.getItem('suno_api_key') || '';
apiPathInput.value = localStorage.getItem('suno_api_path') || '/api/generate';

settingsToggle.addEventListener('click', () => {
  settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('saveSettings').addEventListener('click', () => {
  localStorage.setItem('suno_api_base', apiBaseInput.value.trim());
  localStorage.setItem('suno_api_key', apiKeyInput.value.trim());
  localStorage.setItem('suno_api_path', apiPathInput.value.trim() || '/api/generate');
  settingsPanel.style.display = 'none';
});

// --- QUEUE (live from Firestore, admin-only read per security rules) ---
let queueStarted = false;
function startQueue() {
  if (queueStarted) return;
  queueStarted = true;

  db.collection('requests').orderBy('createdAt', 'desc')
    .onSnapshot((snap) => {
      const list = document.getElementById('list');
      const emptyMsg = document.getElementById('emptyMsg');
      list.innerHTML = '';

      let pending = 0, done = 0;
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.status === 'pending') pending++;
        if (d.status === 'done') done++;
        list.appendChild(renderCard(doc.id, d));
      });

      document.getElementById('statPending').textContent = pending;
      document.getElementById('statDone').textContent = done;
      document.getElementById('statTotal').textContent = snap.size;
      emptyMsg.style.display = snap.empty ? 'block' : 'none';
    }, (err) => {
      console.error(err);
      document.getElementById('list').innerHTML =
        `<div class="empty">Queue load nahi hui. Firestore rules check karein (README.md).</div>`;
    });
}

function timeAgo(ts) {
  if (!ts) return 'just now';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString();
}

function renderCard(id, d) {
  const card = document.createElement('div');
  card.className = 'req-card';

  const badgeClass = { pending: 'pending', generating: 'generating', done: 'done', rejected: 'rejected' }[d.status] || 'pending';
  const badgeLabel = { pending: 'Pending', generating: 'Generating', done: 'Done', rejected: 'Rejected' }[d.status] || d.status;

  card.innerHTML = `
    <div class="req-top">
      <div>
        <div class="req-name">${escapeHtml(d.name || 'Anonymous')}</div>
        <div class="req-time">${timeAgo(d.createdAt)} · #${id.slice(0,6).toUpperCase()}</div>
      </div>
      <span class="badge ${badgeClass}"><span class="badge dot"></span>${badgeLabel}</span>
    </div>
    <div class="req-prompt">${escapeHtml(d.prompt || '')}</div>
    ${d.tags ? `<div class="req-tags"># ${escapeHtml(d.tags)}</div>` : ''}
    ${d.audioUrl ? `<audio controls src="${d.audioUrl}"></audio>` : ''}
    ${d.error ? `<div class="req-error">Error: ${escapeHtml(d.error)}</div>` : ''}
    <div class="req-actions"></div>
  `;

  const actions = card.querySelector('.req-actions');

  if (d.status === 'pending' || d.status === 'rejected') {
    const genBtn = document.createElement('button');
    genBtn.className = 'btn-primary';
    genBtn.textContent = 'Generate';
    genBtn.onclick = () => generateSong(id, d, card);
    actions.appendChild(genBtn);

    const rejBtn = document.createElement('button');
    rejBtn.className = 'btn-danger';
    rejBtn.textContent = 'Reject';
    rejBtn.onclick = () => db.collection('requests').doc(id).update({ status: 'rejected' });
    actions.appendChild(rejBtn);
  }

  if (d.status === 'generating') {
    const busy = document.createElement('button');
    busy.className = 'btn-ghost';
    busy.disabled = true;
    busy.textContent = 'Working…';
    actions.appendChild(busy);
  }

  if (d.status === 'done') {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-ghost';
    delBtn.textContent = 'Delete ticket';
    delBtn.onclick = () => db.collection('requests').doc(id).delete();
    actions.appendChild(delBtn);
  }

  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- SUNO API CALL ---
// NOTE: Suno ki koi ek "official" public API nahi hai — log alag-alag
// third-party providers (piapi.ai, sunoapi.org, kie.ai, waha) use karte hain,
// aur har ek ka endpoint path / request body / response shape thora alag hota hai.
// Neeche ek generic caller hai jo Settings panel ki base URL + path use karta hai.
// Apne provider ke docs dekh kar niche do jagah (body aur response parsing) adjust karein.
async function generateSong(id, d, card) {
  const base = localStorage.getItem('suno_api_base');
  const key = localStorage.getItem('suno_api_key');
  const path = localStorage.getItem('suno_api_path') || '/api/generate';

  if (!base || !key) {
    alert('Pehle "API settings" mein apni Suno API base URL aur key save karein.');
    settingsPanel.style.display = 'block';
    return;
  }

  await db.collection('requests').doc(id).update({ status: 'generating', error: null });

  try {
    const res = await fetch(base.replace(/\/$/, '') + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        prompt: d.prompt,
        tags: d.tags || undefined,
        title: d.name ? `${d.name}'s request` : undefined,
        make_instrumental: false
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API returned ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();

    // Different providers return the audio URL under different keys.
    // Try the common ones; adjust this if your provider's docs differ.
    const audioUrl =
      data.audio_url || data.audioUrl ||
      (data.data && (data.data.audio_url || data.data.audioUrl)) ||
      (Array.isArray(data.clips) && data.clips[0] && data.clips[0].audio_url) ||
      null;

    if (!audioUrl) {
      // Some providers are async: they return a task_id and you must poll a
      // separate status endpoint. If that's your case, save the task id and
      // handle polling here — see the comment above generateSong().
      await db.collection('requests').doc(id).update({
        status: 'pending',
        error: 'API se turant audio URL nahi mila — provider shayad async hai (task_id polling chahiye). Response console mein check karein.'
      });
      console.log('Suno API response:', data);
      return;
    }

    await db.collection('requests').doc(id).update({ status: 'done', audioUrl });
  } catch (err) {
    console.error(err);
    await db.collection('requests').doc(id).update({ status: 'pending', error: err.message });
  }
}
