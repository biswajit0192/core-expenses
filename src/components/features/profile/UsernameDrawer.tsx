import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Check, ShieldCheck } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import styles from './UsernameDrawer.module.scss';

interface UsernameDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UsernameDrawer({ isOpen, onClose }: UsernameDrawerProps) {
  const { currentUser, userData } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Step 1: Verify
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);

  // Step 2: Update
  const [newUsername, setNewUsername] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentPassword) return;

    setLoading(true);
    setError('');
    try {
      await authService.verifyCurrentPassword(currentUser, currentPassword);
      setStep(2);
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') {
        setError('Incorrect current password.');
      } else {
        setError('Verification failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newUsername) return;

    // Validation
    if (newUsername.length < 3 || newUsername.length > 20) {
      return setError('Username must be between 3 and 20 characters.');
    }
    if (newUsername === userData?.username) {
      return setError('New username must be different from current one.');
    }

    setLoading(true);
    setError('');
    try {
      await authService.updateUsername(currentUser, newUsername);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update username.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCurrentPassword('');
    setNewUsername('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className={styles.drawer}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <header className={styles.header}>
            <h2 className={styles.title}>Update Username</h2>
            <button className={styles.closeBtn} onClick={handleClose}>
              <X size={20} />
            </button>
          </header>

          <div className={styles.content}>
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div 
                  key="success"
                  className={styles.successState}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className={styles.checkIcon}>
                    <Check size={48} strokeWidth={3} />
                  </div>
                  <h2 className={styles.title}>Username Updated</h2>
                  <p className={styles.modalDesc}>
                    Your username has been successfully updated to <strong>{newUsername}</strong>.
                  </p>
                  <button className={styles.submitBtn} onClick={handleClose}>
                    Done
                  </button>
                </motion.div>
              ) : step === 1 ? (
                <motion.div 
                  key="step1"
                  className={styles.stepContainer}
                  initial={{ x: 0 }}
                  exit={{ x: -100, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.inputGroup}>
                    <label>Current Password</label>
                    <div className={styles.inputWrapper}>
                      <input 
                        type={showCurrent ? 'text' : 'password'}
                        className={styles.input}
                        placeholder="Confirm current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoFocus
                      />
                      <button 
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowCurrent(!showCurrent)}
                      >
                        {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  {error && <div className={styles.error}>{error}</div>}
                  <button 
                    className={styles.submitBtn}
                    onClick={handleVerify}
                    disabled={loading || !currentPassword}
                  >
                    {loading ? 'Verifying...' : 'Next Step'}
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="step2"
                  className={styles.stepContainer}
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.inputGroup}>
                    <label>New Username</label>
                    <div className={styles.inputWrapper}>
                      <input 
                        type="text"
                        className={styles.input}
                        placeholder="3-20 characters"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  {error && <div className={styles.error}>{error}</div>}
                  
                  <button 
                    className={styles.submitBtn}
                    onClick={handleUpdate}
                    disabled={loading || !newUsername}
                  >
                    {loading ? 'Updating...' : 'Update Username'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <footer className={styles.footer}>
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
              <ShieldCheck size={14} />
              <span>Secure Profile Update</span>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
