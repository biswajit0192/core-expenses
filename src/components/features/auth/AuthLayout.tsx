import { Outlet } from 'react-router-dom';
import styles from './AuthLayout.module.scss';
import logo from '@/assets/Core-logo.svg';

export default function AuthLayout() {
  return (
    <div className="container">
      <div className={styles.glow1} />
      <main className={styles.card}>
        <header className={styles.header}>
          <img src={logo} alt="Core Logo" className={styles.logo} />
        </header>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
