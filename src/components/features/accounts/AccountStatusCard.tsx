import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, PlusCircle } from 'lucide-react';
import type { Account } from '@/types';
import styles from './AccountStatusCard.module.scss';

interface AccountStatusCardProps {
  account: Account;
  onActionClick: () => void;
}

export default function AccountStatusCard({ account, onActionClick }: AccountStatusCardProps) {
  const isSpending = account.accountCategory === 'Spending';
  const limit = isSpending ? account.budget : account.goalAmount;
  
  const statusData = useMemo(() => {
    if (!limit) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let daysLeft = 0;
    if (isSpending) {
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      daysLeft = Math.ceil((lastDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } else if (account.goalDate) {
      const target = new Date(account.goalDate);
      daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    const current = account.balance;
    let displayAmount = current;
    let percentage = 0;
    let displayPercentage = 0;
    let themeClass = 'themeNormal';
    let label = '';

    if (isSpending) {
      const totalSpent = Math.max(0, limit - current);
      displayAmount = totalSpent;
      percentage = Math.min(100, (totalSpent / limit) * 100);
      displayPercentage = Math.round((totalSpent / limit) * 100);
      label = `${displayPercentage}% Spent`;

      // Spending Theme logic
      if (displayPercentage > 100) themeClass = 'themeDanger';
      else if (displayPercentage > 70) themeClass = 'themeWarning';
      else themeClass = 'themeNormal';
    } else {
      // Savings logic
      percentage = Math.min(100, (current / limit) * 100);
      displayPercentage = Math.round((current / limit) * 100);
      label = `Reached Goal ${displayPercentage}%`;
      themeClass = 'themeSavings';
    }

    return {
      percentage,
      displayPercentage,
      daysLeft,
      themeClass,
      limit,
      displayAmount,
      label
    };
  }, [account, limit, isSpending]);

  if (!limit) {
    return (
      <div className={styles.emptyCard} onClick={onActionClick}>
        <div className={styles.emptyIcon}>
          <PlusCircle size={20} />
        </div>
        <div className={styles.emptyText}>
          <h3>Set {isSpending ? 'Budget' : 'Savings Goal'}</h3>
          <p>Track your {isSpending ? 'spending' : 'progress'} automatically</p>
        </div>
      </div>
    );
  }
  const { percentage, daysLeft, themeClass, displayAmount, label } = statusData!;
  return (
    <div className={styles.statusCard}>
      <div className={styles.topRow}>
        <div className={styles.labelGroup}>
          <span className={styles.icon}>
            {isSpending ? <TrendingUp size={16} /> : <Target size={16} />}
          </span>
          <span className={styles.percentage}>{label}</span>
        </div>
        <div className={styles.daysLeft}>
          {daysLeft > 0 ? `${daysLeft} days left` : 'Goal reached!'}
        </div>
      </div>

      <div className={styles.progressWrapper}>
        <motion.div 
          className={`${styles.progressFill} ${styles[themeClass]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      <div className={styles.bottomRow}>
        <div className={styles.currentAmount}>
          ₹{displayAmount.toLocaleString('en-IN')}
        </div>
        <div className={styles.limitAmount}>
          / ₹{limit.toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  );
}
