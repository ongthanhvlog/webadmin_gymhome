// src/services/firebaseAuth.ts
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function loginWithFirebase({ username, password }: { username: string, password: string }) {
  try {
    // nếu user nhập username (không phải email), bạn có thể map username->email
    const email = username.includes('@') ? username : username; // adjust if using ten_dang_nhap -> email lookup
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // lấy document role từ Firestore (theo email hoặc uid)
    const q = query(collection(db, 'DanhSachTaiKhoan'), where('email', '==', cred.user.email));
    const snap = await getDocs(q);
    const doc = snap.docs[0]?.data() ?? null;

    return { status: 'ok', user: cred.user, profile: doc };
  } catch (error: any) {
    return { status: 'error', error: error.message || error };
  }
}
