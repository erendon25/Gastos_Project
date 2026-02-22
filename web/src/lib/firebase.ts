import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBqF8_xhCZ-Hp9O9Ci8EqtG4GWtwtgZnS0",
    authDomain: "gastos-641dd.firebaseapp.com",
    projectId: "gastos-641dd",
    storageBucket: "gastos-641dd.firebasestorage.app",
    messagingSenderId: "977805703209",
    appId: "1:977805703209:web:2a1e6b94160d060e524438",
    measurementId: "G-1BV6CFKY9Q"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
