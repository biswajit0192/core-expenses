import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { Social } from '@/types';
import styles from './SocialCard.module.scss';
import { formatDateWithOrdinal } from '@/utils/dateUtils';

interface SocialCardProps {
  data: Social;
  onSettle?: (id: string) => void;
}

export default function SocialCard({ data, onSettle }: SocialCardProps) {
  const remainingAmount = data.totalAmount - data.amountSettled;
  const progressPercentage = Math.round((data.amountSettled / data.totalAmount) * 100);
  const isSettled = data.amountSettled === data.totalAmount;

  return (
    <div className={`${styles.socialCard} ${styles.withBg}`}>
      {/* Top Row: Name & Remaining Balance */}
      <div className={styles.topRow}>
        <h3 className={styles.personName}>{data.personName}</h3>
        <div className={styles.amountRemaining}>
          ₹{remainingAmount.toLocaleString('en-IN')}
          <span>Left</span>
        </div>
      </div>

      {/* Progress Bar & Settlement Label */}
      <div className={styles.progressSection}>
        <div className={styles.progressLabel}>
          <span>{data.type === 'LENT' ? 'Recovery' : 'Debt Clearance'}</span>
          <span>
            ₹{data.amountSettled.toLocaleString('en-IN')} / ₹{data.totalAmount.toLocaleString('en-IN')} settled
          </span>
        </div>
        
        <div className={styles.progressBar}>
          <motion.div 
            className={`${styles.progressFill} ${data.type === 'LENT' ? styles.lent : styles.borrowed}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        {/* Timeline Label */}
        <div className={styles.timelineContainer}>
          <div className={styles.timelineItem}>
            <span className={styles.timelineLabel}>
              {data.type === 'LENT' ? 'Lent on —' : 'Borrowed on —'}
            </span>
            <span className={styles.timelineDate}>
              {formatDateWithOrdinal(data.date || data.createdAt)}
            </span>
          </div>
          
          {isSettled && data.settledAt && (
            <div className={styles.timelineItem}>
              <span className={styles.timelineLabel}>Settled on —</span>
              <span className={styles.timelineDate}>{formatDateWithOrdinal(data.settledAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action: Settle Button */}
      <div className={styles.quickActions}>
        <button 
          className={styles.actionBtn} 
          onClick={(e) => { e.stopPropagation(); onSettle?.(data.id); }}
          title="Update Settlement"
        >

          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
