import { useState, useEffect } from 'react';
import { firebaseFlowService } from '@/services/firebaseFlowService';
import { getDaysUntil, calculateTenureProgress } from '@/utils/dateUtils';
import { useAuth } from '@/context/AuthContext';

export interface UpcomingFlowItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  dueDate: string;
  daysUntil: number;
  status: 'UPCOMING' | 'PAID';
  type: 'TENURE' | 'MONTHLY';
  progress?: string;
}

export function useUpcomingFlows() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<UpcomingFlowItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Trigger one-time migration
    firebaseFlowService.autoMigrate(currentUser.uid);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    let tenureItems: any[] = [];
    let monthlyItems: any[] = [];

    const processAndSet = () => {
      const activeFixed = tenureItems.filter(f => !f.isSettled);
      const activeSubs = monthlyItems.filter(s => !s.isSettled);

      const normalized: UpcomingFlowItem[] = [
        ...activeFixed.map(f => {
          const start = new Date(f.startDate);
          const startDay = start.getDate();
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          let due = new Date(currentYear, currentMonth, startDay);
          if (due < today) {
            due = new Date(currentYear, currentMonth + 1, startDay);
          }

          const isPaid = (f.paidMonths || []).includes(monthKey);
          const currentProgress = calculateTenureProgress(f.startDate, f.totalMonths);
          
          return {
            id: f.id,
            title: f.title,
            amount: f.monthlyEmi,
            category: f.category,
            dueDate: due.toISOString(),
            daysUntil: getDaysUntil(due.toISOString()),
            status: (isPaid ? 'PAID' : 'UPCOMING') as 'UPCOMING' | 'PAID',
            type: 'TENURE' as const,
            progress: `${currentProgress} / ${f.totalMonths} months`
          };
        }),
        ...activeSubs.map(s => ({
          id: s.id,
          title: s.provider,
          amount: s.amount,
          category: s.category,
          dueDate: s.nextBillDate,
          daysUntil: getDaysUntil(s.nextBillDate),
          status: ((s.paidMonths || []).includes(monthKey) ? 'PAID' : 'UPCOMING') as 'UPCOMING' | 'PAID',
          type: 'MONTHLY' as const
        }))
      ];

      const sorted = normalized.sort((a, b) => {
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

      setItems(sorted.slice(0, 4));
      setLoading(false);
    };

    const unsubscribeTenure = firebaseFlowService.subscribeToFlows(currentUser.uid, 'TENURE', (data) => {
      tenureItems = data;
      processAndSet();
    });

    const unsubscribeMonthly = firebaseFlowService.subscribeToFlows(currentUser.uid, 'MONTHLY', (data) => {
      monthlyItems = data;
      processAndSet();
    });

    return () => {
      unsubscribeTenure();
      unsubscribeMonthly();
    };
  }, [currentUser]);

  const toggleStatus = async (id: string, type: 'TENURE' | 'MONTHLY') => {
    if (!currentUser) return;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // We only toggle to PAID from the Dashboard, usually. 
    // In UpcomingFlows hook, we focus on upcoming, so the toggle effectively clears it from the list.
    const dbType = type === 'TENURE' ? 'TENURE' : 'MONTHLY';
    await firebaseFlowService.togglePaidMonth(currentUser.uid, id, dbType, monthKey, true);
  };

  return { items, toggleStatus, loading };
}
