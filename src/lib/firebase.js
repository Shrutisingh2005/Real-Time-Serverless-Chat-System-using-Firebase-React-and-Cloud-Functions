import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "realtime-chat-shruti.firebaseapp.com",
  projectId: "realtime-chat-shruti",
  storageBucket: "realtime-chat-shruti.firebasestorage.app",
  messagingSenderId: "785900653899",
  appId: "1:785900653899:web:eadbe49062610b74e76cce",
  measurementId: "G-DRC75GJHHQ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth()
export const db = getFirestore()
export const storage = getStorage()