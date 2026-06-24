import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBuXHSOyin-jayBDVohxx5NsKB-MOMUpTA",
  authDomain: "nacosdinnerandaward.firebaseapp.com",
  projectId: "nacosdinnerandaward",
  storageBucket: "nacosdinnerandaward.firebasestorage.app",
  messagingSenderId: "536172996298",
  appId: "1:536172996298:web:a367c260a8eb00addcb633"
};

// Initialize Firebase (This prevents Next.js hot-reload crashes)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Database
const db = getFirestore(app);

export { db };