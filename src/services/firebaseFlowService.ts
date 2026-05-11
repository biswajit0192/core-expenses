import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDocs,
  getDoc,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { transactionService } from './transactionService';
import { getMonthKeysInRange } from '@/utils/dateUtils';
import { monthlySnapshotService } from './monthlySnapshotService';

const COLLECTIONS = {
  TENURE: 'tenures',
  MONTHLY: 'monthlies',
  SOCIAL: 'socials'
};

export const firebaseFlowService = {
  // Add item
  async addFlow(userId: string, data: any, type: keyof typeof COLLECTIONS) {
    const colRef = collection(db, 'users', userId, COLLECTIONS[type]);
    
    // Phase 6.9: Auto-History Logic
    let autoPaidMonths: string[] = [];
    if (type === 'TENURE' || type === 'MONTHLY') {
      // For Monthly, use the selected Next Bill Date as the reference for initialization
      const referenceDate = type === 'MONTHLY' ? data.nextBillDate : (data.startDate || data.startedAt);
      if (referenceDate) {
        autoPaidMonths = getMonthKeysInRange(referenceDate, new Date().toISOString());
      }
    }

    const result = await addDoc(colRef, {
      ...data,
      userId,
      isSettled: false,
      paidMonths: autoPaidMonths,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Trigger STS Recalculation
    await monthlySnapshotService.recalculateOrInitMonthlySnapshot(userId);

    return result;
  },

  // Update item
  async updateFlow(userId: string, id: string, data: any, type: keyof typeof COLLECTIONS) {
    const docRef = doc(db, 'users', userId, COLLECTIONS[type], id);
    
    // Phase 7.3: Automatic History Sync on Date Edit
    if (type === 'TENURE' || type === 'MONTHLY') {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const oldData = docSnap.data();
        
        const newDate = type === 'MONTHLY' ? data.nextBillDate : data.startDate;
        const oldDate = type === 'MONTHLY' ? oldData.nextBillDate : oldData.startDate;

        // If date is modified, re-anchor history (Wipe & Re-evaluate)
        if (newDate && oldDate && newDate !== oldDate) {
          console.log(`[FlowService] Date change detected (${oldDate} -> ${newDate}), re-anchoring history.`);
          data.paidMonths = getMonthKeysInRange(newDate, new Date().toISOString());
        }
      }
    }

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });

    // Trigger STS Recalculation
    await monthlySnapshotService.recalculateOrInitMonthlySnapshot(userId);
  },

  // Archive/Settle item
  async settleFlow(userId: string, id: string, type: keyof typeof COLLECTIONS) {
    const docRef = doc(db, 'users', userId, COLLECTIONS[type], id);
    await updateDoc(docRef, {
      isSettled: true,
      settledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Trigger STS Recalculation
    await monthlySnapshotService.recalculateOrInitMonthlySnapshot(userId);
  },

  // Hard Delete item
  async deleteFlow(userId: string, id: string, type: keyof typeof COLLECTIONS) {
    const docRef = doc(db, 'users', userId, COLLECTIONS[type], id);
    await deleteDoc(docRef);

    // Trigger STS Recalculation
    await monthlySnapshotService.recalculateOrInitMonthlySnapshot(userId);
  },

  // Find subscription by exact name (case-insensitive)
  async findSubscriptionByName(userId: string, providerName: string): Promise<any> {
    const colRef = collection(db, 'users', userId, COLLECTIONS.MONTHLY);
    const snapshot = await getDocs(colRef);
    const target = providerName.toLowerCase().trim();
    
    // Find the first matching provider
    const match = snapshot.docs.find(doc => {
      const data = doc.data();
      return data.provider && data.provider.toLowerCase().trim() === target;
    });
    
    if (match) {
      return { id: match.id, ...match.data() };
    }
    return null;
  },

  // Find personal debt by exact name (case-insensitive) prioritizing active
  async findPersonalDebtByName(userId: string, personName: string): Promise<any> {
    const colRef = collection(db, 'users', userId, COLLECTIONS.SOCIAL);
    const snapshot = await getDocs(colRef);
    const target = personName.toLowerCase().trim();
    
    let activeMatch = null;
    let settledMatch = null;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.personName && data.personName.toLowerCase().trim() === target) {
        if (data.isSettled) {
          settledMatch = { id: doc.id, ...data };
        } else {
          activeMatch = { id: doc.id, ...data };
        }
      }
    });
    
    return activeMatch || settledMatch || null;
  },

  // Mark month as paid
  async togglePaidMonth(userId: string, id: string, type: 'TENURE' | 'MONTHLY', monthKey: string, isPaid: boolean) {
    const docRef = doc(db, 'users', userId, COLLECTIONS[type], id);
    
    // 1. Update the Bill Doc
    await updateDoc(docRef, {
      paidMonths: isPaid ? arrayUnion(monthKey) : arrayRemove(monthKey),
      updatedAt: serverTimestamp()
    });

    // 2. Automated Background Transaction
    if (isPaid) {
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const item = docSnap.data();
          
          // Auto-settle if fully paid
          if (type === 'TENURE' && item.totalMonths) {
            const currentPaid = item.paidMonths || [];
            if (currentPaid.length >= item.totalMonths) {
              await updateDoc(docRef, { isSettled: true });
            }
          }

          const amount = item.monthlyEmi || item.amount || 0;
          const title = item.title || item.provider || 'Bill Payment';
          const accountId = item.accountId || 'account_main';
          const category = type; // TENURE or MONTHLY

          await transactionService.addTransaction(userId, {
            type: 'EXPENSE',
            amount,
            description: title,
            accountId,
            category,
            isRecurringHit: true,
            date: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error("Automated background transaction failed:", e);
      }
    }

    // 3. Trigger STS Recalculation (marking paid reduces fixed hit)
    await monthlySnapshotService.recalculateOrInitMonthlySnapshot(userId);
  },

  // Get single item
  async getFlow(userId: string, id: string, type: keyof typeof COLLECTIONS): Promise<any> {
    const docRef = doc(db, 'users', userId, COLLECTIONS[type], id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  // Listeners
  subscribeToFlows(userId: string, type: keyof typeof COLLECTIONS, callback: (items: any[]) => void) {
    const colRef = collection(db, 'users', userId, COLLECTIONS[type]);
    const q = query(colRef);

    return onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Normalize type and category for strict UI filters
            type: (data.type || '').toUpperCase(),
            category: data.category || 'Other'
          };
        });
        callback(items);
      },
      (error) => {
        console.error(`Firestore [${type}] subscription error:`, error);
        // Return empty array on permission error to prevent UI hanging
        if (error.code === 'permission-denied') {
          callback([]);
        }
      }
    );
  },

  // Auto-Migration from Session Storage
  async autoMigrate(userId: string) {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const MIGRATION_KEY = `migrated_v3_nested_${userId}`;
      const hasAlreadyMigrated = localStorage.getItem(MIGRATION_KEY);
      if (hasAlreadyMigrated) return;

      // Check the new nested path
      const q = query(collection(db, 'users', userId, COLLECTIONS.TENURE));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        localStorage.setItem(MIGRATION_KEY, 'true');
        return;
      }

      const batch = writeBatch(db);
      
      // Correct Keys from flowService.ts
      const sessionFixed = JSON.parse(sessionStorage.getItem('core_fixed') || '[]');
      const sessionSubs = JSON.parse(sessionStorage.getItem('core_subs') || '[]');
      const sessionPersonal = JSON.parse(sessionStorage.getItem('core_personal') || '[]');

      if (sessionFixed.length > 0) {
        sessionFixed.forEach((item: any) => {
          const ref = doc(collection(db, 'users', userId, COLLECTIONS.TENURE));
          batch.set(ref, { ...item, userId, isSettled: false, paidMonths: [], createdAt: serverTimestamp() });
        });
      }

      if (sessionSubs.length > 0) {
        sessionSubs.forEach((item: any) => {
          const ref = doc(collection(db, 'users', userId, COLLECTIONS.MONTHLY));
          batch.set(ref, { ...item, userId, isSettled: false, paidMonths: [], createdAt: serverTimestamp() });
        });
      }

      if (sessionPersonal.length > 0) {
        sessionPersonal.forEach((item: any) => {
          const ref = doc(collection(db, 'users', userId, COLLECTIONS.SOCIAL));
          batch.set(ref, { ...item, userId, isSettled: false, createdAt: serverTimestamp() });
        });
      }

      if (sessionFixed.length > 0 || sessionSubs.length > 0 || sessionPersonal.length > 0) {
        await batch.commit();
      }

      localStorage.setItem(MIGRATION_KEY, 'true');

      // --- Phase 8: Reminder Type Migration ---
      const REMINDER_MIGRATION_KEY = `migrated_reminders_type_${userId}`;
      if (!localStorage.getItem(REMINDER_MIGRATION_KEY)) {
        const remindersRef = collection(db, 'users', userId, 'reminders');
        const remindersSnap = await getDocs(remindersRef);
        const reminderBatch = writeBatch(db);
        let count = 0;

        remindersSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (!data.type) {
            const type = data.reminderDate ? 'notify' : 'note';
            reminderBatch.update(docSnap.ref, { type });
            count++;
          }
        });

        if (count > 0) {
          await reminderBatch.commit();
        }
        localStorage.setItem(REMINDER_MIGRATION_KEY, 'true');
      }

    } catch (error) {
      console.error("Auto-migration failed (check security rules):", error);
    }
  }
};
