import { Link, useLocation, useNavigate, matchPath } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './Header.module.scss';
import logo from '@/assets/Core-logo.svg';

export default function Header() {
  const { currentUser, userData, isCloudSynced, isOnline } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/' || location.pathname === '/dashboard';

  // 1. Root Titles Map
  const ROOT_TITLES: Record<string, string> = {
    '/transactions': 'Transactions',
    '/accounts': 'Accounts',
    '/flow': 'Flow',
    '/reminders': 'Reminders',
    '/profile': 'Profile'
  };

  let pageTitle = ROOT_TITLES[location.pathname] || '';
  let showBackButton = false;
  let isSubPage = false;

  // 2. Action Page Matchers
  const flowMatch = matchPath({ path: "/flow/manage/:type/:id" }, location.pathname);
  const accountMatch = matchPath({ path: "/accounts/:id/edit" }, location.pathname);

  if (flowMatch) {
    const { type, id } = flowMatch.params;
    const isNew = id === 'new';
    pageTitle = `${isNew ? 'Add' : 'Edit'} ${type?.charAt(0).toUpperCase()}${type?.slice(1)}`;
    showBackButton = true;
    isSubPage = true;
  } else if (accountMatch) {
    const { id } = accountMatch.params;
    const isNew = id === 'new';
    pageTitle = isNew ? 'Add Account' : 'Edit Account';
    showBackButton = true;
    isSubPage = true;
  }

  // 3. Root Fallbacks (Ensure sub-tabs like /flow/social show 'Flow')
  if (!pageTitle && location.pathname.startsWith('/flow')) {
    pageTitle = 'Flow';
  }

  const profileImage = userData?.photoURL || currentUser?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=default";

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {isHome ? (
          <Link to="/">
            <img src={logo} alt="Core Logo" className={styles.logo} />
          </Link>
        ) : (
          <div className={styles.pageTitleArea}>
            {showBackButton && (
              <button onClick={() => navigate(-1)} className={styles.backBtn}>
                <ChevronLeft size={24} />
              </button>
            )}
            <h1 className={`${styles.pageTitle} ${isSubPage ? styles.navTitle : ''}`}>
              {pageTitle}
            </h1>
          </div>
        )}
        
        <div className={styles.rightSection}>
          <div 
            className={`${styles.syncDot} ${!isOnline ? styles.offline : !isCloudSynced ? styles.syncing : styles.synced}`}
            title={!isOnline ? 'Offline' : !isCloudSynced ? 'Syncing...' : 'Cloud Balanced'}
          />
          <Link to="/profile" className={styles.profileWrapper}>
            <img src={profileImage} alt="Profile" className={styles.profilePic} />
          </Link>
        </div>
      </div>
    </header>
  );
}

