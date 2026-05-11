import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query,
  orderBy
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { accountService } from '@/services/accountService';
import type { Account } from '@/types';

export function useAccounts() {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;
    console.log("Current User UID inside Hook:", userId);

    if (!userId) return;

    // 1. Initialize defaults if needed
    accountService.initializeDefaultAccounts(userId);

    // 2. Listen to accounts sub-collection
    const accountsRef = collection(db, 'users', userId, 'accounts');
    const q = query(accountsRef, orderBy('priority', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accountsData: Account[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as Account;
        
        // Defensive Logic: Explicitly map doc.id to the object
        const accountWithPriority = {
          ...data,
          id: doc.id,
          priority: data.priority ?? 999
        };

        accountsData.push(accountWithPriority);
      });

      // Secondary JS sort to catch any "default 999" items 
      accountsData.sort((a, b) => a.priority - b.priority);

      setAccounts(accountsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching accounts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Derive specialized information for the Dashboard Header
  const allSpendingAccounts = useMemo(() => 
    accounts.filter(a => a.accountCategory === 'Spending' && a.isSelected), 
  [accounts]);
  
  const spendingAccountsLabel = useMemo(() => 
    allSpendingAccounts.map(a => a.name).join(' + '),
  [allSpendingAccounts]);

  const totalSpendingBalance = useMemo(() => 
    allSpendingAccounts.reduce((sum, a) => sum + a.balance, 0),
  [allSpendingAccounts]);

  const totalSpendingBudget = useMemo(() => 
    allSpendingAccounts.reduce((sum, a) => sum + (a.budget || 0), 0),
  [allSpendingAccounts]);

  const spentPercentage = useMemo(() => {
    if (totalSpendingBudget <= 0) return null;
    // Formula: (Budget - Balance) / Budget
    const spent = totalSpendingBudget - totalSpendingBalance;
    return Math.max(0, Math.round((spent / totalSpendingBudget) * 100));
  }, [totalSpendingBudget, totalSpendingBalance]);

  return { 
    accounts, 
    allSpendingAccounts,
    spendingAccountsLabel,
    totalSpendingBalance,
    totalSpendingBudget,
    spentPercentage,
    loading 
  };
}

