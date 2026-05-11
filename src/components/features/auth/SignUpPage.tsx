import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Auth.module.scss';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { validateAuth } from '@/lib/validation';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    const validationError = validateAuth(username, email, password, true);
    if (validationError) {
      return setError(validationError);
    }

    try {
      setError('');
      setLoading(true);
      await signUp(email, username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create an account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.headingGroup}>
        <p className={styles.subtitlePrimary}>JOIN THE OBSIDIAN LEDGER</p>
        <h1 className={styles.title}>Start your journey</h1>
      </div>

      <form className={styles.formSignup} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        
        <div className={styles.inputGroup}>
          <label htmlFor="email">EMAIL</label>
          <input
            id="email"
            type="email"
            placeholder="Enter Email Address"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="username">USERNAME</label>
          <input
            id="username"
            type="text"
            placeholder="Set New Username"
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password">PASSWORD</label>
          <div className={styles.passwordWrapper}>
            <input
               id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Set New Password"
              className={styles.input}
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

        <div className={styles.inputGroup}>
          <label htmlFor="confirmPassword">CONFIRM PASSWORD</label>
          <div className={styles.passwordWrapper}>
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Enter Password Again"
              className={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Signing Up...' : 'Create Account'}
        </button>
      </form>

      <p className={styles.footerLink}>
        HAVE AN ACCOUNT? <Link to="/login">SIGN IN</Link>
      </p>
    </div>
  );
}
