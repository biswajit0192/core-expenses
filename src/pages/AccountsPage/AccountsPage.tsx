import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import AccountCard from '@/components/shared/AccountCard/AccountCard';
import ExpandableTransactionItem from '@/components/shared/TransactionItem/ExpandableTransactionItem';
import AccountStatusCard from '@/components/features/accounts/AccountStatusCard';
import type { Transaction } from '@/types';
import styles from './AccountsPage.module.scss';


export default function AccountsPage() {
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { transactions, loading: txLoading } = useTransactions();
  
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial scroll to center the first account card
  useEffect(() => {
    if (scrollRef.current && accounts.length > 0) {
      // 80px is the offset to center the first account (64px button + 16px gap)
      scrollRef.current.scrollLeft = 80;
    }
  }, [accountsLoading]);

  // Handle scroll to update active index
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollPosition = scrollRef.current.scrollLeft;
    
    // AddCard (64px) + Gap (16px) = 80px offset
    // AccountCard (230px) + Gap (16px) = 246px stride
    const accIndex = Math.round((scrollPosition - 80) / 246);
    const clampedIndex = Math.max(0, Math.min(accounts.length - 1, accIndex));

    if (clampedIndex !== activeIndex) {
      setActiveIndex(clampedIndex);
    }
  };

  const activeAccount = accounts[activeIndex];

  // Filter & Group transactions for the active account
  const groupedTransactions = useMemo(() => {
    if (!activeAccount) return [];
    
    // 1. Filter by Account ID
    const filtered = transactions.filter(tx => tx.accountId === activeAccount.id);
    
    // 2. Group by Contextual Chronological logic
    const groups: { label: string; transactions: Transaction[] }[] = [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const getOrdinal = (n: number) => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
      }
    };

    const getGroupLabel = (dateStr: string) => {
      const date = new Date(dateStr);
      const txDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const diffTime = today.getTime() - txDay.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      
      if (diffDays < 7) {
        const d = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' });
        return `${d}${getOrdinal(d)} ${month}`;
      }

      if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
        return 'This Month';
      }

      return `${date.toLocaleString('default', { month: 'short' })}, ${date.getFullYear()}`;
    };

    filtered.forEach(tx => {
      const label = getGroupLabel(tx.date);
      
      let group = groups.find(g => g.label === label);
      if (!group) {
        group = { label, transactions: [] };
        groups.push(group);
      }
      group.transactions.push(tx);
    });

    // 3. Sort by date descending
    return groups.sort((a, b) => {
      if (a.transactions.length === 0 || b.transactions.length === 0) return 0;
      const dateA = new Date(a.transactions[0].date).getTime();
      const dateB = new Date(b.transactions[0].date).getTime();
      return dateB - dateA;
    });
  }, [transactions, activeAccount]);

  if (accountsLoading) return <div className={styles.loading}>Loading accounts...</div>;

  return (
    <div className={styles.page}>

        {/* Accounts Swiper */}
        <section className={styles.swiperSection}>
          <div 
            className={styles.swiper} 
            ref={scrollRef}
            onScroll={handleScroll}
          >
            <button className={styles.addCard} onClick={() => navigate('/accounts/new/edit')}>
              <Plus size={32} />
            </button>
            {accounts.map((account, index) => (
              <AccountCard 
                key={account.id} 
                account={account} 
                className={`
                  ${styles.cardWrapper} 
                  ${index === activeIndex ? styles.active : ''} 
                  ${styles[account.theme]}
                `}
                onClick={() => navigate(`/accounts/${account.id}/edit`)}
              />
            ))}
            <button className={styles.addCard} onClick={() => navigate('/accounts/new/edit')}>
              <Plus size={32} />
            </button>
          </div>
          
          {/* Pagination Dots */}
          <div className={styles.dots}>
            {accounts.map((_, i) => (
              <div 
                key={i} 
                className={`${styles.dot} ${i === activeIndex ? styles.active : ''}`} 
              />
            ))}
          </div>
        </section>

        {activeAccount && (
          <AccountStatusCard 
            account={activeAccount} 
            onActionClick={() => navigate(`/accounts/${activeAccount.id}/edit`)}
          />
        )}

        <div className={styles.txHeaderArea}>
          <h2 className={styles.title}>Transactions</h2>
        </div>

      {/* Transactions List */}
      <main className={styles.txSection}>
        <div className={styles.list}>
          {txLoading ? (
            <div className={styles.loading}>Loading transactions...</div>
          ) : groupedTransactions.length > 0 ? (
            groupedTransactions.map(group => (
              <div key={group.label} className={styles.monthGroup}>
                <div className={styles.monthHeader}>{group.label}</div>
                <div className={styles.groupItems}>
                  {group.transactions.map(tx => (
                    <ExpandableTransactionItem 
                      key={tx.id} 
                      transaction={tx} 
                      accounts={accounts} 
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.empty}>No transactions for this account yet.</div>
          )}
        </div>
      </main>
    </div>
  );
}
