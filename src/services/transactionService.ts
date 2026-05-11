import { db } from '@/lib/firebase';
import { 
  collection, 
  writeBatch,
  doc,
  increment,
  serverTimestamp,
  getDoc,
  getDocs,
  arrayUnion,
  runTransaction
} from 'firebase/firestore';
import { getCategoryFromTitle } from '@/utils/categoryMapper';

/**
 * Service for handling transactions with auto-categorization and balance updates
 */
export const transactionService = {
  /**
   * Adds a new transaction and updates account balance atomically
   */
  async addTransaction(userId: string, data: {
    type: 'CREDIT' | 'DEBIT' | 'TRANSFER' | 'INCOME' | 'EXPENSE';
    amount: number;
    description: string;
    date?: string;
    accountId: string;
    category?: string;
    isReminder?: boolean;
    isRecurringHit?: boolean;
  }) {
    const batch = writeBatch(db);
    const category = data.category || getCategoryFromTitle(data.description);
    const transactionId = doc(collection(db, 'users', userId, 'transactions')).id;
    
    let isRecurringHit = data.isRecurringHit || false;
    const monthKey = (data.date || new Date().toISOString()).slice(0, 7) // "YYYY-MM"

    // --- Smart Linking (Fuzzy Match) ---
    // Only check if NOT already flagged as recurring hit and it's an expense
    if (!isRecurringHit && data.type === 'EXPENSE') {
      try {
        const collections = ['tenures', 'monthlies'];
        for (const col of collections) {
          const colRef = collection(db, 'users', userId, col);
          const snap = await getDocs(colRef);
          
          const match = snap.docs.find(docSnap => {
            const bill = docSnap.data();
            if (bill.isSettled) return false;
            
            const billAmount = bill.monthlyEmi || bill.amount || 0;
            const billTitle = (bill.title || bill.provider || '').toLowerCase();
            const txTitle = data.description.toLowerCase();
            
            // Amount must match exactly
            const amountMatch = Math.abs(billAmount - data.amount) < 1; 

            // Fuzzy Name Match (Transaction contains bill keyword or vice versa)
            const titleMatch = txTitle.includes(billTitle) || billTitle.includes(txTitle);
            
            return amountMatch && titleMatch;
          });

          if (match) {
            isRecurringHit = true;
            const billRef = doc(db, 'users', userId, col, match.id);
            batch.update(billRef, {
              paidMonths: arrayUnion(monthKey),
              updatedAt: serverTimestamp()
            });
            break; // Stop after first match
          }
        }
      } catch (e) {
        console.error("Smart Linking failed:", e);
      }
    }

    // 1. Transaction Record
    const transRef = doc(db, 'users', userId, 'transactions', transactionId);
    batch.set(transRef, {
      type: data.type === 'INCOME' ? 'CREDIT' : data.type === 'EXPENSE' ? 'DEBIT' : data.type,
      amount: data.amount,
      description: data.description,
      category,
      date: data.date || new Date().toISOString(),
      accountId: data.accountId,
      isReminder: data.isReminder ?? false,
      isRecurringHit,
      createdAt: serverTimestamp(),
      // Metadata cleanup
      ...((data as any).socialId && { socialId: (data as any).socialId }),
      ...((data as any).flippedSocialId && { flippedSocialId: (data as any).flippedSocialId })
    });

    // 2. Balance Update
    const accountRef = doc(db, 'users', userId, 'accounts', data.accountId);
    const type = data.type === 'INCOME' ? 'CREDIT' : data.type === 'EXPENSE' ? 'DEBIT' : data.type;
    const isCredit = type === 'CREDIT';
    const balanceAdjustment = isCredit ? data.amount : -data.amount;
    
    batch.update(accountRef, {
      balance: increment(balanceAdjustment)
    });

    // 3. STS Snapshot Sync
    // Only update STS if it's a "Spending" account and not a recurring hit (for expenses)
    try {
      const accountSnap = await getDoc(accountRef);
      if (accountSnap.exists()) {
        const acc = accountSnap.data();
        const isSpendingAccount = acc.accountCategory === 'Spending' || acc.includeInSafeToSpend;

        if (isSpendingAccount && type !== 'TRANSFER') {
          const snapshotRef = doc(db, 'users', userId, 'monthlySnapshots', monthKey);
          
          let stsAdjustment = 0;
          if (isCredit) {
            stsAdjustment = data.amount;
          } else if (!isRecurringHit) {
            // Only deduct from STS if it's a NEW variable expense (not a recurring bill hit)
            stsAdjustment = -data.amount;
          }

          if (stsAdjustment !== 0) {
            batch.update(snapshotRef, {
              currentSTS: increment(stsAdjustment)
            });
          }
        }
      }
    } catch (e) {
      console.error("STS sync failed:", e);
    }

    return await batch.commit();
  },

  /**
   * Adds multiple transactions in a single atomic batch and updates balances
   */
  async addTransactionsBatch(userId: string, items: any[]) {
    const batch = writeBatch(db);
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const monthKey = new Date().toISOString().slice(0, 7);

    // To handle multiple items correctly, we need to track STS adjustments per account
    const stsAdjustmentMap: Record<string, number> = {};

    for (const item of items) {
      const newDocRef = doc(transactionsRef);
      const type = item.type === 'INCOME' ? 'CREDIT' : item.type === 'EXPENSE' ? 'DEBIT' : item.type;
      const isCredit = type === 'CREDIT';
      const isRecurringHit = item.isRecurringHit || false;

      batch.set(newDocRef, {
        type,
        amount: item.amount,
        description: item.description,
        category: item.category || 'General',
        date: item.date || new Date().toISOString(),
        accountId: item.accountId,
        isReminder: item.isReminder || false,
        isRecurringHit,
        createdAt: serverTimestamp(),
        // Metadata cleanup
        ...(item.socialId && { socialId: item.socialId }),
        ...(item.flippedSocialId && { flippedSocialId: item.flippedSocialId })
      });

      // Update associated account balance
      const accountRef = doc(db, 'users', userId, 'accounts', item.accountId);
      const balanceAdjustment = isCredit ? item.amount : -item.amount;
      
      batch.update(accountRef, {
        balance: increment(balanceAdjustment)
      });

      // Track STS adjustment if it's a spending account
      try {
        const accountSnap = await getDoc(accountRef);
        if (accountSnap.exists()) {
          const acc = accountSnap.data();
          const isSpendingAccount = acc.accountCategory === 'Spending' || acc.includeInSafeToSpend;

          if (isSpendingAccount && type !== 'TRANSFER') {
            let itemStsAdj = 0;
            if (isCredit) {
              itemStsAdj = item.amount;
            } else if (!isRecurringHit) {
              itemStsAdj = -item.amount;
            }
            stsAdjustmentMap[monthKey] = (stsAdjustmentMap[monthKey] || 0) + itemStsAdj;
          }
        }
      } catch (e) {
        console.error("Batch STS sync failed for item:", e);
      }
    }

    // Apply cumulative STS adjustments
    for (const [mKey, totalAdj] of Object.entries(stsAdjustmentMap)) {
      if (totalAdj !== 0) {
        const snapshotRef = doc(db, 'users', userId, 'monthlySnapshots', mKey);
        batch.update(snapshotRef, {
          currentSTS: increment(totalAdj)
        });
      }
    }

    return await batch.commit();
  },

  /**
   * Deletes a transaction and reconciles balance and STS atomically
   */
  async reconcileDeletion(userId: string, transaction: any) {
    return await runTransaction(db, async (firestoreTransaction) => {
      const transRef = doc(db, 'users', userId, 'transactions', transaction.id);
      const accountRef = doc(db, 'users', userId, 'accounts', transaction.accountId);
      
      const accountSnap = await firestoreTransaction.get(accountRef);
      if (!accountSnap.exists()) throw new Error("Account not found");
      const account = accountSnap.data();

      const type = transaction.type;
      const isCredit = type === 'CREDIT' || type === 'INCOME';
      
      // If we delete a credit, balance goes down. If we delete a debit, balance goes up.
      const balanceAdjustment = isCredit ? -transaction.amount : transaction.amount;
      
      firestoreTransaction.update(accountRef, {
        balance: increment(balanceAdjustment)
      });

      // STS Adjustment
      const isSpendingAccount = account.accountCategory === 'Spending' || account.includeInSafeToSpend;
      const monthKey = transaction.date.slice(0, 7);
      
      if (isSpendingAccount && type !== 'TRANSFER') {
        const snapshotRef = doc(db, 'users', userId, 'monthlySnapshots', monthKey);
        let stsAdjustment = 0;
        
        if (isCredit) {
          stsAdjustment = -transaction.amount;
        } else if (!transaction.isRecurringHit) {
          stsAdjustment = transaction.amount;
        }

        if (stsAdjustment !== 0) {
          firestoreTransaction.update(snapshotRef, {
            currentSTS: increment(stsAdjustment)
          });
        }
      }

      firestoreTransaction.delete(transRef);
    });
  },

  /**
   * Updates a transaction and reconciles balance and STS differences atomically
   */
  async reconcileEdit(userId: string, oldTx: any, newData: { description: string, amount: number }) {
    return await runTransaction(db, async (firestoreTransaction) => {
      const transRef = doc(db, 'users', userId, 'transactions', oldTx.id);
      const accountRef = doc(db, 'users', userId, 'accounts', oldTx.accountId);
      
      const accountSnap = await firestoreTransaction.get(accountRef);
      if (!accountSnap.exists()) throw new Error("Account not found");
      const account = accountSnap.data();

      const type = oldTx.type;
      const isCredit = type === 'CREDIT' || type === 'INCOME';
      const amountDiff = oldTx.amount - newData.amount; 
      
      // If oldAmount=100, newAmount=80, diff=20.
      // If Expense: balance increases by 20.
      // If Income: balance decreases by 20.
      const adjustment = isCredit ? -amountDiff : amountDiff;

      firestoreTransaction.update(accountRef, {
        balance: increment(adjustment)
      });

      // STS Adjustment
      const isSpendingAccount = account.accountCategory === 'Spending' || account.includeInSafeToSpend;
      const monthKey = oldTx.date.slice(0, 7);
      
      if (isSpendingAccount && type !== 'TRANSFER') {
        const snapshotRef = doc(db, 'users', userId, 'monthlySnapshots', monthKey);
        let stsAdjustment = 0;
        
        if (isCredit) {
          stsAdjustment = -amountDiff;
        } else if (!oldTx.isRecurringHit) {
          stsAdjustment = amountDiff;
        }

        if (stsAdjustment !== 0) {
          firestoreTransaction.update(snapshotRef, {
            currentSTS: increment(stsAdjustment)
          });
        }
      }

      firestoreTransaction.update(transRef, {
        description: newData.description,
        amount: newData.amount,
        updatedAt: serverTimestamp()
      });
    });
  }
};
