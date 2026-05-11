import styles from './ComingSoonPage.module.scss';
import logo from '@/assets/Core-logo.svg';

export default function ComingSoonPage() {
  return (
    <div className={styles.container}>
      <div className={styles.glow1} />

      <main className={styles.main}>
        <header className={styles.header}>
          <img src={logo} alt="Core Logo" className={styles.logo} />
        </header>
        <div className={styles.content}>
          <h1 className={styles.title}>
            The Ledger is<br />
            <span className={styles.highlight}>Evolving.</span>
          </h1>
          
          <p className={styles.subtitle}>
            A new era of financial command is<br />
            approaching. Join the obsidian waitlist.
          </p>

          <div className={styles.progressSection}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: '84%' }} />
            </div>
            <div className={styles.progressText}>
              <span className={styles.percentNumber}>84</span>
              <span className={styles.percentLabel}>PERCENT DONE</span>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        COMING SOON!
      </footer>
    </div>
  );
}
