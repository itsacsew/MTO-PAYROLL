// utils/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCbpSNuzxP5WCqTRUeoUpC0C-BEawW5IJI",
  authDomain: "payroll-e3cc5.firebaseapp.com",
  projectId: "payroll-e3cc5",
  storageBucket: "payroll-e3cc5.firebasestorage.app",
  messagingSenderId: "711658369480",
  appId: "1:711658369480:web:45e4d26e3af96a932250fd",
  measurementId: "G-QX5EX89P7S"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;