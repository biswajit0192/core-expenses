import { NavLink } from 'react-router-dom';
import HomeIcon from '@/assets/icons/home.svg?react';
import AccountsIcon from '@/assets/icons/accounts.svg?react';
import MoneyflowIcon from '@/assets/icons/moneyflow.svg?react';
import TransactionsIcon from '@/assets/icons/transaction.svg?react';
import RemindersIcon from '@/assets/icons/reminders.svg?react';
import styles from './BottomNav.module.scss';

export default function BottomNav() {
  const navItems = [
    { icon: <HomeIcon width={24} height={24} />, path: '/', label: 'Home' },
    { icon: <AccountsIcon width={24} height={24} />, path: '/accounts', label: 'Accounts' },
    { icon: <MoneyflowIcon width={24} height={24} />, path: '/flow', label: 'Flow' },
    { icon: <TransactionsIcon width={24} height={24} />, path: '/transactions', label: 'Txns' },
    { icon: <RemindersIcon width={24} height={24} />, path: '/reminders', label: 'Notes' },
  ];


  return (
    <nav className={`${styles.nav} mobElement`}>
      <div className={styles.container}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <div className={styles.iconWrapper}>
              {item.icon}
            </div>
            {/* <span className={styles.label}>{item.label}</span> */}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
