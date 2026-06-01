import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// إعدادات Firebase (ضع مفاتيحك هنا)
const firebaseConfig = {
  apiKey: "AIzaSyB2E40ctcxOEtKbURfxDlvUluNfnZuukRo",
  authDomain: "ain-ebel-sanad.firebaseapp.com",
  projectId: "ain-ebel-sanad",
  storageBucket: "ain-ebel-sanad.firebasestorage.app",
  messagingSenderId: "1033988646153",
  appId: "1:1033988646153:web:7c606c945917c4aa3b9fd8",
  measurementId: "G-EY6T4E6SKJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'ain-ebel-sanad-final';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTab, setCurrentTab] = useState("login");
  const [toast, setToast] = useState("");

  // في حال البناء على Vercel، نتجنب الوصول المباشر للمتصفح
  useEffect(() => {
    if (typeof window !== 'undefined') {
        signInAnonymously(auth).catch(console.error);
    }
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 p-4">
      {toast && <div className="fixed top-4 bg-teal-600 text-white p-4 rounded-lg">{toast}</div>}
      <h1 className="text-2xl font-bold text-center">نظام سند - بلدية عين إبل</h1>
      {/* هنا يمكنك إضافة بقية مكونات التطبيق التي عملنا عليها */}
      <div className="mt-10 text-center">التطبيق جاهز للتشغيل على السيرفر</div>
    </div>
  );
}
