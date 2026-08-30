# Console — AI Coding Assistant (with backend)

Ab is app ka apna backend hai (Firebase) — aapki **instructions (system prompt)**, **daily limit**, aur **saari chat history** permanently save hoti hain, login ke peeche, kisi bhi device se dobara mil jati hain. API key (Gemini) sirf aapke apne browser mein rehti hai — kabhi backend/GitHub mein nahi jati.

## Setup

### 1. Firebase project
Agar pehle se Suno project ke liye Firebase project bana rakha hai, **wahi reuse kar sakte hain**. Nahi to naya banayein: https://console.firebase.google.com

1. **Authentication → Sign-in method → Email/Password → Enable**
2. **Authentication → Users → Add user** — apna email + password (ye hi login hai)
3. **Firestore Database → Create database** (agar pehle se nahi hai)
4. **Firestore → Rules** mein ye paste karke Publish karein:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /conversations/{convoId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /usage/{dateId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Ye rules ensure karti hain ke har user sirf **apna khud ka** data dekh/badal sakta hai — koi aur nahi.

5. **Project Settings → General → Your apps → Web (`</>`)** se config lein, `firebase-config.js` mein paste kar dein.

### 2. GitHub Pages pe deploy (agar pehle se nahi kiya)
Sab files (`index.html`, `style.css`, `app.js`, `firebase-config.js`) ek repo mein daal kar Settings → Pages se on kar dein.

### 3. Pehli baar chalana
1. Site kholein, apne email/password se sign in karein.
2. Settings mein Gemini API key aur (chaho to) daily limit set karein.
3. Chat karein — sab kuch ab backend mein save ho raha hai.

## Kya kahan save hota hai

| Cheez | Kahan |
|---|---|
| Login | Firebase Authentication |
| System prompt / instructions | Firestore (`users/{uid}`) |
| Daily message limit | Firestore (`users/{uid}`) |
| Chat history (saari conversations) | Firestore (`users/{uid}/conversations`) |
| Aaj ke messages ka count | Firestore (`users/{uid}/usage`) |
| Gemini API key | **Sirf** browser localStorage — kabhi backend mein nahi |

API key ko jaan-boojh kar backend mein nahi rakha — agar wo Firestore mein hoti aur kabhi rules mein galti ho jati, to key leak ho sakti thi. Isay local rakhna zyada mehfooz hai; matlab har naye device pe ek dafa key dobara daalni hogi, lekin baaki sab (instructions, history, limit) automatically sync ho jayega.
