import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  writeBatch, 
  increment, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { monthlySnapshotService } from './monthlySnapshotService';

/**
 * Service to handle Social Debt logic with overpayment/flip support
 */
export const socialService = {
  /**
   * Internal logic to prepare a social resolution for a batch
   * Returns metadata needed for the transaction log
   */
  async prepareSocialResolution(userId: string, socialId: string, amount: number, transType: 'DEBIT' | 'CREDIT', _action: 'SETTLE' | 'ADD' | 'GENERAL', batch: any) {
    const socialRef = doc(db, 'users', userId, 'socials', socialId);
    const socialSnap = await getDoc(socialRef);
    if (!socialSnap.exists()) throw new Error('Person not found');
    
    const person = socialSnap.data();
    const balance = person.totalAmount - person.amountSettled;
    let flippedId: string | undefined;

    // Polarity Engine: Determine real math intent
    // LENT + DEBIT = ADDING to debt
    // BORROWED + CREDIT = ADDING to debt
    // Everything else = SETTLING debt
    const isAddingToDebt = (person.type === 'LENT' && transType === 'DEBIT') || 
                           (person.type === 'BORROWED' && transType === 'CREDIT');
    
    const effectiveAction = isAddingToDebt ? 'ADD' : 'SETTLE';

    if (effectiveAction === 'ADD') {
      batch.update(socialRef, {
        totalAmount: increment(amount),
        updatedAt: serverTimestamp()
      });
    } else {
      // SETTLE logic
      if (amount >= balance) {
        const surplus = amount - balance;
        if (surplus > 0) {
          batch.update(socialRef, {
            isSettled: true,
            amountSettled: person.totalAmount,
            settledAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            flipNote: `Flipped with surplus ₹${surplus}`
          });
          
          const newSocialRef = doc(collection(db, 'users', userId, 'socials'));
          flippedId = newSocialRef.id;
          batch.set(newSocialRef, {
            personName: person.personName,
            type: person.type === 'BORROWED' ? 'LENT' : 'BORROWED',
            totalAmount: surplus,
            amountSettled: 0,
            date: new Date().toISOString(),
            isSettled: false,
            createdAt: serverTimestamp(),
            userId
          });
        } else {
          batch.update(socialRef, {
            isSettled: true,
            amountSettled: person.totalAmount,
            settledAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } else {
        batch.update(socialRef, {
          amountSettled: increment(amount),
          updatedAt: serverTimestamp()
        });
      }
    }

    return {
      personName: person.personName,
      type: person.type,
      flippedId: flippedId || null,
      transType: person.type === 'BORROWED' ? (isAddingToDebt ? 'CREDIT' : 'DEBIT') : (isAddingToDebt ? 'DEBIT' : 'CREDIT'),
      isDebit: person.type === 'BORROWED' ? !isAddingToDebt : isAddingToDebt
    };
  },

  /**
   * Internal logic to prepare a new social debt for a batch
   */
  async prepareSocialCreation(userId: string, data: any, batch: any) {
    const socialRef = doc(collection(db, 'users', userId, 'socials'));
    batch.set(socialRef, {
      ...data,
      amountSettled: 0,
      date: new Date().toISOString(),
      isSettled: false,
      createdAt: serverTimestamp(),
      userId
    });

    const isDebit = data.type === 'LENT';
    return {
      socialId: socialRef.id,
      personName: data.personName,
      type: data.type,
      transType: isDebit ? 'EXPENSE' : 'INCOME',
      isDebit
    };
  },

  /**
   * Legacy One-off resolution (for non-Nexus usage if needed)
   */
  async resolveSocialPayment(userId: string, socialId: string, amount: number, accountId: string, transType: 'DEBIT' | 'CREDIT') {
    const batch = writeBatch(db);
    const meta = await this.prepareSocialResolution(userId, socialId, amount, transType, 'SETTLE', batch);
    
    // Create Transaction
    const transRef = doc(collection(db, 'users', userId, 'transactions'));
    const isAddingToDebt = (meta.type === 'LENT' && transType === 'DEBIT') || 
                           (meta.type === 'BORROWED' && transType === 'CREDIT');

    batch.set(transRef, {
      type: meta.transType,
      amount,
      description: `${isAddingToDebt ? 'Added to' : 'Settled'} debt with ${meta.personName}`,
      accountId,
      category: 'Social',
      date: new Date().toISOString(),
      isReminder: false,
      socialId,
      ...(meta.flippedId && { flippedSocialId: meta.flippedId }),
      createdAt: serverTimestamp()
    });

    // Update Account
    const accountRef = doc(db, 'users', userId, 'accounts', accountId);
    batch.update(accountRef, {
      balance: increment(meta.isDebit ? -amount : amount)
    });

    await batch.commit();
    await monthlySnapshotService.recalculateOrInitMonthlySnapshot(userId);
  },

  async createSocialDebt(userId: string, data: any) {
    const batch = writeBatch(db);
    const meta = await this.prepareSocialCreation(userId, data, batch);

    const transRef = doc(collection(db, 'users', userId, 'transactions'));
    batch.set(transRef, {
      type: meta.transType,
      amount: data.totalAmount,
      description: `${data.type === 'LENT' ? 'Lent money to' : 'Borrowed money from'} ${data.personName}`,
      accountId: data.accountId,
      category: 'Social',
      date: new Date().toISOString(),
      isReminder: false,
      socialId: meta.socialId,
      createdAt: serverTimestamp()
    });

    const accountRef = doc(db, 'users', userId, 'accounts', data.accountId);
    batch.update(accountRef, {
      balance: increment(meta.isDebit ? -data.totalAmount : data.totalAmount)
    });

    await batch.commit();
    await monthlySnapshotService.recalculateOrInitMonthlySnapshot(userId);
  }
};
