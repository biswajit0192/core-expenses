import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Check, ShieldCheck } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import styles from './PasswordDrawer.module.scss';

interface PasswordDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PasswordDrawer({ isOpen, onClose }: PasswordDrawerProps) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Step 1: Verify
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);

  // Step 2: Update
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);

  const calculateStrength = (pass: string) => {
    if (!pass) return 0;
    if (pass.length < 6) return 25;
    if (pass.length < 10) return 60;
    return 100;
  };

  const strength = calculateStrength(newPassword);
  const strengthColor = strength <= 25 ? '#ff4d4d' : strength <= 60 ? '#f59e0b' : 'var(--colors-primary)';

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
    if (!currentUser || !newPassword || !confirmPassword) return;

    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    setError('');
    try {
      await authService.updateUserPassword(currentUser, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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
            <h2 className={styles.title}>Security</h2>
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
                  <h2 className={styles.title}>Password Updated</h2>
                  <p className={styles.modalDesc}>
                    Your security credentials have been successfully updated.
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
                    <label>New Password</label>
                    <div className={styles.inputWrapper}>
                      <input 
                        type={showNew ? 'text' : 'password'}
                        className={styles.input}
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoFocus
                      />
                      <button 
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowNew(!showNew)}
                      >
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className={styles.strengthContainer}>
                      <div className={styles.strengthBar}>
                        <div 
                          className={styles.strengthFill}
                          style={{ 
                            width: `${strength}%`, 
                            backgroundColor: strengthColor,
                            boxShadow: `0 0 10px ${strengthColor}40`
                          }}
                        />
                      </div>
                      <span className={styles.strengthText} style={{ color: strengthColor }}>
                        {strength <= 25 ? 'Weak' : strength <= 60 ? 'Good' : 'Strong'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Confirm New Password</label>
                    <div className={styles.inputWrapper}>
                      <input 
                        type="password"
                        className={styles.input}
                        placeholder="Re-type new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && <div className={styles.error}>{error}</div>}
                  
                  <button 
                    className={styles.submitBtn}
                    onClick={handleUpdate}
                    disabled={loading || !newPassword || !confirmPassword}
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <footer className={styles.footer}>
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
              <ShieldCheck size={14} />
              <span>Secure Encrypted Update</span>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
