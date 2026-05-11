import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { MonthlySnapshot } from '@/types';

/**
 * useSafeToSpend Hook
 * Responsibility: Listens to the monthlySnapshot document in real-time.
 * The Snapshot is initialized globally by SnapshotInitializer.
 */
export function useSafeToSpend() {
  const { currentUser } = useAuth();
  const [snapshot, setSnapshot] = useState<MonthlySnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);

  const monthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

  useEffect(() => {
    if (!currentUser) return;

    const snapshotRef = doc(db, 'users', currentUser.uid, 'monthlySnapshots', monthKey);

    const unsubscribe = onSnapshot(snapshotRef, (docSnap) => {
      if (docSnap.exists()) {
        setSnapshot(docSnap.data() as MonthlySnapshot);
      } else {
        setSnapshot(null);
      }
      setLoadingSnapshot(false);
    }, (error) => {
      console.error("[useSafeToSpend] Listener error:", error);
      setLoadingSnapshot(false);
    });

    return () => unsubscribe();
  }, [currentUser, monthKey]);

  return {
    safeToSpend: snapshot?.currentSTS ?? 0,
    snapshotDate: snapshot?.snapshotDate ?? null,
    initialSTS: snapshot?.initialSTS ?? 0,
    loading: loadingSnapshot
  };
}
