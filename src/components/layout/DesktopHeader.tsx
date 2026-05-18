import { useEffect, useState } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import styles from './DesktopHeader.module.scss';

export default function DesktopHeader() {
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Title logic mirrored from mobile header
  const ROOT_TITLES: Record<string, string> = {
    '/': 'Dashboard',
    '/dashboard': 'Dashboard',
    '/transactions': 'Transactions',
    '/accounts': 'Accounts',
    '/flow': 'Flow',
    '/reminders': 'Reminders',
    '/profile': 'Profile'
  };

  let pageTitle = ROOT_TITLES[location.pathname] || '';
  
  // Action Page Matchers
  const flowMatch = matchPath({ path: "/flow/manage/:type/:id" }, location.pathname);
  const accountMatch = matchPath({ path: "/accounts/:id/edit" }, location.pathname);

  if (flowMatch) {
    const { type, id } = flowMatch.params;
    const isNew = id === 'new';
    pageTitle = `${isNew ? 'Add' : 'Edit'} ${type?.charAt(0).toUpperCase()}${type?.slice(1)}`;
  } else if (accountMatch) {
    const { id } = accountMatch.params;
    const isNew = id === 'new';
    pageTitle = isNew ? 'Add Account' : 'Edit Account';
  }

  if (!pageTitle && location.pathname.startsWith('/flow')) {
    pageTitle = 'Flow';
  }

  // Formatting Date: "Sat, 16 May"
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('en-GB', options);
  };

  // Formatting Time: "18:30"
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <header className={`${styles.header} desktopElement`}>
      <div className={styles.titleSection}>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
      </div>

      <div className={styles.timeSection}>
        <div className={styles.dateText}>{formatDate(currentTime)}</div>
        <div className={styles.timeText}>{formatTime(currentTime)}</div>
      </div>
    </header>
  );
}
