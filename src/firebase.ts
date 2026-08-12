import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBXRCEqrknl_MMcucEGu-mjFk6OekxtAJs",
  authDomain: "sol-ar.firebaseapp.com",
  projectId: "sol-ar",
  storageBucket: "sol-ar.firebasestorage.app",
  messagingSenderId: "74965414377",
  appId: "1:74965414377:web:3a3924272b66a9716d5b78",
  measurementId: "G-DBZ150Z7GQ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
