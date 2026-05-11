import bankIcon from '@/assets/icons/bank.svg';
import savingsIcon from '@/assets/icons/savings.svg';
import emergencyIcon from '@/assets/icons/emergency.svg';
import type { Account } from '@/types';
import styles from './AccountCard.module.scss';

interface AccountCardProps {
  account: Account;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

const getIcon = (theme: string, size = 20) => {
  switch (theme) {
    case 'blue': return <img src={bankIcon} alt="Bank Icon" width={size} height={size} />;
    case 'green': return <img src={savingsIcon} alt="Savings Icon" width={size} height={size} />;
    case 'red': return <img src={emergencyIcon} alt="Emergency Icon" width={size} height={size} />;
    default: return <img src={bankIcon} alt="Bank Icon" width={size} height={size} />;
  }
};

export default function AccountCard({ account, loading, onClick, className }: AccountCardProps) {
  if (loading) {
    return (
      <div className={`${styles.accountCard} ${styles.skeletonCard} ${className || ''}`}>
        <div className={styles.shimmer}></div>
      </div>
    );
  }

  return (
    <div 
      className={`${styles.accountCard} ${styles[account.theme]} ${onClick ? styles.clickable : ''} ${className || ''}`}
      onClick={onClick}
    >
      
      {account.bankName && (
        <div className={styles.watermark}>{account.bankName}</div>
      )}

      <div className={styles.cardHeader}>
        <div className={styles.iconWrapper}>
          {getIcon(account.theme)}
        </div>
        <div className={styles.nameWrapper}>
          <span className={styles.accountName}>{account.name}</span>
          {account.bankName && (
            <span className={styles.bankName}>{account.bankName}</span>
          )}
        </div>
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.accountType}>{account.accountCategory}</span>
      </div>
      
      <div className={styles.balanceInfo}>
        <span className={styles.currency}>₹</span>
        <span className={styles.amount}>
          {account.balance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
        </span>
        <span className={styles.decimal}>.00</span>
      </div>
    </div>
  );
}
