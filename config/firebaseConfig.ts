import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; 

const firebaseConfig = {
  apiKey: "AIzaSyC_zEFn_LZ9N8LqtT2JDGsxwpj_VqPwako",
  authDomain: "gymhome-4953.firebaseapp.com",
  projectId: "gymhome-4953",
  storageBucket: "gymhome-4953.firebasestorage.app", 
  messagingSenderId: "1042557616594",
  appId: "1:1042557616594:web:046069d57d12d77801c80b",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); 