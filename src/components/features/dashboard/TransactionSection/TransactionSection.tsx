import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import TransactionItem from '@/components/shared/TransactionItem/TransactionItem';
import styles from './TransactionSection.module.scss';
import { NavLink } from 'react-router-dom';
import { History, ExternalLink } from 'lucide-react';

export default function TransactionSection() {
  const { transactions, loading: txLoading } = useTransactions(5);
  const { accounts, loading: accLoading } = useAccounts();

  const loading = txLoading || accLoading;

  if (loading) return <div style={{ color: 'var(--colors-gray-font-color)', padding: '20px' }}>Loading Transactions...</div>;

  return (
    <div className={styles.section}>
      <div className={styles.list}>
        <NavLink to="/transactions" className={styles.widgetHeader}>
          <span className={styles.widgetTitle}>Recent Transactions</span>
          <ExternalLink size={18} className={styles.widgetIcon} />
        </NavLink>
        {transactions.length > 0 ? (
          <div className={styles.listWrapper}>
            {transactions.map(tx => (
              <TransactionItem 
                key={tx.id} 
                transaction={tx} 
                accounts={accounts} 
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.iconWrapper}>
              <History size={28} strokeWidth={1.5} />
            </div>
            <p>No recent activity found</p>
          </div>
        )}
      </div>
    </div>
  );
}
