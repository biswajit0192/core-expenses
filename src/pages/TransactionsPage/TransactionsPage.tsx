import { useState, useMemo, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { KEYWORD_MAP } from '@/utils/categoryMapper';
import type { Transaction } from '@/types';
import { Calendar as CalendarIcon } from 'lucide-react';
import styles from './TransactionsPage.module.scss';
import ExpandableTransactionItem from '@/components/shared/TransactionItem/ExpandableTransactionItem';

// Custom Button component for the DatePicker trigger
interface CustomDateButtonProps {
  value?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const CustomDateButton = forwardRef<HTMLButtonElement, CustomDateButtonProps>(({ value, onClick }, ref) => (
  <button className={styles.dateButton} onClick={onClick} ref={ref} type="button">
    <CalendarIcon size={16} />
    <span>{value || 'Select Date'}</span>
  </button>
));

export default function TransactionsPage() {
  const { transactions, loading: txLoading } = useTransactions();
  const { accounts, loading: accLoading } = useAccounts();
  
  // States for filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Accordion state
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(!!startDate || !!endDate);

  const handleClearDates = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't toggle accordion
    setStartDate(null);
    setEndDate(null);
  };

  const categories = ['All', ...Object.keys(KEYWORD_MAP)];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // 1. Filter by Category
      const categoryMatch = selectedCategory === 'All' || tx.category === selectedCategory;
      
      // 2. Filter by Date Range
      let dateMatch = true;
      if (startDate || endDate) {
        const txDate = new Date(tx.date).getTime();
        if (startDate) {
          const start = new Date(startDate).getTime();
          if (txDate < start) dateMatch = false;
        }
        if (endDate) {
          const end = new Date(endDate).getTime();
          const endOfDay = end + (24 * 60 * 60 * 1000) - 1;
          if (txDate > endOfDay) dateMatch = false;
        }
      }

      return categoryMatch && dateMatch;
    });
  }, [transactions, selectedCategory, startDate, endDate]);

  const loading = txLoading || accLoading;

  const hasDateFilter = !!startDate || !!endDate;

  // Group transactions by Contextual Chronological logic
  const groupedTransactions = useMemo(() => {
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
      
      // Last 7 days daily resolution
      if (diffDays < 7) {
        const d = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' });
        return `${d}${getOrdinal(d)} ${month}`;
      }

      // Current Month catch-all
      if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
        return 'This Month';
      }

      // Older Months
      return `${date.toLocaleString('default', { month: 'short' })}, ${date.getFullYear()}`;
    };

    filteredTransactions.forEach(tx => {
      const label = getGroupLabel(tx.date);
      
      let group = groups.find(g => g.label === label);
      if (!group) {
        group = { label, transactions: [] };
        groups.push(group);
      }
      group.transactions.push(tx);
    });
    
    // Sort groups by date descending
    return groups.sort((a, b) => {
      if (a.transactions.length === 0 || b.transactions.length === 0) return 0;
      const dateA = new Date(a.transactions[0].date).getTime();
      const dateB = new Date(b.transactions[0].date).getTime();
      return dateB - dateA;
    });
  }, [filteredTransactions]);

  return (
    <div className={styles.page}>
      <section className={styles.filterSection}>
        {/* Accordion Date Filters */}
        <div className={styles.accordion}>
          <div 
            className={styles.accordionHeader} 
            onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
          >
            <div className={styles.headerTitle}>
              <CalendarIcon 
                size={18} 
                className={`${styles.chevron} ${isDateFilterOpen ? styles.rotated : ''}`} 
              />
              <span>Filter by Date</span>
            </div>
            
            {(hasDateFilter && isDateFilterOpen) && (
              <button className={styles.clearBtn} onClick={handleClearDates}>
                Clear
              </button>
            )}
          </div>

          {isDateFilterOpen && (
            <div className={styles.accordionContent}>
              <div className={styles.dateFilters}>
                <div className={styles.filterGroup}>
                  <DatePicker
                    selected={startDate}
                    onChange={(date: Date | null) => setStartDate(date)}
                    dateFormat="MMM d, yyyy"
                    customInput={<CustomDateButton />}
                    withPortal
                    isClearable
                    placeholderText="From Date"
                  />
                </div>

                <div className={styles.filterGroup}>
                  <DatePicker
                    selected={endDate}
                    onChange={(date: Date | null) => setEndDate(date)}
                    dateFormat="MMM d, yyyy"
                    customInput={<CustomDateButton />}
                    withPortal
                    isClearable
                    minDate={startDate || undefined}
                    placeholderText="To Date"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category Filters */}
        <div className={styles.categoryFilters}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${styles.chip} ${selectedCategory === cat ? styles.active : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <main className={styles.transactionsList}>
        {loading ? (
          <div className={styles.noResults}>Loading transactions...</div>
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
          <div className={styles.noResults}>
            No transactions found for these filters.
          </div>
        )}
      </main>
    </div>
  );
}
