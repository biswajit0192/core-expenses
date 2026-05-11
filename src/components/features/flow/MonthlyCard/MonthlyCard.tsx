import React from 'react';
import { 
  Music, 
  PlayCircle, 
  Video, 
  ShoppingCart, 
  Globe, 
  Code, 
  Zap, 
  CreditCard 
} from 'lucide-react';
import type { Monthly } from '@/types';
import styles from './MonthlyCard.module.scss';
import { formatDateWithOrdinal, getDaysUntil, calculateNextDisplayDate } from '@/utils/dateUtils';

interface MonthlyCardProps {
  subscription: Monthly;
  onMarkPaid?: () => void;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  Spotify: <Music size={20} />,
  Netflix: <PlayCircle size={20} />,
  YouTube: <Video size={20} />,
  Amazon: <ShoppingCart size={20} />,
  'Other Software': <Code size={20} />,
  'Utilities': <Zap size={20} />,
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ENTERTAINMENT: <PlayCircle size={20} />,
  SOFTWARE: <Code size={20} />,
  UTILITIES: <Zap size={20} />,
  OTHER: <Globe size={20} />,
};

export default function MonthlyCard({ subscription, onMarkPaid }: MonthlyCardProps) {
  const displayDate = calculateNextDisplayDate(subscription.nextBillDate, subscription.paidMonths || []);
  const daysUntil = getDaysUntil(displayDate);
  const isDue = daysUntil <= 0;
  const isImminent = daysUntil > 0 && daysUntil <= 3;

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isPaidThisMonth = (subscription.paidMonths || []).includes(monthKey);

  const icon = PROVIDER_ICONS[subscription.provider] || 
               CATEGORY_ICONS[subscription.category] || 
               <CreditCard size={20} />;

  return (
    <div className={styles.card}>
      {/* Top Row: Provider & Amount */}
      <div className={styles.topRow}>
        <div className={styles.providerInfo}>
          <div className={styles.iconWrapper}>
            {icon}
          </div>
          <h3 className={styles.providerName}>{subscription.provider}</h3>
        </div>
        <div className={styles.amountArea}>
          <span className={styles.amount}>-₹{subscription.amount.toLocaleString('en-IN')}</span>
          <span className={styles.cycle}>/ mo</span>
        </div>
      </div>

      {/* Bottom Row: Next Billing Context */}
      <div className={styles.bottomRow}>
        <div className={styles.nextBill}>
          <span className={styles.nextBillLabel}>Next bill:</span><span className={styles.nextBillDate}>{formatDateWithOrdinal(displayDate)}</span>
        </div>
        
        <div className={`
          ${styles.daysLeft} 
          ${isPaidThisMonth ? styles.paid : 
            isDue ? styles.urgent : 
            isImminent ? styles.imminent : ''}
        `}>
          {isPaidThisMonth ? 'PAID' : isDue ? 'PAYMENT DUE' : `Due in ${daysUntil} Day${daysUntil === 1 ? '' : 's'}`}
        </div>
      </div>

      {!isPaidThisMonth && isDue && onMarkPaid && (
        <div className={styles.actionRow}>
          <button 
             className={styles.markPaidBtn}
             onClick={(e) => {
               e.stopPropagation();
               onMarkPaid();
             }}
          >
            Mark Paid
          </button>
        </div>
      )}
    </div>
  );
}
