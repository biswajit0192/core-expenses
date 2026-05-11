import { useEffect, useState } from 'react';
import logo from '@/assets/Core-logo.svg';
import styles from './SplashScreen.module.scss';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  // Note: App.tsx handles the actual removal from DOM after 2s.
  // This state is just for the fade-out animation.
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 1500); // Start fade-out slightly before 2s
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`${styles.splashContainer} ${!isVisible ? styles.fadeOut : ''}`}>
      <div className={styles.logoWrapper}>
        <img src={logo} alt="Core Logo" className={styles.logo} />
      </div>
    </div>
  );
}
