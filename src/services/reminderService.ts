import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  getDocs, 
  writeBatch,
  Timestamp 
} from 'firebase/firestore';

export const reminderService = {
  /**
   * Adds a new reminder
   */
  async addReminder(userId: string, data: {
    title: string;
    reminderDate?: Date | null;
    isCompleted?: boolean;
  }) {
    const remindersRef = collection(db, 'users', userId, 'reminders');
    return await addDoc(remindersRef, {
      title: data.title,
      isCompleted: data.isCompleted ?? false,
      reminderDate: data.reminderDate ? Timestamp.fromDate(data.reminderDate) : null,
      createdAt: serverTimestamp()
    });
  },

  /**
   * Toggles a reminder completion status
   */
  async toggleReminder(userId: string, reminderId: string, currentStatus: boolean) {
    const reminderRef = doc(db, 'users', userId, 'reminders', reminderId);
    return await updateDoc(reminderRef, {
      isCompleted: !currentStatus
    });
  },

  /**
   * Clears all reminders for a user (Dev Tool)
   */
  async clearAllReminders(userId: string) {
    const remindersRef = collection(db, 'users', userId, 'reminders');
    const snap = await getDocs(remindersRef);
    
    const batch = writeBatch(db);
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    return await batch.commit();
  },

  /**
   * Migrates specific mock reminders to Firestore (Dev Tool)
   */
  async migrateMockReminders(userId: string) {
    const mocks = [
      { 
        title: 'Remember to check the quarterly dividend from Tech ETF next week.',
        reminderDate: null 
      },
      { 
        title: 'Transfer ₹2000 to holiday fund before flight booking.',
        reminderDate: null 
      },
      { 
        title: 'Send ₹4400 for the train tickets',
        reminderDate: null 
      },
      { 
        title: 'Pay electricity bill of ₹1200 by 15th April',
        reminderDate: new Date('2026-04-15')
      },
      { 
        title: 'Cancel the free trial for the graphic design software',
        reminderDate: null 
      },
      { 
        title: 'Remind me to send ₹430 for movies on 10th April',
        reminderDate: new Date('2026-04-10')
      }
    ];

    for (const m of mocks) {
      await this.addReminder(userId, m);
    }
  },

  /**
   * Adds multiple reminders in a single atomic batch
   */
  async addRemindersBatch(userId: string, items: any[]) {
    const batch = writeBatch(db);
    const remindersRef = collection(db, 'users', userId, 'reminders');

    items.forEach(item => {
      const newDocRef = doc(remindersRef);
      batch.set(newDocRef, {
        title: item.title,
        isCompleted: item.isCompleted ?? false,
        reminderDate: item.reminderDate ? Timestamp.fromDate(new Date(item.reminderDate)) : null,
        createdAt: serverTimestamp()
      });
    });

    return await batch.commit();
  }
};
