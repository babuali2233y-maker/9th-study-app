// ============================================================
// FIREBASE CONFIG — ye apne Firebase project se fill karein
// ============================================================
// 1. https://console.firebase.google.com pe jaake FREE project banayein
// 2. Project Settings > General > "Your apps" > Web app (</>) add karein
// 3. Wahan se ye config object copy karke neeche paste kar dein
// 4. Authentication > Sign-in method > "Email/Password" ON karein
// 5. Authentication > Users > khud ko ek admin user (email+password) add karein
// 6. Firestore Database > Create database (production mode)
// 7. Firestore > Rules mein neeche di gayi rules paste karein (README.md mein hain)

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
