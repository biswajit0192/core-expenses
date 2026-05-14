import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

interface UserData {
  username: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  spendableAccountId: string;
  notificationsEnabled?: boolean;
  fcmTokens?: string[];
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  isCloudSynced: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  signUp: (email: string, username: string, pass: string) => Promise<void>;
  login: (identifier: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);

  async function signUp(email: string, username: string, pass: string) {
    // Step A: Check uniqueness
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error('Username is already taken.');
    }

    // Step B: Create Auth account
    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    
    // Step C: Create Firestore document
    await setDoc(doc(db, 'users', user.uid), {
      username,
      email,
      createdAt: new Date().toISOString(),
      spendableAccountId: 'account_main'
    });
  }

  async function login(identifier: string, pass: string) {
    let emailToUse = identifier;

    // Step A: Check if identifier is a username
    if (!identifier.includes('@')) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', identifier));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Username not found.');
      }
      
      emailToUse = querySnapshot.docs[0].data().email;
    }

    await signInWithEmailAndPassword(auth, emailToUse, pass);
  }

  function logout() {
    return signOut(auth);
  }

  async function deleteAccount() {
    if (!currentUser) throw new Error('No user to delete');

    // 1. Pre-flight check for "Recent Login"
    const lastSignInTime = currentUser.metadata.lastSignInTime;
    if (lastSignInTime) {
      const fiveMinutes = 5 * 60 * 1000;
      const isRecent = (Date.now() - new Date(lastSignInTime).getTime()) < fiveMinutes;
      
      if (!isRecent) {
        const err: any = new Error('Re-authentication required');
        err.code = 'auth/requires-recent-login';
        throw err;
      }
    }

    const userId = currentUser.uid;
    const batch = writeBatch(db);

    // List of subcollections to wipe
    const subCollections = [
      'accounts',
      'transactions',
      'reminders',
      'monthlies',
      'tenures',
      'socials',
      'monthlySnapshots'
    ];

    try {
      // 2. Delete all documents in subcollections
      for (const colName of subCollections) {
        const colRef = collection(db, 'users', userId, colName);
        const snap = await getDocs(colRef);
        snap.docs.forEach((doc) => batch.delete(doc.ref));
      }

      // 3. Delete the user document itself
      const userDocRef = doc(db, 'users', userId);
      batch.delete(userDocRef);

      // 4. Commit Firestore changes
      await batch.commit();

      // 5. Finally, delete Auth user
      await currentUser.delete();
    } catch (err) {
      console.error('[AuthContext] Failed to delete account:', err);
      throw err;
    }
  }

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      
      if (user) {
        unsubscribeFirestore = onSnapshot(doc(db, 'users', user.uid), { includeMetadataChanges: true }, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            setUserData(data);
            
            // Sync remote photoURL to local storage for offline fallback
            if (data.photoURL) {
              import('@/utils/profileImage').then(m => m.saveLocalProfileImage(data.photoURL!));
            }

            // Metadata-driven sync status
            setIsCloudSynced(!docSnap.metadata.fromCache);
            setIsSyncing(docSnap.metadata.hasPendingWrites);
          }
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
        setIsCloudSynced(false);
        setIsSyncing(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    isCloudSynced,
    isSyncing,
    isOnline,
    signUp,
    login,
    logout,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

