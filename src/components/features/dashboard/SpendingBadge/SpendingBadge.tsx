import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingDown, 
  AlertTriangle, 
  AlertCircle 
} from 'lucide-react';
import styles from './SpendingBadge.module.scss';

interface SpendingBadgeProps {
  accountName: string;
  percentage: number | null;
}

const getBadgeState = (percent: number) => {
  if (percent <= 70) {
    return {
      theme: 'success',
      icon: <TrendingDown size={14} />,
    };
  }
  if (percent <= 100) {
    return {
      theme: 'warning',
      icon: <AlertTriangle size={14} />,
    };
  }
  return {
    theme: 'danger',
    icon: <AlertCircle size={14} />,
  };
};

export default function SpendingBadge({ accountName, percentage }: SpendingBadgeProps) {
  const state = getBadgeState(percentage || 0);

  if (percentage === null) return null; // Component level safety

  return (
    <motion.div 
      className={`${styles.badge} ${styles[state.theme]}`}
      initial={false}
      transition={{ duration: 0.5 }}
    >
      <AnimatePresence mode="wait">
        <motion.span 
          key={state.theme}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 5 }}
          className={styles.iconArea}
        >
          {state.icon}
        </motion.span>
      </AnimatePresence>
      
      <span className={styles.text}>
        {accountName} • {percentage}% Spent
      </span>
    </motion.div>
  );
}
