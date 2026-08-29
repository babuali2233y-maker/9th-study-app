// ============================================================
// Public request form logic
// ============================================================

// Draw the signature waveform (purely decorative, animated bars)
(function drawWave() {
  const wave = document.getElementById('wave');
  const bars = 40;
  for (let i = 0; i < bars; i++) {
    const bar = document.createElement('i');
    const h = 8 + Math.round(Math.random() * 26);
    bar.style.height = h + 'px';
    bar.style.animationDelay = (Math.random() * 1.4).toFixed(2) + 's';
    bar.style.animationDuration = (1.1 + Math.random() * 0.9).toFixed(2) + 's';
    wave.appendChild(bar);
  }
})();

const form = document.getElementById('reqForm');
const submitBtn = document.getElementById('submitBtn');
const formCard = document.getElementById('formCard');
const doneCard = document.getElementById('doneCard');
const doneTitle = document.getElementById('doneTitle');
const doneSub = document.getElementById('doneSub');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  const name = document.getElementById('name').value.trim();
  const prompt = document.getElementById('prompt').value.trim();
  const tags = document.getElementById('tags').value.trim();

  try {
    const docRef = await db.collection('requests').add({
      name,
      prompt,
      tags,
      status: 'pending',
      audioUrl: null,
      error: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const ticketNo = docRef.id.slice(0, 6).toUpperCase();
    doneTitle.textContent = `Ticket #${ticketNo} filed.`;
    doneSub.textContent = `Thanks ${name || 'friend'} — your request is in the queue.`;
    formCard.style.display = 'none';
    doneCard.style.display = 'block';
  } catch (err) {
    console.error(err);
    alert('Request bhejne mein masla hua. Firebase config check karein (firebase-config.js) aur Firestore rules dekhein.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send request';
  }
});

document.getElementById('newReqBtn').addEventListener('click', () => {
  form.reset();
  doneCard.style.display = 'none';
  formCard.style.display = 'block';
});
