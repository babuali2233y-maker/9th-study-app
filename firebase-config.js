// ============================================================
// FIREBASE CONFIG — apne Firebase project se fill karein
// ============================================================
// Agar aapne pehle Suno project ke liye Firebase project banaya tha,
// wahi config yahan bhi paste kar sakte hain (same project reuse karna theek hai).
// Nahi to naya project banayein: https://console.firebase.google.com
//
// 1. Project Settings > General > "Your apps" > Web app (</>) se config lein
// 2. Authentication > Sign-in method > "Email/Password" ON karein
// 3. Authentication > Users > apna admin email+password add karein
// 4. Firestore Database > Create database (agar pehle se nahi bana)
// 5. Firestore > Rules mein README.md ki rules paste karein

const firebaseConfig = {
  apiKey: "PASTE_YOUR_FIREBASE_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
