import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getProfileImage } from '@/utils/profileImage';
import HomeIcon from '@/assets/icons/home.svg?react';
import AccountsIcon from '@/assets/icons/accounts.svg?react';
import MoneyflowIcon from '@/assets/icons/moneyflow.svg?react';
import TransactionsIcon from '@/assets/icons/transaction.svg?react';
import RemindersIcon from '@/assets/icons/reminders.svg?react';
import logo from '@/assets/Core-logo.svg';
import styles from './DesktopSidebar.module.scss';

export default function DesktopSidebar() {
  const { currentUser, userData, isSyncing, isOnline } = useAuth();
  const [headerAvatar, setHeaderAvatar] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      setHeaderAvatar(e.detail);
    };
    window.addEventListener('core_profile_image_updated', handleUpdate);
    return () => window.removeEventListener('core_profile_image_updated', handleUpdate);
  }, []);

  const navItems = [
    { icon: <HomeIcon className={styles.icon} />, path: '/', label: 'Dashboard' },
    { icon: <AccountsIcon className={styles.icon} />, path: '/accounts', label: 'Accounts' },
    { icon: <MoneyflowIcon className={styles.icon} />, path: '/flow', label: 'Flow' },
    { icon: <TransactionsIcon className={styles.icon} />, path: '/transactions', label: 'Transactions' },
    { icon: <RemindersIcon className={styles.icon} />, path: '/reminders', label: 'Reminders' },
  ];

  const profileImage = headerAvatar || getProfileImage(userData?.photoURL || currentUser?.photoURL);

  return (
    <aside className={`${styles.sidebar} desktopElement`}>
      <div className={styles.topSection}>
        <div className={styles.logoArea}>
          <img src={logo} alt="Nexus Logo" className={styles.logo} />
        </div>

        <Link to="/profile" className={styles.profileSection}>
          <div className={styles.profileWrapper}>
            <img src={profileImage} alt="Profile" className={styles.profilePic} />
            <div 
              className={`${styles.syncDot} ${!isOnline ? styles.offline : isSyncing ? styles.syncing : styles.synced}`}
              title={!isOnline ? 'Offline' : isSyncing ? 'Syncing changes...' : 'All changes saved to cloud'}
            />
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.userName}>{userData?.username || 'User'}</span>
            <span className={styles.userStatus}>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </Link>
      </div>

      <nav className={styles.navSection}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
