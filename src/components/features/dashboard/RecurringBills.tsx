import { useRecurringBills } from '@/hooks/useRecurringBills';
import RecurringBillItem from '@/components/shared/RecurringBillItem/RecurringBillItem';
import styles from './RecurringBills.module.scss';
import { NavLink } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export default function RecurringBills() {
  const { items, toggleExpenseStatus, loading } = useRecurringBills();

  if (loading) return <div style={{ color: 'var(--colors-gray-font-color)', padding: '20px' }}>Loading Expenses...</div>;

  return (
    <div className={styles.section}>
      <div className={styles.list}>
        <NavLink to="/flow" className={styles.widgetHeader}>
          <span className={styles.widgetTitle}>Recurring Bills</span>
          <ExternalLink size={18} className={styles.widgetIcon} />
        </NavLink>

        {/* {totalFixedHit > 0 && (
          <div className={styles.cardHeader}>
            <div className={styles.totalSubtitle}>Fixed Hit</div>
            <div className={styles.totalAmount}>
              ₹{Math.round(totalFixedHit).toLocaleString('en-IN')}
            </div>
          </div>
        )} */}

        {items.map(item => (
          <RecurringBillItem 
            key={item.id} 
            expense={item as any} 
            variant="compact"
            onToggleStatus={() => toggleExpenseStatus(item)}
          />
        ))}

        {items.length === 0 && (
          <div className={styles.emptyState}>
            <p>No transactions yet.</p>
            <NavLink to="/flow" className={styles.addBtn}>Add Now</NavLink>
          </div>
        )}
      </div>
    </div>
  );
}
