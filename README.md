# Console — AI Coding Assistant (no external backend)

Firebase hata diya gaya hai. Ab app **khud-mukhtar** hai — koi setup nahi chahiye, seedha khulte hi kaam karta hai.

## Kaise chalti hai

1. `index.html` kholein.
2. Password maangega: **`Pubg Mere Jan`**
3. Andar jaake sabse pehle Settings mein apni **Gemini API key** daal dein (free: https://aistudio.google.com/apikey).
4. Sidebar mein **"Admin script"** button — yahan click karke aap AI ko permanent instructions de sakte hain ("hamesha ye karo", "kabhi ye mat karo" waghera). Save karte hi har jawab mein wahi follow hoga.

## Data kahan save hota hai

Sab kuch ek hi jagah — `database.js` (yani is browser ke localStorage mein, ek JSON object ki tarah):
- Chat history (saari conversations)
- Admin script (instructions)
- Daily message limit
- Gemini API key
- Aaj ka usage count

**Zaroori baat:** Static site (GitHub Pages) browser se seedha kisi real file ko disk pe likh nahi sakti — is liye ye data **isi browser** mein rehta hai. Naye device/browser pe khulenge to khali milega.

### Backup / doosre device pe le jaana
Settings ke neeche do buttons hain:
- **Export database** — poora data ek `database.json` file mein download ho jata hai
- **Import database** — wahi file kisi bhi doosre browser/device pe upload karke sab kuch wapas la sakte hain

## Security note

- Password (`Pubg Mere Jan`) sirf client-side check hai — jo bhi `app.js` file dekh le (View Source se), wo password padh sakta hai. Ye "koi random visitor na ghuse" ke liye theek hai, lekin real secret cheez ke liye kaafi nahi — is link ko public jagah share na karein.
- API key bhi isi tarah local hi rehti hai, kabhi kahin bheji nahi jati (sirf Gemini ko, jab aap message bhejte hain).
