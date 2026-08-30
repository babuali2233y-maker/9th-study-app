Console — AI Coding Assistant (Gemini / Google AI Studio)

Ye ek pura chat app hai, coding aur problem-solving ke liye — ab Google AI Studio (Gemini) API pe chalta hai. 3 files hain: index.html, style.css, app.js. Koi backend nahi chahiye.

Chalane ka tareeqa
Sab files ek folder mein rakhein, index.html kholein (ya GitHub Pages pe daal dein).
Pehli baar khulne pe Settings popup aayega:
Google AI Studio (Gemini) API key paste karein — free key yahan se milti hai: https://aistudio.google.com/apikey
Daily message limit (optional) — jitna number daalenge, us se zyada messages aaj nahi bhej sakenge. Khali chhod dein to koi limit nahi.
Model choose karein (Gemini 2.5 Flash default/fast hai), likhna shuru karein.
Daily limit kaise kaam karti hai
Aap Settings mein jo number daalte hain (e.g. 30), usi se zyada messages us din nahi jayenge — app khud "Send" par rok degi aur message dikhayegi.
Counter localStorage mein date ke hisaab se track hota hai, har raat 12 baje (device ki local time) apne aap reset ho jata hai.
Top-right corner mein ● 4/30 today jaisa live counter dikhta hai.
Security note
API key sirf aapke browser ke localStorage mein rehti hai — kisi file mein nahi, GitHub pe nahi jati.
Ye "bring your own key" pattern hai (Google/browser se seedha call) — is liye ye link sirf apne istemal ke liye rakhein, public share na karein, warna koi aapki daali hui key use kar sakta hai.
Integration

app.js ka callClaude() function hi Gemini API call karta hai — usay copy karke apne kisi bhi project mein use kar sakte hain.
