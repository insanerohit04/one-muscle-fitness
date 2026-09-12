import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCcr77mwJGXjAlNLu26MHlNrKRkL97K1cU",
  authDomain: "one-muscle-fitness-d394c.firebaseapp.com",
  projectId: "one-muscle-fitness-d394c",
  storageBucket: "one-muscle-fitness-d394c.firebasestorage.app",
  messagingSenderId: "121574997411",
  appId: "1:121574997411:web:a6cc5898e7153c0a282e16",
  measurementId: "G-KM8ZQ4T5JP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;