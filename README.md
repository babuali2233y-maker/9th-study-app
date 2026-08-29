# Request Line — Suno Song Request App

Do pages hain:
- **index.html** — public form, koi bhi song request bhej sakta hai
- **admin.html** — sirf aapke liye (login required), requests dikhti hain, aap "Generate" dabate hain to Suno API call hoti hai

Data (requests) Firebase Firestore mein store hota hai taake public form aur aapka admin dashboard aapas mein sync rahein.

---

## Step 1 — Firebase project banayein (free)

1. https://console.firebase.google.com kholein → **Add project** → naam de kar create karein.
2. Project ke andar: **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
3. **Authentication → Users → Add user** — apna email + ek strong password daalein. Yehi admin login hai.
4. **Build → Firestore Database → Create database → Production mode → location choose karein**.
5. **Firestore → Rules** tab mein neeche ye rules paste kar ke **Publish** karein:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /requests/{requestId} {
      allow create: if request.resource.data.keys().hasAll(['name','prompt','status'])
                    && request.resource.data.status == 'pending';
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

Isse koi bhi request bhej sakta hai (public form), lekin sirf sign-in kiya hua admin (aap) unhe dekh/edit/delete kar sakta hai.

6. **Project settings (⚙️) → General → Your apps → Web (`</>`)** se app register karein, naam kuch bhi rakh dein, "Firebase Hosting" ka checkbox **skip** kar dein.
7. Wahan mila hua `firebaseConfig` object copy karke `firebase-config.js` file mein paste kar dein (jahan `PASTE_YOUR_...` likha hai).

> Ye Firebase `apiKey` public rehna normal hai — asal security **Firestore Rules** se aati hai (upar wali), na ke key chupane se. Isliye ye code mein rehna theek hai.

---

## Step 2 — Suno API connect karein

Suno ki koi ek "official" public API nahi hai — log alag-alag third-party providers (jaise piapi.ai, sunoapi.org, kie.ai) use karte hain, aur har ek ka endpoint path aur response format thoda alag hota hai.

Isliye API key **code mein nahi**, admin dashboard ke andar hi daalni hai:

1. `admin.html` kholein, sign in karein.
2. Top-right pe **"API settings"** click karein.
3. Apne provider ki **Base URL**, **API key**, aur **generate endpoint path** daal kar **Save settings** karein.
4. Ye sirf aapke browser mein (localStorage) save hoti hai — GitHub pe kabhi commit nahi hoti.

Agar "Generate" click karne pe error aaye ya audio URL na mile, to `admin.js` mein `generateSong()` function ke andar comments dekhein — wahan response ka shape apne provider ke actual docs se match karna hoga (2 jagah: request body, aur audio URL nikalne wali line).

---

## Step 3 — GitHub Pages pe daalna

1. GitHub pe naya repository banayein (public).
2. Ye saari files (`index.html`, `admin.html`, `style.css`, `app.js`, `admin.js`, `firebase-config.js`) upload/push kar dein.
3. Repo → **Settings → Pages → Source: "Deploy from a branch" → Branch: main → / (root)** select karke Save karein.
4. Kuch minute baad `https://<aapka-username>.github.io/<repo-naam>/` pe site live ho jayegi.
5. `index.html` ka link doosron ko dein (requests ke liye), `admin.html` sirf apne paas rakhein.

---

## Security note (zaroor parhein)

- **Kabhi bhi** Suno API key ya kisi bhi service ki secret key `.js`/`.html` file mein hardcode na karein jo GitHub pe public jaye — koi bhi "View Source" karke wo nikaal sakta hai. Isi liye ye app key ko browser localStorage mein rakhta hai, code mein nahi.
- Admin login Firebase Authentication se real hai (email+password) — sirf aap login kar sakte hain, na ke koi random link uthane wala.
- Public form sirf naya request "create" kar sakta hai — purani requests padhna, badalna ya delete karna sirf logged-in admin kar sakta hai (Firestore rules isko enforce karti hain).
