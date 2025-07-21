import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration - using demo project for hackathon
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "sanctuary-mesh-demo.firebaseapp.com",
  projectId: "sanctuary-mesh-demo",
  storageBucket: "sanctuary-mesh-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;