import type { Transaction, Account } from '@/types';
import styles from './TransactionItem.module.scss';

// SVG Icons
import FuelIcon from '@/assets/icons/transaction-icons/FuelIcon.svg?react';
import MealsIcon from '@/assets/icons/transaction-icons/Meals.svg?react';
import MedicalIcon from '@/assets/icons/transaction-icons/Medical.svg?react';
import MoneyIcon from '@/assets/icons/transaction-icons/Money.svg?react';
import OtherIcon from '@/assets/icons/transaction-icons/OtherPayments.svg?react';
import ShoppingIcon from '@/assets/icons/transaction-icons/Shoppings.svg?react';
import SportsIcon from '@/assets/icons/transaction-icons/Sports.svg?react';
import TravelingIcon from '@/assets/icons/transaction-icons/Traveling.svg?react';
import VacationIcon from '@/assets/icons/transaction-icons/Vacation.svg?react';
import CafeIcon from '@/assets/icons/transaction-icons/cafe.svg?react';
import GroceriesIcon from '@/assets/icons/transaction-icons/groceries.svg?react';
import DrinksIcon from '@/assets/icons/transaction-icons/drinks.svg?react';
import UtilityIcon from '@/assets/icons/transaction-icons/utility.svg?react';

const categoryIcons: Record<string, any> = {
  Fuel: FuelIcon,
  Meals: MealsIcon,
  Medical: MedicalIcon,
  Money: MoneyIcon,
  Income: MoneyIcon,
  Salary: MoneyIcon,
  Shopping: ShoppingIcon,
  Sports: SportsIcon,
  Traveling: TravelingIcon,
  Vacation: VacationIcon,
  Other: OtherIcon,
  Groceries: GroceriesIcon,
  Cafe: CafeIcon,
  Drinks: DrinksIcon,
  Utility: UtilityIcon, 
};

interface TransactionItemProps {
  transaction: Transaction;
  accounts: Account[];
  variant?: 'compact' | 'detailed';
  isInNexus?: boolean;
  className?: string;
}

export default function TransactionItem({ 
  transaction, 
  accounts, 
  variant = 'compact',
  isInNexus = false,
  className = ''
}: TransactionItemProps) {
  const isIncome = transaction.type === 'CREDIT' || transaction.type === 'INCOME';
  const Icon = categoryIcons[transaction.category] || categoryIcons[transaction.description] || OtherIcon;
  
  const account = accounts.find(a => a.id === transaction.accountId);
  const accountName = account?.name || 'Account';

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short' 
      }).replace(' ', ', ') + ' - ' + date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className={`${styles.item} ${styles[variant]} ${isIncome ? styles.income : ''} ${isInNexus ? styles.withBg : ''} ${className}`}>
      <div className={styles.leftSection}>
        <div className={styles.iconWrapper}>
          <Icon />
        </div>
        <div className={styles.info}>
          <span className={styles.title}>{transaction.description || transaction.category}</span>
          <span className={styles.date}>{formatDate(transaction.date)}</span>
        </div>
      </div>

      <div className={styles.rightSection}>
        <span className={styles.amount}>
          {isIncome ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}.00
        </span>
        <span className={styles.statusChip}>
          {isIncome ? `To ${accountName}` : `From ${accountName}`}
        </span>
      </div>
    </div>
  );
}
