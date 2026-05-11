import { useState, useEffect } from 'react';
import { animate, motion } from 'framer-motion';
import AccountSection from './AccountSection';
import { useAccounts } from '@/hooks/useAccounts';
import { useSafeToSpend } from '@/hooks/useSafeToSpend';
import RecurringBills from '@/components/features/dashboard/RecurringBills';
import ReminderSection from '@/components/features/reminders/ReminderSection';
import TransactionSection from '@/components/features/dashboard/TransactionSection/TransactionSection';
import SpendingBadge from '@/components/features/dashboard/SpendingBadge/SpendingBadge';
import styles from './Dashboard.module.scss';

export default function Dashboard() {
  const { 
    spendingAccountsLabel,
    spentPercentage,
    loading: accountsLoading 
  } = useAccounts();
  
  const { 
    safeToSpend, 
    loading: stsLoading 
  } = useSafeToSpend();

  const loading = accountsLoading || stsLoading;
  const isOverspent = safeToSpend < 0;

  // Number Counter Animation
  const [animatedValue, setAnimatedValue] = useState(safeToSpend);

  useEffect(() => {
    if (loading) return;
    const controls = animate(animatedValue, safeToSpend, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (value) => setAnimatedValue(value)
    });
    return () => controls.stop();
  }, [safeToSpend, loading]);

  // Calculate days left in the current month
  const getDaysLeft = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const diffTime = lastDay.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysLeft();
  
  // Dynamic font size logic for balance
  const displayVal = Math.round(animatedValue).toLocaleString('en-IN');
  const getFontSize = () => {
    const digitCount = displayVal.replace(/,/g, '').length;
    return digitCount >= 7 ? '48px' : '54px';
  };

  return (
    <div className={styles.container}>
      <div className={styles.atAGlance}>
        <div className={styles.labelRow}>
          <div className={styles.labelCol}>
            <span className={styles.label}>SAFE TO SPEND</span>
            {/* {snapshotDate && (
              <span className={styles.snapshotLabel}>
                Snapshot: {new Date(snapshotDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )} */}
          </div>
          <div className={styles.labelRight}>
            <span className={styles.daysBadge}>{daysLeft} Days Left</span>
          </div>
        </div>
        
        <div className={styles.balanceContainer}>
          <motion.h1 
            className={`${styles.balance} ${isOverspent ? styles.danger : ''}`} 
            style={{ fontSize: getFontSize() }}
          >
            ₹<span id='mainbalanceleft'>{displayVal}</span><span className={styles.decimal}>.00</span>
          </motion.h1>
        </div>


        <div className={styles.chipContainer}>
          {loading ? (
            <div className={styles.loadingChip}>Loading...</div>
          ) : (spendingAccountsLabel && spentPercentage !== null) ? (
            <div className={styles.chipWrapper}>
              <SpendingBadge 
                accountName={spendingAccountsLabel}
                percentage={spentPercentage}
              />
            </div>
          ) : (
            <div className={styles.emptyChip}>No Active Budget</div>
          )}
        </div>

      </div>

      <AccountSection variant="simple" />
      
      <RecurringBills />
      
      <ReminderSection />

      <TransactionSection />
    </div>
  );
}






