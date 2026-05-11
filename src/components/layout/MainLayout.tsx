import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from './Header';
import BottomNav from './BottomNav';
import NexusIcon from '@/assets/icons/nexus-icon.svg?react';
import { useNexus } from '@/context/NexusContext';
import styles from './MainLayout.module.scss';

export default function MainLayout() {
  const location = useLocation();
  const { toggleNexus } = useNexus();

  // Hide FAB on specific pages (like account detail/edit)
  const isDetailPage = location.pathname.includes('/edit') || location.pathname.includes('/manage');
  const showNexus = !isDetailPage;

  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
      <BottomNav />
      
      {/* Global Nexus FAB */}
      {showNexus && (
        <motion.div 
          className={styles.nexusFab}
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.5 
          }}
          whileTap={{ scale: 0.9 }}
          onClick={() => toggleNexus()}
        >
          <NexusIcon />
        </motion.div>
      )}
    </div>
  );
}
