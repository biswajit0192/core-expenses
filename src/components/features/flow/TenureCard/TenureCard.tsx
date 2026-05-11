import { useState } from 'react';
import { 
  TrendingDown,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Tenure } from '@/types';
import styles from './TenureCard.module.scss';
import { calculateROI, calculateTotalInterestPercent } from '@/utils/financeUtils';
import { formatDateWithOrdinal, addMonths, getDaysUntil, calculateNextDisplayDate } from '@/utils/dateUtils';

interface TenureCardProps {
  data: Tenure;
  onMarkPaid?: () => void;
}

export default function TenureCard({ data, onMarkPaid }: TenureCardProps) {
  const [interestMode, setInterestMode] = useState<'FLAT' | 'REDUCING'>(
    data.interestType || 'FLAT'
  );

  const totalPaid = data.paidMonths?.length || 0;
  const remainingAmount = (data.totalMonths - totalPaid) * data.monthlyEmi;
  const progressPercentage = Math.round((totalPaid / data.totalMonths) * 100);
  
  const displayDate = calculateNextDisplayDate(data.startDate, data.paidMonths || []);
  const daysUntil = getDaysUntil(displayDate);
  const isDue = daysUntil <= 0;
  const isImminent = daysUntil > 0 && daysUntil <= 3;

  const daysUntilStart = getDaysUntil(data.startDate);
  const isFuture = daysUntilStart > 0;

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isPaidThisMonth = (data.paidMonths || []).includes(monthKey);

  const flatInterest = calculateTotalInterestPercent(
    data.totalPrincipal,
    data.monthlyEmi,
    data.totalMonths
  );

  const reducingROI = calculateROI(
    data.totalPrincipal,
    data.monthlyEmi,
    data.totalMonths
  );

  // Calculate End Date: Start Date + totalMonths
  const endDate = addMonths(data.startDate, data.totalMonths);

  return (
    <div className={styles.tenureCard}>
      {/* Top Row: Title & EMI Amount */}
      <div className={styles.topRow}>
        <div className={styles.titleArea}>
          <div className={styles.titleInfo}>
            <h3 className={styles.title}>{data.title}</h3>
            <span className={styles.principalLabel}>Principal: ₹{data.totalPrincipal.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className={styles.emiArea}>
          <span className={styles.emiAmount}>-₹{data.monthlyEmi.toLocaleString('en-IN')}</span>
          <span className={styles.cycle}>/ mo</span>
        </div>
      </div>

      {/* Metadata Row: Badges & Toggles */}
      <div className={styles.metadataRow}>
        <div className={styles.badgesGroup}>
          <motion.div 
            key={interestMode}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={styles.interestBadge}
          >
            <TrendingDown size={14} />
            <motion.span
              key={`${interestMode}-val`}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              {interestMode === 'FLAT' ? `${flatInterest}% Total` : `${reducingROI}% ROI`}
            </motion.span>
          </motion.div>
          
          <div className={styles.remainingBadge}>
            <Info size={14} />
            <span>₹{remainingAmount.toLocaleString('en-IN')} Left</span>
          </div>
        </div>

        {data.type === 'LOAN' && (
          <div className={styles.interestToggles}>
            <button 
              className={`${styles.toggle} ${interestMode === 'FLAT' ? styles.active : ''}`}
              onClick={(e) => { e.stopPropagation(); setInterestMode('FLAT'); }}
            >
              Flat
            </button>
            <button 
              className={`${styles.toggle} ${interestMode === 'REDUCING' ? styles.active : ''}`}
              onClick={(e) => { e.stopPropagation(); setInterestMode('REDUCING'); }}
            >
              Red.
            </button>
          </div>
        )}
      </div>

      {/* Progress Section */}
      <div className={styles.progressSection}>
        <div className={styles.progressLabels}>
          <div className={styles.progressText}>
            Progress: <span className={styles.monthsLabel}>{totalPaid} / {data.totalMonths} months</span>
          </div>
          
          {isFuture ? (
            <span className={styles.futureInfo}>Starts in {daysUntilStart} days</span>
          ) : (
            <div className={`
              ${styles.statusBadge} 
              ${isPaidThisMonth ? styles.paid : isDue ? styles.urgent : isImminent ? styles.imminent : ''}
            `}>
              {isPaidThisMonth ? 'PAID' : isDue ? 'PAYMENT DUE' : `Due in ${daysUntil} Day${daysUntil === 1 ? '' : 's'}`}
            </div>
          )}
        </div>
        
        <div className={styles.progressWrapper}>
          <motion.div 
            className={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>

        {/* Timeline Container */}
        <div className={styles.timelineContainer}>
          <div className={styles.timelineItem}>
            <span className={styles.timelineLabel}>Started -</span>
            <span className={styles.timelineDate}>{formatDateWithOrdinal(data.startDate)}</span>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineLabel}>Ending -</span>
            <span className={styles.timelineDate}>{formatDateWithOrdinal(endDate)}</span>
          </div>
        </div>
      </div>

      {!isPaidThisMonth && isDue && onMarkPaid && !data.isSettled && totalPaid < data.totalMonths && (
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
