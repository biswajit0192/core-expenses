import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import styles from './Auth.module.scss';
import { Eye, EyeOff, X, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { validateAuth } from '@/lib/validation';
import { authService } from '@/services/authService';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const validationError = validateAuth(identifier, '', password, false);
    if (validationError) {
      return setError(validationError);
    }
    try {
      setError('');
      setLoading(true);
      await login(identifier, password);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(err.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail) return setResetError('Please enter your email');
    
    setResetLoading(true);
    setResetError('');
    try {
      await authService.sendPasswordReset(resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setResetError('No account found with this email.');
      } else {
        setResetError('Failed to send reset email. Try again.');
      }
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <>
      <div className={styles.wrapper}>
        <div className={styles.headingGroup}>
          <h1 className={styles.title}>Welcome back.</h1>
          <p className={styles.subtitle}>ACCESS YOUR OBSIDIAN LEDGER</p>
        </div>

        <form className={styles.formLogin} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.inputGroup}>
            <label htmlFor="identifier">USERNAME OR EMAIL</label>
            <input
              id="identifier"
              type="text"
              className={styles.input}
              placeholder="Enter Username or Email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="password">PASSWORD</label>
              <button 
                type="button" 
                className={styles.forgot}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsResetModalOpen(true);
                }}
              >
                FORGOT?
              </button>
            </div>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className={styles.footerLink}>
          DON'T HAVE AN ACCOUNT? <Link to="/signup">Create Account</Link>
        </p>
      </div>

      {/* Forgot Password Modal via Portal */}
      {isResetModalOpen && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button 
              className={styles.modalClose}
              onClick={() => {
                setIsResetModalOpen(false);
                setResetSuccess(false);
                setResetEmail('');
                setResetError('');
              }}
            >
              <X size={20} />
            </button>

            {!resetSuccess ? (
              <>
                <div className={styles.modalHeader}>
                  <h2 className={styles.modalTitle}>Reset Password</h2>
                  <p className={styles.modalDesc}>
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className={styles.formLogin} style={{ marginTop: 0 }}>
                  {resetError && <div className={styles.error}>{resetError}</div>}
                  <div className={styles.inputGroup}>
                    <label>EMAIL ADDRESS</label>
                    <input
                      type="email"
                      className={styles.input}
                      placeholder="e.g. user@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    className={styles.submitBtn} 
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            ) : (
              <div className={styles.successState}>
                <div className={styles.checkIcon}>
                  <Check size={32} strokeWidth={3} />
                </div>
                <h2 className={styles.modalTitle}>Check Your Inbox</h2>
                <p className={styles.modalDesc}>
                  We've sent a password reset link to <strong>{resetEmail}</strong>. 
                  Please check your email to continue.
                </p>
                <button 
                  className={styles.submitBtn}
                  onClick={() => setIsResetModalOpen(false)}
                >
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
