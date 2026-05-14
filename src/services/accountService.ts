import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import type { Account } from '@/types';

export const accountService = {
  /**
   * Check if user has accounts. If not, create defaults.
   * Also cleans up any duplicated accounts with auto-generated IDs.
   */
  async initializeDefaultAccounts(userId: string) {
    const accountsRef = collection(db, 'users', userId, 'accounts');
    const querySnapshot = await getDocs(accountsRef);

    // Only "Seed" if the collection is completely empty AND user is online
    // This prevents accidental seeding of empty accounts if the network is down and persistence is still hydrating
    if (querySnapshot.empty && typeof navigator !== 'undefined' && navigator.onLine) {
      console.log('Seeding default accounts for user:', userId);
      
      const defaults: Partial<Account>[] = [
        {
          id: 'account_main',
          name: 'MAIN',
          type: 'Salary',
          accountCategory: 'Spending',
          balance: 0,
          budget: 0,
          isSelected: true,
          theme: 'blue',
          priority: 1
        },
        {
          id: 'account_savings',
          name: 'SAVINGS',
          type: 'Savings',
          accountCategory: 'Savings',
          balance: 0,
          isSelected: false,
          theme: 'green',
          priority: 2
        },
        {
          id: 'account_emergency',
          name: 'EMERGENCY',
          type: 'Emergency',
          accountCategory: 'Savings',
          balance: 0,
          isSelected: false,
          theme: 'red',
          priority: 3
        }
      ];

      for (const account of defaults) {
        await setDoc(doc(accountsRef, account.id!), account);
      }
    } else {
      // Optional: Cleanup logic for existing duplicates with auto-generated IDs
      const defaultIds = ['account_main', 'account_savings', 'account_emergency'];
      const defaultNames = ['MAIN', 'SAVINGS', 'EMERGENCY'];

      const duplicateDocs = querySnapshot.docs.filter(docSnap => {
        const data = docSnap.data();
        return !defaultIds.includes(docSnap.id) && defaultNames.includes(data.name);
      });

      for (const dup of duplicateDocs) {
        console.log('Cleaning up duplicate account:', dup.id);
        await deleteDoc(doc(accountsRef, dup.id));
      }
    }
  },



  /**
   * Create a new custom account with default priority
   */
  async createAccount(userId: string, accountData: Omit<Account, 'id' | 'priority'>) {
    const accountsRef = collection(db, 'users', userId, 'accounts');
    const newAccountRef = doc(accountsRef);
    
    const newAccount: Account = {
      ...accountData,
      id: newAccountRef.id,
      priority: Date.now() // Custom accounts appear after the big three
    };

    await setDoc(newAccountRef, newAccount);
    return newAccount;
  },


  /**
   * Toggle account selection for dashboard balance
   */
  async toggleAccountSelection(userId: string, accountId: string, isSelected: boolean) {
    const accountRef = doc(db, 'users', userId, 'accounts', accountId);
    await updateDoc(accountRef, { isSelected });
  },

  /**
   * Update full account object
   */
  async updateAccount(userId: string, accountId: string, updates: Partial<Account>) {
    const accountRef = doc(db, 'users', userId, 'accounts', accountId);
    await updateDoc(accountRef, updates);
  },

  /**
   * Delete an existing account
   */
  async deleteAccount(userId: string, accountId: string) {
    const accountRef = doc(db, 'users', userId, 'accounts', accountId);
    await deleteDoc(accountRef);
  }
};

