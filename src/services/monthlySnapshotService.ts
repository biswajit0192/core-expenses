import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  collection,
  getDocs
} from 'firebase/firestore';
import type { Account, Tenure, Monthly, MonthlySnapshot } from '@/types';

export const monthlySnapshotService = {
  /**
   * Get snapshot for a specific month
   */
  async getSnapshot(userId: string, monthKey: string): Promise<MonthlySnapshot | null> {
    const docRef = doc(db, 'users', userId, 'monthlySnapshots', monthKey);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as MonthlySnapshot;
    }
    return null;
  },

  /**
   * Initialize a new snapshot
   * Logic: 
   * 1. Sum Spending Account Balances
   * 2. Sum UNPAID Tenures & Monthlies for this month (Smart Catch-up)
   * 3. initialSTS = Balance - Unpaid Bills
   */
  async initializeSnapshot(
    userId: string, 
    monthKey: string, 
    accounts: Account[], 
    tenures: Tenure[], 
    monthlies: Monthly[]
  ): Promise<MonthlySnapshot> {
    // 1. Sum Spending Account Balances
    const initialBalance = accounts
      .filter(a => (a.accountCategory === 'Spending' || a.includeInSafeToSpend) && a.isSelected)
      .reduce((sum, a) => sum + a.balance, 0);

    // 2. Sum UNPAID Items for this monthKey (Strict Month Guard)
    const unpaidTenures = tenures
      .filter(t => {
        const itemMonthKey = (t.startDate || '').slice(0, 7);
        return !t.isSettled && itemMonthKey <= monthKey && !t.paidMonths?.includes(monthKey);
      })
      .reduce((sum, t) => sum + (t.monthlyEmi || 0), 0);

    const unpaidMonthlies = monthlies
      .filter(m => {
        const itemMonthKey = (m.nextBillDate || '').slice(0, 7);
        return !m.isSettled && itemMonthKey <= monthKey && !m.paidMonths?.includes(monthKey);
      })
      .reduce((sum, m) => {
        const amount = m.amount || 0;
        const monthlyAmount = m.cycle === 'YEARLY' ? amount / 12 : amount;
        return sum + monthlyAmount;
      }, 0);

    const fixedHit = unpaidTenures + unpaidMonthlies;
    const initialSTS = initialBalance - fixedHit;

    const snapshot: MonthlySnapshot = {
      id: monthKey,
      monthKey,
      initialBalance,
      fixedHit,
      initialSTS,
      currentSTS: initialSTS, // Start here
      snapshotDate: new Date().toISOString(),
      createdAt: serverTimestamp()
    };

    const docRef = doc(db, 'users', userId, 'monthlySnapshots', monthKey);
    await setDoc(docRef, snapshot);

    return snapshot;
  },

  /**
   * Account-Triggered Logic: 
   * Performs a fresh summation from Firestore (SOT) and overwrites STS.
   */
  /**
   * Universal Recalculation Trigger (Source of Truth)
   * logic: 
   * 1. Fetch all accounts, tenures, and monthlies directly from Firestore.
   * 2. Calculate the post-hit STS.
   * 3. Overwrite/Sync the monthly snapshot.
   */
  async recalculateOrInitMonthlySnapshot(userId: string): Promise<MonthlySnapshot | null> {
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // 1. Fetch EVERYTHING directly from Firestore (Source of Truth Sync)
    const accountsRef = collection(db, 'users', userId, 'accounts');
    const tenuresRef = collection(db, 'users', userId, 'tenures');
    const monthliesRef = collection(db, 'users', userId, 'monthlies');

    const [accountsSnap, tenuresSnap, monthliesSnap] = await Promise.all([
      getDocs(accountsRef),
      getDocs(tenuresRef),
      getDocs(monthliesRef)
    ]);

    const accounts = accountsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
    const tenures = tenuresSnap.docs.map(d => ({ id: d.id, ...d.data() } as Tenure));
    const monthlies = monthliesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Monthly));

    if (accounts.length === 0) return null;

    const docRef = doc(db, 'users', userId, 'monthlySnapshots', monthKey);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log(`[SnapshotService] No snapshot for ${monthKey}. Initializing...`);
      return await this.initializeSnapshot(userId, monthKey, accounts, tenures, monthlies);
    }

    // UPDATE LOGIC: Fresh Overwrite using preserved math
    const oldSnapshot = docSnap.data() as MonthlySnapshot;

    // 1. Recalculate Initial Balance
    const newInitialBalance = accounts
      .filter(a => (a.accountCategory === 'Spending' || a.includeInSafeToSpend) && a.isSelected)
      .reduce((sum, a) => sum + a.balance, 0);

    // 2. Recalculate Fixed Hit (Strict Month Guard)
    const unpaidTenures = tenures
      .filter(t => {
        const itemMonthKey = (t.startDate || '').slice(0, 7);
        return !t.isSettled && itemMonthKey <= monthKey && !t.paidMonths?.includes(monthKey);
      })
      .reduce((sum, t) => sum + (t.monthlyEmi || 0), 0);

    const unpaidMonthlies = monthlies
      .filter(m => {
        const itemMonthKey = (m.nextBillDate || '').slice(0, 7);
        return !m.isSettled && itemMonthKey <= monthKey && !m.paidMonths?.includes(monthKey);
      })
      .reduce((sum, m) => {
        const amount = m.amount || 0;
        const monthlyAmount = m.cycle === 'YEARLY' ? amount / 12 : amount;
        return sum + monthlyAmount;
      }, 0);

    const newFixedHit = unpaidTenures + unpaidMonthlies;
    const newInitialSTS = newInitialBalance - newFixedHit;

    // 3. DATA INTEGRITY GUARD: 
    // If the calculated STS is 0, but the previous snapshot had a balance,
    // this is likely a hydration/network gap. DO NOT OVERWRITE.
    if (newInitialSTS === 0 && oldSnapshot.initialBalance > 0) {
      console.warn(`[SnapshotService] Data Integrity Guard Triggered: Refusing to overwrite Balance ${oldSnapshot.initialBalance} with 0.`);
      return oldSnapshot;
    }

    // 4. ATOMIC OVERWRITE (Strict Phase 6.7.1 Logic)
    const updatedFields: Partial<MonthlySnapshot> = {
      initialBalance: newInitialBalance,
      fixedHit: newFixedHit,
      initialSTS: newInitialSTS,
      currentSTS: newInitialSTS // Reset to new baseline
    };

    console.log(`[SnapshotService] Syncing STS for ${monthKey}: Balance ${newInitialBalance} - Hit ${newFixedHit} = ${newInitialSTS}`);
    await setDoc(docRef, updatedFields, { merge: true });

    return { ...oldSnapshot, ...updatedFields } as MonthlySnapshot;
  }
};
