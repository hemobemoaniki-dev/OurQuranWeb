// Firebase client SDK — reuses the EXISTING "ourquran" project.
// Auth (email/password) and Firestore (users/{uid}, usernames/{username}).
// Avatars are bundled; Auth persists across reloads via AsyncStorage.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
import * as fbAuth from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { Platform } from "react-native";

// Firebase web API keys are client-side identifiers, not server secrets, but
// keeping the literal out of the public repository avoids accidental reuse and
// GitHub secret-scanning alerts. Expo inlines EXPO_PUBLIC_* variables at build.
const firebaseApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

if (!firebaseApiKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_FIREBASE_API_KEY. Set it in your local/deployment environment before starting or building OurQuran."
  );
}

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: "ourquran.firebaseapp.com",
  projectId: "ourquran",
  storageBucket: "ourquran.firebasestorage.app",
  messagingSenderId: "354539547523",
  appId: "1:354539547523:web:5d49713b3033087c9a64b6",
  measurementId: "G-PRDGJ3WWRX",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: (fbAuth as any).getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    // Only reuse a real existing instance. Do not silently fall back to an
    // in-memory login if persistent initialization failed.
    if (error?.code === "auth/already-initialized") auth = getAuth(app);
    else throw error;
  }
}

export { auth };
// Native XHR streaming can fail on some mobile networks. Long polling avoids
// response-buffering incompatibilities while retaining Firestore listeners/retry.
// Keep the browser transport on Firebase's automatic defaults.
export const db = Platform.OS === "web" ? getFirestore(app) : initializeFirestore(app, {
  // RN's XMLHttpRequest implementation is unreliable with Firestore's fetch
  // streaming transport. Auto-detect long-polling only when needed.
  experimentalAutoDetectLongPolling: true,
});
