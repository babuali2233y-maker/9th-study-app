// ============================================================
// DATABASE — sab data ka ek hi "file" jaisa storage
// ============================================================
// Static site (GitHub Pages) browser mein seedha disk pe file nahi likh
// sakta — is liye ye poora "database" browser ke localStorage mein rehta
// hai, ek hi JSON object ki tarah. Export/Import se aap isay real .json
// file ke tor pe download/upload bhi kar sakte hain (backup / doosre
// device pe le jaane ke liye).
//
// Structure:
// {
//   adminScript: "...",       <- aapki likhi hui instructions/teaching
//   dailyLimit: "30",
//   apiKey: "...",            <- Gemini API key
//   usage: { "2026-08-30": 4 },
//   conversations: [ { id, title, messages: [...] }, ... ]
// }

const DB_KEY = 'console_database_v1';

const DB = {
  _data: null,

  load() {
    if (this._data) return this._data;
    const raw = localStorage.getItem(DB_KEY);
    this._data = raw ? JSON.parse(raw) : {
      adminScript: '',
      dailyLimit: '',
      apiKey: '',
      usage: {},
      conversations: []
    };
    return this._data;
  },

  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this._data));
  },

  get(key) {
    return this.load()[key];
  },

  set(key, value) {
    this.load()[key] = value;
    this.save();
  },

  // ---- conversations helpers ----
  getConversations() {
    return this.load().conversations;
  },

  saveConversation(convo) {
    const convos = this.load().conversations;
    const idx = convos.findIndex(c => c.id === convo.id);
    if (idx >= 0) convos[idx] = convo;
    else convos.unshift(convo);
    this.save();
  },

  deleteConversation(id) {
    this._data.conversations = this.load().conversations.filter(c => c.id !== id);
    this.save();
  },

  // ---- usage helpers ----
  getUsageToday() {
    const key = new Date().toISOString().slice(0, 10);
    return this.load().usage[key] || 0;
  },

  incrementUsageToday() {
    const key = new Date().toISOString().slice(0, 10);
    const usage = this.load().usage;
    usage[key] = (usage[key] || 0) + 1;
    this.save();
  },

  // ---- export / import (real .json file on disk) ----
  exportToFile() {
    const blob = new Blob([JSON.stringify(this.load(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'database.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  importFromFile(file, onDone) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        this._data = JSON.parse(reader.result);
        this.save();
        onDone(true);
      } catch (e) {
        onDone(false);
      }
    };
    reader.readAsText(file);
  }
};
