import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB7gW6xeJ6E98rELYfjcKRnhLL6ZSWVUrw",
    authDomain: "gastos-110bb.firebaseapp.com",
    projectId: "gastos-110bb",
    storageBucket: "gastos-110bb.firebasestorage.app",
    messagingSenderId: "665927620976",
    appId: "1:665927620976:web:7c0ff23fcd000e44b917b5",
    measurementId: "G-YMPDCEE4Q3"
};

const app = initializeApp(firebaseConfig);
console.log("� Nuevo Firebase inicializado con ID:", firebaseConfig.projectId);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
