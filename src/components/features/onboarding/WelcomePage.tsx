import { useNavigate } from 'react-router-dom';
import logo from '@/assets/Core-logo.svg';
import styles from './WelcomePage.module.scss';
import Rocket from '@/assets/icons/rocket.svg?react';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <img src={logo} alt="Core Logo" className={styles.logo} />
      </header>
      
      <main className={styles.content}>
        <h1 className={styles.title}>Simply Core.</h1>
        <p className={styles.subtitle}>Your essential financial dashboard.</p>
      </main>

      <footer className={styles.footer}>
        <button 
          className={styles.getStartedBtn} 
          onClick={() => navigate('/login')}
        >
          Get Started <Rocket className={styles.rocket} />
        </button>
      </footer>
    </div>
  );
}
