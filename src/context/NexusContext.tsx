import { createContext, useContext, useState, useEffect } from 'react';
import type { Transaction } from '@/types';
import { socialService } from '@/services/socialService';
import { monthlySnapshotService } from '@/services/monthlySnapshotService';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { 
  writeBatch, 
  doc, 
  collection, 
  increment, 
  serverTimestamp, 
  getDoc,
  Timestamp 
} from 'firebase/firestore';

const NEXUS_PERSISTENCE_KEY = 'nexus_staged_items';

interface NexusContextType {
  isNexusOpen: boolean;
  openNexus: () => void;
  closeNexus: () => void;
  toggleNexus: () => void;
  // Persistent Staged Items
  localTransactions: Transaction[];
  localReminders: any[];
  addLocalItems: (items: any[]) => void;
  toggleLocalReminder: (id: string, current: boolean) => void;
  clearAllStagedItems: () => void;
  removeStagedItem: (id: string) => void;
  updateStagedItem: (id: string, updates: Partial<Transaction>) => void;
  commitStagedItems: () => Promise<void>;
  loadingCommit: boolean;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

export const NexusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [isNexusOpen, setIsNexusOpen] = useState(false);
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);
  const [localReminders, setLocalReminders] = useState<any[]>([]);
  const [loadingCommit, setLoadingCommit] = useState(false);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(NEXUS_PERSISTENCE_KEY);
    if (saved) {
      try {
        const { txs, reminders } = JSON.parse(saved);
        setLocalTransactions(txs || []);
        setLocalReminders(reminders || []);
      } catch (e) {
        console.error('[NexusContext] Failed to parse stored items:', e);
      }
    }
  }, []);

  // 2. Continuous Sync to LocalStorage
  useEffect(() => {
    const data = { txs: localTransactions, reminders: localReminders };
    localStorage.setItem(NEXUS_PERSISTENCE_KEY, JSON.stringify(data));
  }, [localTransactions, localReminders]);

  const openNexus = () => setIsNexusOpen(true);
  const closeNexus = () => setIsNexusOpen(false);
  const toggleNexus = () => setIsNexusOpen(prev => !prev);

  const addLocalItems = (items: any[]) => {
    const txs: Transaction[] = [];
    const reminders: any[] = [];

    items.forEach(item => {
      const enriched = { 
        ...item, 
        id: item.id || crypto.randomUUID(), 
        isLocal: true,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      };
      if (item.type === 'TRANSACTION') {
        txs.push({
          ...enriched,
          type: item.transactionType // Convert 'TRANSACTION' to 'CREDIT' or 'DEBIT'
        } as unknown as Transaction);
      } else {
        reminders.push(enriched);
      }
    });

    setLocalTransactions(prev => [...prev, ...txs]);
    setLocalReminders(prev => [...prev, ...reminders]);
  };

  const removeStagedItem = (id: string) => {
    setLocalTransactions(prev => prev.filter(t => t.id !== id));
    setLocalReminders(prev => prev.filter(r => r.id !== id));
  };

  const toggleLocalReminder = (id: string, current: boolean) => {
    setLocalReminders(prev => prev.map(r => 
      r.id === id ? { ...r, isCompleted: !current } : r
    ));
  };

  const clearAllStagedItems = () => {
    setLocalTransactions([]);
    setLocalReminders([]);
    localStorage.removeItem(NEXUS_PERSISTENCE_KEY);
  };

  const updateStagedItem = (id: string, updates: Partial<Transaction>) => {
    setLocalTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
  };

  const commitStagedItems = async () => {
    if (!currentUser) return;
    if (localTransactions.length === 0 && localReminders.length === 0) return;

    setLoadingCommit(true);
    try {
      const userId = currentUser.uid;
      const batch = writeBatch(db);
      const monthKey = new Date().toISOString().slice(0, 7);

      // 1. FRESHNESS GUARD & PRE-FETCHING
      // We need real-time snapshots of Socials and Accounts BEFORE building the batch
      // to calculate surplus and STS adjustments correctly.
      const socialIds = [...new Set(localTransactions.map(t => t.socialId).filter(Boolean))];
      const accountIds = [...new Set(localTransactions.map(t => t.accountId))];

      const [socialSnaps, accountSnaps] = await Promise.all([
        Promise.all(socialIds.map(id => getDoc(doc(db, 'users', userId, 'socials', id!)))),
        Promise.all(accountIds.map(id => getDoc(doc(db, 'users', userId, 'accounts', id))))
      ]);

      const socialDataMap = Object.fromEntries(socialSnaps.filter(s => s.exists()).map(s => [s.id, s.data()]));
      const accountDataMap = Object.fromEntries(accountSnaps.filter(s => s.exists()).map(s => [s.id, s.data()]));

      let totalStsAdjustment = 0;

      // 2. BUILD THE ATOMIC BATCH
      
      // A. Process Transactions
      for (const tx of localTransactions) {
        let finalTransType = tx.type;
        let finalAmount = tx.amount;
        let isDebitForBank = tx.type === 'DEBIT';
        let isRecurringHit = tx.isRecurringHit || false;
        let logDescription = tx.description;
        let flippedId: string | undefined;

        // Social Sub-Logic
        if ((tx as any).socialAction === 'SETTLE' || (tx as any).socialAction === 'ADD') {
          if ((tx as any).isNewSocialCandidate) {
            const meta = await socialService.prepareSocialCreation(userId, {
              personName: (tx as any).socialTargetName,
              type: (tx as any).socialAction === 'ADD' ? 'LENT' : 'BORROWED',
              totalAmount: tx.amount,
              accountId: tx.accountId
            }, batch);
            
            tx.socialId = meta.socialId;
            finalTransType = meta.transType as any;
            isDebitForBank = meta.isDebit;
            logDescription = `${meta.type === 'LENT' ? 'Lent' : 'Borrowed'} ${tx.amount} to/from ${meta.personName}`;
          } else if (tx.socialId && socialDataMap[tx.socialId]) {
            const meta = await socialService.prepareSocialResolution(
              userId, 
              tx.socialId, 
              tx.amount, 
              tx.type as 'DEBIT' | 'CREDIT',
              (tx as any).socialAction, 
              batch
            );
            flippedId = meta.flippedId || undefined;
            finalTransType = meta.transType as any;
            isDebitForBank = meta.isDebit;
            logDescription = `${(tx as any).socialAction === 'ADD' ? 'Added to' : 'Settled'} debt with ${meta.personName}`;
          }
        }

        // 1. The Transaction Log (Created AFTER social calculation to get flippedId)
        const transRef = doc(collection(db, 'users', userId, 'transactions'));
        
        const transactionData = {
          type: finalTransType,
          amount: finalAmount,
          description: logDescription,
          accountId: tx.accountId,
          category: tx.category,
          date: tx.date || new Date().toISOString(),
          isReminder: tx.isReminder || false,
          isRecurringHit: tx.isRecurringHit || false,
          isLocal: false,
          createdAt: serverTimestamp(),
          // Metadata cleanup: ONLY add these if they have a real value
          ...(tx.socialId && { socialId: tx.socialId }),
          ...(flippedId && { flippedSocialId: flippedId }),
          ...((tx as any).settledSocialId && { settledSocialId: (tx as any).settledSocialId })
        };

        batch.set(transRef, transactionData);

        // 2. The Bank Update
        const accountRef = doc(db, 'users', userId, 'accounts', tx.accountId);
        const adjustment = isDebitForBank ? -finalAmount : finalAmount;
        batch.update(accountRef, { balance: increment(adjustment) });

        // 3. Track STS Adjustment (Freshness Guarded)
        const acc = accountDataMap[tx.accountId];
        if (acc && (acc.accountCategory === 'Spending' || acc.includeInSafeToSpend)) {
          if (finalTransType === 'CREDIT' || finalTransType === 'INCOME') {
            totalStsAdjustment += finalAmount;
          } else if (!isRecurringHit) {
            totalStsAdjustment -= finalAmount;
          }
        }
      }

      // B. Process Reminders
      localReminders.forEach(rem => {
        const remRef = doc(collection(db, 'users', userId, 'reminders'));
        batch.set(remRef, {
          title: rem.title,
          isCompleted: rem.isCompleted ?? false,
          reminderDate: rem.reminderDate ? Timestamp.fromDate(new Date(rem.reminderDate)) : null,
          createdAt: serverTimestamp()
        });
      });

      // C. Apply Global STS Update
      if (totalStsAdjustment !== 0) {
        const snapshotRef = doc(db, 'users', userId, 'monthlySnapshots', monthKey);
        batch.update(snapshotRef, { currentSTS: increment(totalStsAdjustment) });
      }

      // 3. NUCLEAR COMMIT
      await batch.commit();

      // Final Logic: Refresh STS properly and cleanup
      await monthlySnapshotService.recalculateOrInitMonthlySnapshot(userId);
      clearAllStagedItems();
      closeNexus();
    } catch (err) {
      console.error('[NexusContext] Failed atomic commit:', err);
      throw err;
    } finally {
      setLoadingCommit(false);
    }
  };

  return (
    <NexusContext.Provider value={{ 
      isNexusOpen, 
      openNexus, 
      closeNexus, 
      toggleNexus,
      localTransactions,
      localReminders,
      addLocalItems,
      toggleLocalReminder,
      clearAllStagedItems,
      removeStagedItem,
      updateStagedItem,
      commitStagedItems,
      loadingCommit
    }}>
      {children}
    </NexusContext.Provider>
  );
};

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error('useNexus must be used within a NexusProvider');
  }
  return context;
};
