import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// const firebaseConfig = {
//   apiKey: "AIzaSyBv4-TVV4K2RotzRGjMH8sIl5fAwYSRAIw",
//   authDomain: "tienlenmiennam-d2c29.firebaseapp.com",
//   projectId: "tienlenmiennam-d2c29",
//   storageBucket: "tienlenmiennam-d2c29.appspot.com",
//   messagingSenderId: "655535492821",
//   appId: "1:655535492821:web:e408ed52f563bb4f891c5c", // 🔥 web appId, KHÔNG dùng appId Android
// };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
