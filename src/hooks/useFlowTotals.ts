import { useState, useEffect } from 'react';
import { firebaseFlowService } from '@/services/firebaseFlowService';
import { useAuth } from '@/context/AuthContext';

export function useFlowTotals() {
  const { currentUser } = useAuth();
  const [totals, setTotals] = useState({
    totalFixedHit: 0,
    tenureItems: [] as any[],
    monthlyItems: [] as any[],
    loading: true
  });

  useEffect(() => {
    if (!currentUser) return;

    let fixedItems: any[] = [];
    let subItems: any[] = [];

    const calculateTotals = () => {
      // Sum EMIs (Only Active)
      const emiSum = fixedItems
        .filter(item => !item.isSettled)
        .reduce((acc, item) => acc + (item.monthlyEmi || 0), 0);
  
      // Sum Subscriptions (Only Active, Normalized to Monthly)
      const subSum = subItems
        .filter(item => !item.isSettled)
        .reduce((acc, item) => {
          const amount = item.amount || 0;
          return acc + (item.cycle === 'YEARLY' ? amount / 12 : amount);
        }, 0);
  
      setTotals({
        totalFixedHit: emiSum + subSum,
        tenureItems: fixedItems,
        monthlyItems: subItems,
        loading: false
      });
    };

    const unsubscribeTenure = firebaseFlowService.subscribeToFlows(currentUser.uid, 'TENURE', (data) => {
      fixedItems = data;
      calculateTotals();
    });

    const unsubscribeMonthly = firebaseFlowService.subscribeToFlows(currentUser.uid, 'MONTHLY', (data) => {
      subItems = data;
      calculateTotals();
    });

    return () => {
      unsubscribeTenure();
      unsubscribeMonthly();
    };
  }, [currentUser]);

  return totals;
}
