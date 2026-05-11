import { useState, useEffect, forwardRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Calendar as CalendarIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { firebaseFlowService } from '@/services/firebaseFlowService';
import { useAuth } from '@/context/AuthContext';
import { 
  calculateFlatRate, 
  calculateFlatTenure, 
  solveReducingRate, 
  calculateReducingTenure 
} from '@/utils/loanUtils';
import { useAccounts } from '@/hooks/useAccounts';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import styles from './ManageFlow.module.scss';

type FlowType = 'tenure' | 'social' | 'monthly';

// Custom Trigger for DatePicker (Non-typeable)
const CustomDateInput = forwardRef(({ value, onClick }: any, ref: any) => (
  <button className={styles.dateTrigger} onClick={onClick} ref={ref} type="button">
    <CalendarIcon size={20} className={styles.dateIcon} />
    <span className={styles.dateText}>{value || 'Select Date'}</span>
  </button>
));

export default function ManageFlow() {
  const { type, id } = useParams<{ type: string; id?: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { accounts } = useAccounts();
  
  const [currentId, setCurrentId] = useState<string>(id === 'new' ? '' : (id || ''));
  const isNew = !currentId;
  const flowType = type as FlowType;

  // Form State
  const [formData, setFormData] = useState<any>({
    isSettled: false,
    paidMonths: [],
    interestType: 'FLAT', // Default
    activeField: null // To track which field is being manually edited
  });
  const [isSaving, setIsSaving] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(!isNew);

  // Initialize Form Data
  useEffect(() => {
    if (isNew) {
      if (flowType === 'tenure') {
        setFormData({
          title: '',
          type: 'EMI',
          accountId: 'account_main', // Default to Main
          totalPrincipal: 0,
          displayPrincipal: '',
          monthlyEmi: 0,
          displayEmi: '',
          totalMonths: 12,
          startDate: new Date(),
          category: 'Shopping',
          isSettled: false,
          interestRate: 0,
          interestType: 'FLAT',
          paidMonths: []
        });
      } else if (flowType === 'social') {
        setFormData({
          personName: '',
          type: 'LENT',
          totalAmount: 0,
          displayAmount: '',
          amountSettled: 0,
          displaySettled: '',
          date: new Date(),
          isSettled: false
        });
      } else if (flowType === 'monthly') {
        setFormData({
          provider: '',
          amount: 0,
          accountId: 'account_main', // Default to Main
          displayAmount: '',
          cycle: 'MONTHLY',
          category: 'ENTERTAINMENT',
          nextBillDate: new Date(),
          isSettled: false,
          paidMonths: []
        });
      }
    } else {
      const fetchItem = async () => {
        if (!currentUser || isNew) return;
        const colType = flowType === 'tenure' ? 'TENURE' : flowType === 'monthly' ? 'MONTHLY' : 'SOCIAL';
        
        try {
          const data = await firebaseFlowService.getFlow(currentUser.uid, currentId, colType);
          if (data) {
            // Hydrate state with formatted display values
            const hydrated = { ...data };
            
            if (flowType === 'tenure') {
              hydrated.startDate = data.startDate ? new Date(data.startDate) : new Date();
              hydrated.displayPrincipal = data.totalPrincipal ? Number(data.totalPrincipal).toLocaleString('en-IN') : '';
              hydrated.displayEmi = data.monthlyEmi ? Number(data.monthlyEmi).toLocaleString('en-IN') : '';
              hydrated.interestRate = data.interestRate || '';
              hydrated.interestType = data.interestType || 'FLAT';
            } else if (flowType === 'social') {
              hydrated.date = data.date ? new Date(data.date) : new Date();
              hydrated.displayAmount = data.totalAmount ? Number(data.totalAmount).toLocaleString('en-IN') : '';
              hydrated.displaySettled = data.amountSettled ? Number(data.amountSettled).toLocaleString('en-IN') : '';
            } else if (flowType === 'monthly') {
              hydrated.nextBillDate = data.nextBillDate ? new Date(data.nextBillDate) : new Date();
              hydrated.displayAmount = data.amount ? Number(data.amount).toLocaleString('en-IN') : '';
              hydrated.cycle = 'MONTHLY'; // Force conversion to Monthly on Load
            }
            
            setFormData(hydrated);
          }
        } catch (error) {
          console.error("Failed to fetch flow item:", error);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchItem();
    }
  }, [isNew, flowType, currentId, currentUser]);

  // Smart Solver Logic
  useEffect(() => {
    // Only return if fields are truly missing, allow numeric 0 or string values
    if (flowType !== 'tenure' || formData.totalPrincipal === undefined || formData.monthlyEmi === undefined) return;

    const principal = Number(formData.totalPrincipal || 0);
    const emi = Number(formData.monthlyEmi || 0);
    const months = Number(formData.totalMonths || 0);
    // Default rate to 0 to prevent NaN comparisons
    const rate = Number(formData.interestRate || 0);
    const isFlat = formData.interestType === 'FLAT';

    // Guard: Can't calculate if Principal or EMI are 0
    if (principal <= 0 || emi <= 0) return;

    // Solve for RATE if user is editing Months
    if (formData.activeField === 'months' && months > 0) {
      const solvedRate = isFlat 
        ? calculateFlatRate(principal, emi, months) 
        : solveReducingRate(principal, emi, months);
      
      const newVal = Math.max(0, solvedRate).toFixed(2);
      if (newVal !== formData.interestRate?.toString()) {
        setFormData((prev: any) => ({ ...prev, interestRate: newVal }));
      }
    } 
    // Solve for MONTHS if user is editing Rate (only if rate is provided)
    else if (formData.activeField === 'rate' && formData.interestRate !== '') {
      const solvedMonths = isFlat 
        ? calculateFlatTenure(principal, emi, rate) 
        : calculateReducingTenure(principal, emi, rate);
      
      const guardedMonths = Math.max(1, solvedMonths);
      if (guardedMonths !== months) {
        setFormData((prev: any) => ({ ...prev, totalMonths: guardedMonths }));
      }
    }
  }, [
    formData.totalPrincipal, 
    formData.monthlyEmi, 
    formData.totalMonths, 
    formData.interestRate, 
    formData.interestType, 
    formData.activeField, 
    flowType
  ]);

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    
    try {
      const colType = flowType === 'tenure' ? 'TENURE' : flowType === 'monthly' ? 'MONTHLY' : 'SOCIAL';
      
      let finalData: any = { ...formData };
      
      if (flowType === 'tenure') {
        finalData = {
          ...finalData,
          totalPrincipal: Number(formData.totalPrincipal),
          monthlyEmi: Number(formData.monthlyEmi),
          totalMonths: Number(formData.totalMonths),
          interestRate: Number(formData.interestRate || 0),
          startDate: formData.startDate.toISOString(),
          isSettled: false // Managed by date-diff now
        };
      } else if (flowType === 'social') {
        finalData = {
          ...finalData,
          totalAmount: Number(formData.totalAmount),
          amountSettled: Number(formData.amountSettled),
          date: formData.date instanceof Date ? formData.date.toISOString() : new Date().toISOString(),
          createdAt: formData.createdAt || new Date().toISOString(),
          // Auto-Archive if fully settled
          isSettled: Number(formData.amountSettled) >= Number(formData.totalAmount)
        };
      } else if (flowType === 'monthly') {
        finalData = {
          ...finalData,
          amount: Number(formData.amount),
          cycle: 'MONTHLY', // Force Monthly on Save
          nextBillDate: formData.nextBillDate.toISOString(),
          startedAt: formData.startedAt || new Date().toISOString()
        };
      }

      if (isNew) {
        if (flowType === 'monthly') {
          const existingSub = await firebaseFlowService.findSubscriptionByName(currentUser.uid, finalData.provider);
          
          if (existingSub) {
            if (!existingSub.isSettled) {
              window.alert("Subscription is already active, please try with a different name.");
              setIsSaving(false);
              return;
            } else {
              await firebaseFlowService.updateFlow(currentUser.uid, existingSub.id, {
                ...finalData,
                isSettled: false
              }, 'MONTHLY');
              navigate(-1);
              return;
            }
          }
        } else if (flowType === 'social') {
          const existingDebt = await firebaseFlowService.findPersonalDebtByName(currentUser.uid, finalData.personName);

          if (existingDebt) {
            const newAmount = Number(finalData.totalAmount);
            const isSameType = (existingDebt.type || '').toUpperCase() === (finalData.type || '').toUpperCase();
            
            let updatedData = { ...existingDebt };

            if (isSameType) {
              updatedData.totalAmount = Number(existingDebt.totalAmount || 0) + newAmount;
              updatedData.isSettled = false;
              await firebaseFlowService.updateFlow(currentUser.uid, existingDebt.id, updatedData, 'SOCIAL');
              navigate(-1);
              return;
            } else {
              if (existingDebt.isSettled) {
                await firebaseFlowService.addFlow(currentUser.uid, finalData, colType);
                navigate(-1);
                return;
              }

              updatedData.amountSettled = Number(existingDebt.amountSettled || 0) + newAmount;

              if (updatedData.amountSettled > updatedData.totalAmount) {
                const excess = updatedData.amountSettled - updatedData.totalAmount;
                updatedData.amountSettled = updatedData.totalAmount;
                updatedData.isSettled = true;
                
                await firebaseFlowService.updateFlow(currentUser.uid, existingDebt.id, updatedData, 'SOCIAL');
                
                const newCardData = {
                  ...finalData,
                  totalAmount: excess,
                  amountSettled: 0,
                  isSettled: false
                };
                await firebaseFlowService.addFlow(currentUser.uid, newCardData, colType);
                navigate(-1);
                return;
              }
              
              if (updatedData.amountSettled === updatedData.totalAmount) {
                 updatedData.isSettled = true;
              } else {
                 updatedData.isSettled = false;
              }

              await firebaseFlowService.updateFlow(currentUser.uid, existingDebt.id, updatedData, 'SOCIAL');
              navigate(-1);
              return;
            }
          }
        }
        await firebaseFlowService.addFlow(currentUser.uid, finalData, colType);
      } else {
        await firebaseFlowService.updateFlow(currentUser.uid, currentId, finalData, colType);
      }
      
      navigate(-1);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this flow?')) return;
    if (!currentUser) return;

    try {
      const colType = flowType === 'tenure' ? 'TENURE' : flowType === 'monthly' ? 'MONTHLY' : 'SOCIAL';
      // Archive instead of hard delete as per user preference
      await firebaseFlowService.settleFlow(currentUser.uid, currentId, colType);
      navigate(-1);
    } catch (error) {
       console.error("Delete failed:", error);
    }
  };

  if (isLoadingData || (!formData && !isNew)) return <div className={styles.loading}>Loading flow...</div>;

  return (
    <div className={styles.container}>
      <main className={styles.content}>
        {/* SHARED NAME/TITLE FIELD */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            {flowType === 'tenure' ? 'Flow Title' : flowType === 'social' ? 'Person Name' : 'Service Provider'}
          </label>
          <input 
            type="text" 
            value={formData.title || formData.personName || formData.provider || ''} 
            onChange={(e) => {
              const val = e.target.value;
              if (flowType === 'tenure') setFormData({ ...formData, title: val });
              else if (flowType === 'social') setFormData({ ...formData, personName: val });
              else setFormData({ ...formData, provider: val });
            }}
            onBlur={async (e) => {
              if (flowType === 'social' && isNew && currentUser) {
                const val = e.target.value;
                if (!val.trim()) return;
                
                const existing = await firebaseFlowService.findPersonalDebtByName(currentUser.uid, val);
                if (existing) {
                  setCurrentId(existing.id);
                  setFormData({
                    ...existing,
                    date: existing.date ? new Date(existing.date) : new Date(),
                    displayAmount: existing.totalAmount ? Number(existing.totalAmount).toLocaleString('en-IN') : '',
                    displaySettled: existing.amountSettled ? Number(existing.amountSettled).toLocaleString('en-IN') : '',
                  });
                }
              }
            }}
            className={styles.input}
            placeholder={flowType === 'social' ? "e.g. Arnab" : "e.g. Netflix / iPhone EMI"}
          />
        </div>

        {/* ACCOUNT SELECTOR (Not for Social) */}
        {flowType !== 'social' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Payment Account</label>
            <select 
              className={styles.input}
              value={formData.accountId || 'account_main'}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (₹{acc.balance.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
            <p className={styles.helpText}>Transactions will be deducted from this account when swiped.</p>
          </div>
        )}

        {/* FIXED FLOW SPECIFIC */}
        {flowType === 'tenure' && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>Type</label>
              <div className={styles.segmentedControl}>
                {['EMI', 'LOAN'].map(t => (
                  <button 
                    key={t}
                    className={`${styles.segmentBtn} ${formData.type === t ? styles.active : ''}`}
                    onClick={() => setFormData({ ...formData, type: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Principal Amount (₹)</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={formData.displayPrincipal || ''} 
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, totalPrincipal: raw || 0, displayPrincipal: raw ? parseInt(raw).toLocaleString('en-IN') : '' });
                }}
                className={styles.input}
                placeholder="0"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Monthly EMI (₹)</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={formData.displayEmi || ''} 
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, monthlyEmi: raw || 0, displayEmi: raw ? parseInt(raw).toLocaleString('en-IN') : '' });
                }}
                className={styles.input}
                placeholder="0"
              />
            </div>

            <div className={styles.flexRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tenure (Months)</label>
                <input 
                  type="number" 
                  value={(formData.totalMonths === undefined || formData.totalMonths === null || formData.totalMonths === '') ? '' : formData.totalMonths} 
                  onChange={(e) => setFormData({ ...formData, totalMonths: e.target.value })}
                  onFocus={() => setFormData({ ...formData, activeField: 'months' })}
                  className={styles.input}
                  placeholder="12"
                />
              </div>

              <div className={styles.formGroup}>
                <div className={styles.subLabel}>
                  <label className={styles.label}>% p.a.</label>
                  <div className={styles.interestTypeToggle}>
                    {['FLAT', 'RED'].map(m => (
                      <button 
                        key={m}
                        className={`${styles.toggleBtn} ${formData.interestType === m ? styles.active : ''}`}
                        onClick={() => setFormData((prev: any) => ({ ...prev, interestType: m }))}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <input 
                  type="number" 
                  step="0.01"
                  value={(formData.interestRate === undefined || formData.interestRate === null || formData.interestRate === '') ? '' : formData.interestRate} 
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  onFocus={() => setFormData({ ...formData, activeField: 'rate' })}
                  className={styles.input}
                  placeholder="0.00"
                />
              </div>
            </div>
          </>
        )}

        {/* PERSONAL DEBT SPECIFIC */}
        {flowType === 'social' && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>Status</label>
              <div className={styles.segmentedControl}>
                {['LENT', 'BORROWED'].map(t => (
                  <button 
                    key={t}
                    className={`${styles.segmentBtn} ${formData.type === t ? styles.active : ''}`}
                    onClick={() => setFormData({ ...formData, type: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Total Amount (₹)</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={formData.displayAmount || ''} 
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, totalAmount: raw || 0, displayAmount: raw ? parseInt(raw).toLocaleString('en-IN') : '' });
                }}
                className={styles.input}
                placeholder="0"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Settled Amount (₹)</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={formData.displaySettled || ''} 
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, amountSettled: raw || 0, displaySettled: raw ? parseInt(raw).toLocaleString('en-IN') : '' });
                }}
                className={styles.input}
                placeholder="0"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Transaction Date</label>
              <div className={styles.datePickerWrapper}>
                <DatePicker
                  selected={formData.date}
                  onChange={(date: Date | null) => setFormData({ ...formData, date: date })}
                  dateFormat="MMM d, yyyy"
                  customInput={<CustomDateInput />}
                  withPortal
                />
              </div>
            </div>
          </>
        )}

        {/* SUBSCRIPTION SPECIFIC */}
        {flowType === 'monthly' && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>Amount (₹)</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={formData.displayAmount || ''} 
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, amount: raw || 0, displayAmount: raw ? parseInt(raw).toLocaleString('en-IN') : '' });
                }}
                className={styles.input}
                placeholder="0"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Category</label>
              <select 
                className={styles.input}
                value={formData.category || 'ENTERTAINMENT'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="ENTERTAINMENT">Entertainment</option>
                <option value="SOFTWARE">Software</option>
                <option value="UTILITIES">Utilities</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Next Bill Date</label>
              <div className={styles.datePickerWrapper}>
                <DatePicker
                  selected={formData.nextBillDate}
                  onChange={(date: Date | null) => setFormData({ ...formData, nextBillDate: date })}
                  dateFormat="MMM d, yyyy"
                  customInput={<CustomDateInput />}
                  withPortal
                />
              </div>
            </div>
          </>
        )}

        {/* START DATE (COMMON FOR FIXED) */}
        {flowType === 'tenure' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Start Date</label>
            <div className={styles.datePickerWrapper}>
              <DatePicker
                selected={formData.startDate}
                onChange={(date: Date | null) => setFormData({ ...formData, startDate: date })}
                dateFormat="MMM d, yyyy"
                customInput={<CustomDateInput />}
                withPortal
              />
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className={styles.actions}>
          
          {/* SUBSCRIPTION SPECIFIC ACTIONS */}
          {flowType === 'monthly' && (
            <>
              {(!isNew && formData.isSettled) ? (
                <>
                  <button 
                    className={styles.saveBtn} 
                    onClick={async () => {
                      if (!currentUser) return;
                      setIsSaving(true);
                      try {
                        const finalData = {
                          ...formData,
                          amount: Number(formData.amount),
                          nextBillDate: formData.nextBillDate.toISOString(),
                          startedAt: formData.startedAt || new Date().toISOString(),
                          isSettled: false
                        };
                        await firebaseFlowService.updateFlow(currentUser.uid, currentId, finalData, 'MONTHLY');
                        navigate(-1);
                      } catch (error) {
                        console.error("Reactivate failed:", error);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Reactivate Subscription'}
                  </button>
                  <div className={styles.deleteContainer}>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isSaving}
                    >
                      <Trash2 size={16} /> Delete Subscription Completely
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : (isNew ? 'Add Flow' : 'Save Changes')}
                  </button>
                  {!isNew && (
                    <div className={styles.deleteContainer}>
                      <button 
                        className={styles.deleteBtn} 
                        onClick={async () => {
                          if (!cancelConfirm) {
                            setCancelConfirm(true);
                            return;
                          }
                          if (!currentUser) return;
                          setIsSaving(true);
                          try {
                            await firebaseFlowService.settleFlow(currentUser.uid, currentId, 'MONTHLY');
                            navigate(-1);
                          } catch (error) {
                            console.error("Cancel failed:", error);
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        disabled={isSaving}
                      >
                        {cancelConfirm ? 'Confirm?' : 'Cancel Subscription'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* PERSONAL SPECIFIC ACTIONS */}
          {flowType === 'social' && (
            <>
              <div className={styles.btnRow}>
                <button 
                  className={styles.saveBtn} 
                  onClick={handleSave}
                  disabled={isSaving || (!isNew && formData.isSettled && Number(formData.amountSettled) >= Number(formData.totalAmount))}
                  style={(!isNew && formData.isSettled && Number(formData.amountSettled) >= Number(formData.totalAmount)) ? { opacity: 0.5 } : {}}
                >
                  {isSaving ? 'Saving...' : (isNew ? 'Add Flow' : 'Save Changes')}
                </button>
                
                {!isNew && !formData.isSettled && (
                  <button 
                    className={styles.secondaryGradientBtn}
                    onClick={async () => {
                      if (!currentUser) return;
                      setIsSaving(true);
                      try {
                        await firebaseFlowService.updateFlow(currentUser.uid, currentId, {
                          amountSettled: Number(formData.totalAmount),
                          isSettled: true,
                          settledAt: new Date().toISOString()
                        }, 'SOCIAL');
                        navigate(-1);
                      } catch (e) {
                        console.error("Settle failed", e);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                  >
                    Settle Debt
                  </button>
                )}
              </div>

              {!isNew && (
                <div className={styles.deleteContainer}>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSaving}
                  >
                    <Trash2 size={16} /> Delete Flow
                  </button>
                </div>
              )}
            </>
          )}

          {/* FIXED SPECIFIC ACTIONS */}
          {flowType === 'tenure' && (
            <>
              {!formData.isSettled ? (
                <>
                  <div className={styles.btnRow}>
                    <button 
                      className={styles.saveBtn} 
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : (isNew ? 'Add Flow' : 'Save Changes')}
                    </button>

                    {!isNew && (
                      <button 
                        className={styles.secondaryGradientBtn}
                        onClick={async () => {
                          if (!currentUser) return;
                          setIsSaving(true);
                          try {
                            await firebaseFlowService.updateFlow(currentUser.uid, currentId, {
                              monthsPaid: Number(formData.totalMonths),
                              isSettled: true,
                              settledAt: new Date().toISOString()
                            }, 'TENURE');
                            navigate(-1);
                          } catch (e) {
                            console.error("Settle failed", e);
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        disabled={isSaving}
                      >
                        Settle Flow
                      </button>
                    )}
                  </div>

                  {!isNew && (
                    <div className={styles.deleteContainer}>
                      <button 
                        className={styles.deleteBtn} 
                        onClick={handleDelete}
                        disabled={isSaving}
                      >
                        <Trash2 size={16} /> Delete Flow
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.deleteContainer}>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSaving}
                  >
                    <Trash2 size={16} /> Delete Flow
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          if (!currentUser) return;
          setIsSaving(true);
          try {
            const colType = flowType === 'tenure' ? 'TENURE' : flowType === 'monthly' ? 'MONTHLY' : 'SOCIAL';
            await firebaseFlowService.deleteFlow(currentUser.uid, currentId, colType);
            navigate(-1);
          } catch (e) {
            console.error("Delete failed:", e);
          } finally {
            setIsSaving(false);
          }
        }}
        title="Delete Completely?"
        message="This action cannot be undone. The entry will be removed from your account forever."
        confirmText="Confirm Delete"
        type="danger"
      />
    </div>
  );
}
