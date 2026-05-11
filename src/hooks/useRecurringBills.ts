import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc,
  updateDoc
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { firebaseFlowService } from '@/services/firebaseFlowService';
import { getDaysUntil, calculateNextDisplayDate } from '@/utils/dateUtils';

export interface UnifiedExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  dueDate: string;
  daysUntil: number;
  status: 'UPCOMING' | 'PAID';
  type: 'TENURE' | 'MONTHLY' | 'LEGACY';
  progress?: string;
}

export function useRecurringBills() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<UnifiedExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setItems([]);
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    let legacyItems: any[] = [];
    let fixedItems: any[] = [];
    let subItems: any[] = [];

    const processAndSet = () => {
      const activeFixed = fixedItems.filter(f => !f.isSettled);
      const activeSubs = subItems.filter(s => !s.isSettled);

      const normalized: UnifiedExpenseItem[] = [
        ...legacyItems.map(l => ({
          id: l.id,
          title: l.title,
          amount: l.amount,
          category: l.category || 'Other',
          dueDate: l.dueDate,
          daysUntil: getDaysUntil(l.dueDate),
          status: l.status as 'UPCOMING' | 'PAID',
          type: 'LEGACY' as const
        })),
        ...activeFixed.map(f => {
          const displayDate = calculateNextDisplayDate(f.startDate, f.paidMonths || []);
          const isPaid = (f.paidMonths || []).includes(monthKey);
          
          const currentProgress = f.paidMonths?.length || 0;

          return {
            id: f.id,
            title: f.title,
            amount: f.monthlyEmi,
            category: f.category,
            dueDate: displayDate,
            daysUntil: getDaysUntil(displayDate),
            status: (isPaid ? 'PAID' : 'UPCOMING') as 'UPCOMING' | 'PAID',
            type: 'TENURE' as const,
            progress: `${currentProgress} / ${f.totalMonths} months`
          };
        }),
        ...activeSubs.map(s => {
          const displayDate = calculateNextDisplayDate(s.nextBillDate, s.paidMonths || []);
          const isPaid = (s.paidMonths || []).includes(monthKey);

          return {
            id: s.id,
            title: s.provider,
            amount: s.amount,
            category: s.category || 'Monthly',
            dueDate: displayDate,
            daysUntil: getDaysUntil(displayDate),
            status: (isPaid ? 'PAID' : 'UPCOMING') as 'UPCOMING' | 'PAID',
            type: 'MONTHLY' as const
          };
        })
      ];

      // Sort: Urgent (Overdue Upcoming) > Upcoming > Paid
      normalized.sort((a, b) => {
        // Rule 1: UPCOMING first, PAID last
        if (a.status !== b.status) {
          return a.status === 'UPCOMING' ? -1 : 1;
        }

        // Rule 2: Within UPCOMING, negative days (overdue) come before positive days
        if (a.status === 'UPCOMING') {
          const aOverdue = a.daysUntil < 0;
          const bOverdue = b.daysUntil < 0;

          if (aOverdue !== bOverdue) {
            return aOverdue ? -1 : 1;
          }
        }

        // Rule 3: Sort by daysUntil ascending for all groups
        return a.daysUntil - b.daysUntil;
      });

      setItems(normalized.slice(0, 4));
      setLoading(false);
    };

    // Subscriptions to 3 sources
    const unsubLegacy = onSnapshot(collection(db, 'users', userId, 'recurringBills'), (snap) => {
      legacyItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      processAndSet();
    });

    const unsubFixed = onSnapshot(collection(db, 'users', userId, 'tenures'), (snap) => {
      fixedItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      processAndSet();
    });

    const unsubSubs = onSnapshot(collection(db, 'users', userId, 'monthlies'), (snap) => {
      subItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      processAndSet();
    });

    return () => {
      unsubLegacy();
      unsubFixed();
      unsubSubs();
    };
  }, [currentUser]);

  const toggleExpenseStatus = async (item: UnifiedExpenseItem) => {
    if (!currentUser) return;
    const userId = currentUser.uid;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isPaying = item.status === 'UPCOMING';

    try {
      if (item.type === 'TENURE' || item.type === 'MONTHLY') {
        await firebaseFlowService.togglePaidMonth(
          userId, 
          item.id, 
          item.type, 
          monthKey, 
          isPaying
        );
      } else if (item.type === 'LEGACY') {
        const docRef = doc(db, 'users', userId, 'recurringBills', item.id);
        await updateDoc(docRef, { status: isPaying ? 'PAID' : 'UPCOMING' });
      }
    } catch (err) {
      console.error('[useRecurringBills] Toggle failed:', err);
    }
  };

  return {
    items,
    loading,
    toggleExpenseStatus
  };
}
