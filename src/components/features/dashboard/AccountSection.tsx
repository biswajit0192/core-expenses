import { useNavigate, NavLink } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import AccountCard from '@/components/shared/AccountCard/AccountCard';
import styles from './AccountSection.module.scss';

interface AccountSectionProps {
  variant?: 'simple' | 'slider';
}

export default function AccountSection({ variant = 'simple' }: AccountSectionProps) {
  const navigate = useNavigate();
  const { accounts, loading } = useAccounts();

  if (loading) {
    return (
      <section className={`${styles.section} ${styles[variant]}`}>
        <div className={styles.widgetContainer}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitle}>Accounts</span>
            <div className={styles.skeletonViewAll}></div>
          </div>
          <div className={styles.scrollContainer}>
            {[1, 2, 3].map((i) => (
              <AccountCard key={i} account={{} as any} loading={true} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.section} ${styles[variant]}`}>
      <div className={styles.widgetContainer}>
        <NavLink to="/accounts" className={styles.widgetHeader}>
          <span className={styles.widgetTitle}>Accounts</span>
          <ExternalLink size={18} className={styles.widgetIcon} />
        </NavLink>

        <div className={styles.scrollContainer}>
          {accounts.map((account) => (
            <AccountCard 
              key={account.id} 
              account={account} 
              onClick={() => navigate(`/accounts/${account.id}/edit`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
