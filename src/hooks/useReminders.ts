import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useNexus } from '@/context/NexusContext';
import { extractDateFromText } from '@/lib/dateUtils';

export interface Reminder {
  id: string;
  title: string;
  isCompleted: boolean;
  reminderDate: Timestamp | null;
  createdAt: any;
  type?: 'notify' | 'note';
  theme?: string;
  isLocal?: boolean;
  link?: string;
}

export function useReminders() {
  const { currentUser } = useAuth();
  const { localReminders, toggleLocalReminder: toggleLocal } = useNexus();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setReminders([]);
      setLoading(false);
      return;
    }

    const remindersRef = collection(db, 'users', currentUser.uid, 'reminders');
    const q = query(remindersRef, orderBy('createdAt', 'desc'));

    const syncData = (dbData: Reminder[]) => {
      const combined = [...localReminders, ...dbData];
      combined.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setReminders(combined);
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbRemindersData: Reminder[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<Reminder, 'id'>;
        // Lazy migration logic for existing reminders
        const type = data.type || (data.reminderDate ? 'notify' : 'note');
        dbRemindersData.push({ id: doc.id, ...data, type } as Reminder);
      });

      syncData(dbRemindersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reminders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, localReminders]);

  const addReminder = async (title: string) => {
    if (!currentUser) return;

    const extractedDate = extractDateFromText(title);
    const remindersRef = collection(db, 'users', currentUser.uid, 'reminders');

    await addDoc(remindersRef, {
      title,
      isCompleted: false,
      reminderDate: extractedDate ? Timestamp.fromDate(extractedDate) : null,
      type: extractedDate ? 'notify' : 'note',
      createdAt: serverTimestamp()
    });
  };

  const toggleReminder = async (reminderId: string, currentStatus: boolean) => {
    if (!currentUser) return;

    // Check if it's a local reminder first
    const isLocal = localReminders.some(r => r.id === reminderId);
    if (isLocal) {
      toggleLocal(reminderId, currentStatus);
      return;
    }

    // Otherwise, update Firestore
    const reminderRef = doc(db, 'users', currentUser.uid, 'reminders', reminderId);
    await updateDoc(reminderRef, {
      isCompleted: !currentStatus
    });
  };

  return {
    reminders,
    loading,
    addReminder,
    toggleReminder
  };
}
