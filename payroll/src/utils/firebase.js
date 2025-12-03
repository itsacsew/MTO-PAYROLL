// utils/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBWXiw1X_aDj9JAIPIbduzpEAT43sDep5A",
    authDomain: "payroll-1fcab.firebaseapp.com",
    projectId: "payroll-1fcab",
    storageBucket: "payroll-1fcab.firebasestorage.app",
    messagingSenderId: "456428073034",
    appId: "1:456428073034:web:50945d1f9ebb55998736b3"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;