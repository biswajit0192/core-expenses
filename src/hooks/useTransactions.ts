import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { Transaction } from '@/types';

export function useTransactions(maxItems?: number) {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
    let q = query(transactionsRef, orderBy('date', 'desc'));
    
    if (maxItems) {
      q = query(q, limit(maxItems));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbTxData: Transaction[] = [];
      snapshot.forEach((doc) => {
        dbTxData.push({ id: doc.id, ...doc.data() } as Transaction);
      });

      setTransactions(dbTxData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, maxItems]);

  return { transactions, loading };
}
