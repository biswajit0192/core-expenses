import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccounts } from '@/hooks/useAccounts';
import { useAuth } from '@/context/AuthContext';
import { accountService } from '@/services/accountService';
import { monthlySnapshotService } from '@/services/monthlySnapshotService';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { LayoutDashboard, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import styles from './AccountDetailView.module.scss';

export default function AccountDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { accounts } = useAccounts();
  const isNew = id === 'new';
  const account = isNew ? undefined : accounts.find(a => a.id === id);
  
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [displayBalance, setDisplayBalance] = useState<string>('');
  
  const [accountCategory, setAccountCategory] = useState<'Spending' | 'Savings' | 'Fixed'>('Spending');
  const [goalAmount, setGoalAmount] = useState<number | ''>('');
  const [displayGoalAmount, setDisplayGoalAmount] = useState<string>('');
  const [goalDate, setGoalDate] = useState<Date | null>(null);
  
  const [budget, setBudget] = useState<number | ''>('');
  const [displayBudget, setDisplayBudget] = useState<string>('');

  const [isSelected, setIsSelected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setBankName(account.bankName || '');
      setBalance(account.balance);
      setDisplayBalance(account.balance.toLocaleString('en-IN'));
      setAccountCategory(account.accountCategory || 'Spending');
      setGoalAmount(account.goalAmount || '');
      setDisplayGoalAmount(account.goalAmount ? account.goalAmount.toLocaleString('en-IN') : '');
      setGoalDate(account.goalDate ? new Date(account.goalDate) : null);
      setBudget(account.budget && account.budget > 0 ? account.budget : '');
      setDisplayBudget(account.budget && account.budget > 0 ? account.budget.toLocaleString('en-IN') : '');
      setIsSelected(account.isSelected);
    } else if (isNew) {
      setName('');
      setBankName('');
      setBalance(0);
      setDisplayBalance('');
      setAccountCategory('Spending');
      setGoalAmount('');
      setDisplayGoalAmount('');
      setGoalDate(null);
      setBudget('');
      setDisplayBudget('');
      setIsSelected(false);
    }
  }, [account, isNew]);

  const handleSave = async () => {
    if (!currentUser) return;
    if (!isNew && !id) return;
    setIsSaving(true);
    try {
      // Check for duplicate names (case-insensitive)
      const duplicate = accounts.find(a => 
        a.name.trim().toUpperCase() === name.trim().toUpperCase() && 
        (isNew ? true : a.id !== id)
      );

      if (duplicate) {
        alert(`An account named "${name}" already exists. Please use a unique name.`);
        setIsSaving(false);
        return;
      }

      // EMERGENCY account always gets red theme
      let theme: 'blue' | 'green' | 'red' = accountCategory === 'Spending' ? 'blue' : 'green';
      if (name.trim().toUpperCase() === 'EMERGENCY') {
        theme = 'red';
      }

      if (isNew) {
        await accountService.createAccount(currentUser.uid, {
          name: name.trim() || 'Custom Account',
          bankName: bankName.trim() || null,
          balance,
          type: 'Custom',
          accountCategory,
          goalAmount: typeof goalAmount === 'number' ? goalAmount : null,
          goalDate: goalDate ? goalDate.toISOString() : null,
          budget: typeof budget === 'number' ? budget : null,
          isSelected,
          theme
        });
      } else {
        await accountService.updateAccount(currentUser.uid, id!, {
          name,
          bankName: bankName.trim() || null,
          balance,
          accountCategory,
          goalAmount: typeof goalAmount === 'number' ? goalAmount : null,
          goalDate: goalDate ? goalDate.toISOString() : null,
          budget: typeof budget === 'number' ? budget : null,
          isSelected,
          theme
        });
      }

      // Phase 6.7.1: Strict Source of Truth Sync
      // Triggered on every save (Toggle ON, Toggle OFF, or Balance Change)
      await monthlySnapshotService.recalculateOrInitMonthlySnapshot(currentUser.uid);

      navigate(-1);
    } catch (error) {
      console.error("Error updating account:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !id) return;
    if (window.confirm("Are you sure you want to delete this account? This action cannot be undone.")) {
      setIsSaving(true);
      try {
        await accountService.deleteAccount(currentUser.uid, id);
        navigate(-1);
      } catch (error) {
        console.error("Error deleting account:", error);
        setIsSaving(false);
      }
    }
  };

  if (!isNew && !account) return <div className={styles.loading}>Account not found...</div>;

  return (
    <div className={styles.container}>
      <main className={styles.content}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Account Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => {
              const val = e.target.value;
              setName(val);
              // Auto-set category to Savings if name is EMERGENCY (during creation)
              if (isNew && val.trim().toUpperCase() === 'EMERGENCY') {
                setAccountCategory('Savings');
              }
            }}
            className={styles.input}
            placeholder="e.g. MAIN"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Bank Name (Optional)</label>
          <input 
            type="text" 
            value={bankName} 
            onChange={(e) => setBankName(e.target.value)}
            className={styles.input}
            placeholder="e.g. ICICI Bank"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Current Balance (₹)</label>
          <input 
            type="text"
            inputMode="numeric"
            value={displayBalance} 
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, '');
              if (!raw) {
                setDisplayBalance('');
                setBalance(0);
              } else {
                const num = parseInt(raw, 10);
                setDisplayBalance(num.toLocaleString('en-IN'));
                setBalance(num);
              }
            }}
            className={styles.input}
            placeholder="0"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Account Type</label>
          <div className={styles.segmentedControl}>
            <button 
              className={`${styles.segmentBtn} ${accountCategory === 'Spending' ? styles.active : ''}`}
              onClick={() => setAccountCategory('Spending')}
            >
              Spending
            </button>
            <button 
              className={`${styles.segmentBtn} ${accountCategory === 'Savings' ? styles.active : ''}`}
              onClick={() => setAccountCategory('Savings')}
            >
              Savings
            </button>
          </div>
        </div>
        
        {accountCategory === 'Spending' && (
          <div className={styles.goalsBox}>
            <h3 className={styles.goalsTitle}>Monthly Budget</h3>
            <p className={styles.goalsDesc}>Set a spending limit for this account.</p>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Budget Amount (₹)</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={displayBudget} 
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  if (!raw) {
                    setDisplayBudget('');
                    setBudget('');
                  } else {
                    const num = parseInt(raw, 10);
                    setDisplayBudget(num.toLocaleString('en-IN'));
                    setBudget(num);
                  }
                }}
                className={styles.input}
                placeholder="e.g. 50,000"
              />
            </div>
          </div>
        )}

        {accountCategory === 'Savings' && (
          <div className={styles.goalsBox}>
            <h3 className={styles.goalsTitle}>Savings Goal</h3>
            <p className={styles.goalsDesc}>Set a target to keep yourself motivated!</p>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Goal Amount (₹)</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={displayGoalAmount} 
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  if (!raw) {
                    setDisplayGoalAmount('');
                    setGoalAmount('');
                  } else {
                    const num = parseInt(raw, 10);
                    setDisplayGoalAmount(num.toLocaleString('en-IN'));
                    setGoalAmount(num);
                  }
                }}
                className={styles.input}
                placeholder="e.g. 1,00,000"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Target Date</label>
              <div className={styles.datePickerWrapper}>
                <CalendarIcon size={18} className={styles.dateIcon} />
                <DatePicker
                  selected={goalDate}
                  onChange={(date: Date | null) => setGoalDate(date)}
                  dateFormat="MMM d, yyyy"
                  className={styles.dateInput}
                  placeholderText="Optional Target Date"
                  withPortal
                  isClearable
                />
              </div>
            </div>
          </div>
        )}

        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <LayoutDashboard size={20} className={styles.icon} />
            <div>
              <span className={styles.toggleLabel}>Show on Dashboard</span>
              <p className={styles.toggleDesc}>Include this balance in "Safe to Spend"</p>
            </div>
          </div>
          <label className={styles.switch}>
            <input 
              type="checkbox" 
              checked={isSelected} 
              onChange={(e) => setIsSelected(e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.saveBtn} 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : (isNew ? 'Create Account' : 'Save Changes')}
          </button>

          {!isNew && (
            <button 
              className={styles.deleteBtn} 
              onClick={handleDelete}
              disabled={isSaving}
            >
              <Trash2 size={16} /> Delete Account
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
