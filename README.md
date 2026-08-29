# Console — AI Coding Assistant
 
Ye ek pura chat app hai jaisa aap mujhse (Claude) baat karte hain — coding aur problem-solving ke liye. 3 files hain: `index.html`, `style.css`, `app.js`. Koi backend nahi chahiye, seedha browser se Claude API ko call karta hai.
 
## Chalane ka tareeqa
 
1. Sab files ek folder mein rakhein, `index.html` kholein (double-click ya koi bhi static server, GitHub Pages pe bhi daal sakte hain — pehle Suno project ki tarah).
2. Pehli baar khulne pe Settings popup aayega — apni **Anthropic API key** paste karein (banayein: https://console.anthropic.com → API Keys).
3. Model choose karein (Sonnet 5 coding ke liye best hai), likhna shuru karein.
## Ye kaise kaam karta hai
 
- Har message seedha `https://api.anthropic.com/v1/messages` pe jata hai, aapki API key ke sath.
- API key sirf **aapke browser** ke localStorage mein rehti hai — kisi file mein nahi, GitHub pe nahi jati.
- Conversations bhi localStorage mein save hoti hain (sidebar mein history dikhti hai) — sirf usi browser/device pe.
- System prompt (Settings mein) badal ke assistant ka "persona"/instructions customize kar sakte hain — yehi wo jagah hai jahan aap decide karte hain ye assistant kaise react/kaam kare.
## Zaroori baat (security)
 
- Ye key sirf **aapke apne istemal** ke liye hai. Agar ye page kisi aur ko/public ko share ki, to aapki API key unke browser mein bhi save ho sakti hai agar wo apni key na daalein — is liye is link ko sirf khud tak rakhein (jaise admin.html wala Suno panel).
- Agar aap chahte hain ke doosre log bhi is assistant ko use karein bina aapki key dekhe, to ek chhota backend/proxy (Cloudflare Worker ya Node server) chahiye hoga jo key ko chupaye — abhi ye direct "bring your own key" pattern hai, jo Anthropic khud recommend karta hai personal/internal tools ke liye.
## Integration
 
Agar apne kisi app mein integrate karna hai, to `app.js` ka `callClaude()` function hi wo core piece hai — usay copy karke apne project mein use kar sakte hain.
 
