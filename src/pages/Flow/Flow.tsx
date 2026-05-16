import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Archive, 
  Users, 
  RefreshCcw,
  ChevronDown,
  CreditCard
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import addIcon from '@/assets/icons/add.svg';
import { firebaseFlowService } from '@/services/firebaseFlowService';
import { useAuth } from '@/context/AuthContext';
import { calculateTenureProgress } from '@/utils/dateUtils';
import type { Tenure, Social, Monthly } from '@/types';
import styles from './Flow.module.scss';

import TenureCard from '@/components/features/flow/TenureCard/TenureCard';
import SocialCard from '@/components/features/flow/SocialCard/SocialCard';
import MonthlyCard from '@/components/features/flow/MonthlyCard/MonthlyCard';

type TabType = 'tenure' | 'social' | 'monthly';

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  { id: 'tenure', label: 'Tenure', icon: <Archive size={18} /> },
  { id: 'social', label: 'Social', icon: <Users size={18} /> },
  { id: 'monthly', label: 'Monthly', icon: <RefreshCcw size={18} /> },
];

export default function Flow() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const { currentUser } = useAuth();
  
  const [tenures, setTenures] = useState<Tenure[]>([]);
  const [socials, setSocials] = useState<Social[]>([]);
  const [monthlies, setMonthlies] = useState<Monthly[]>([]);
  const [loadingStates, setLoadingStates] = useState({
    tenure: true,
    social: true,
    monthly: true
  });
  const [showHistory, setShowHistory] = useState(false);

  const loading = loadingStates.tenure || loadingStates.social || loadingStates.monthly;

  // Validate tab or default to tenure
  const validTabs: TabType[] = ['tenure', 'social', 'monthly'];
  const activeTab = (tab && validTabs.includes(tab as TabType)) ? (tab as TabType) : 'tenure';

  // Redirection Logic
  useEffect(() => {
    if (!tab || !validTabs.includes(tab as TabType)) {
      navigate('/flow/tenure', { replace: true });
    }
  }, [tab, navigate]);

  useEffect(() => {
    if (!currentUser) return;

    // Trigger one-time migration
    firebaseFlowService.autoMigrate(currentUser.uid);

    const unsubTenure = firebaseFlowService.subscribeToFlows(currentUser.uid, 'TENURE', (data) => {
      setTenures(data as Tenure[]);
      setLoadingStates(prev => ({ ...prev, tenure: false }));
    });

    const unsubSocial = firebaseFlowService.subscribeToFlows(currentUser.uid, 'SOCIAL', (data) => {
      setSocials(data as Social[]);
      setLoadingStates(prev => ({ ...prev, social: false }));
    });

    const unsubMonthly = firebaseFlowService.subscribeToFlows(currentUser.uid, 'MONTHLY', (data) => {
      setMonthlies(data as Monthly[]);
      setLoadingStates(prev => ({ ...prev, monthly: false }));
    });

    return () => {
      unsubTenure();
      unsubSocial();
      unsubMonthly();
    };
  }, [currentUser]);

  // Calculate Global Summary Stats
  const tenureBurn = tenures
    .filter(f => !f.isSettled && (f.paidMonths?.length || 0) < f.totalMonths)
    .reduce((sum, c) => sum + (c.monthlyEmi || 0), 0);
  
  const monthlyBurn = monthlies.filter(s => !s.isSettled).reduce((sum, sub) => {
    const amount = sub.amount || 0;
    return sum + (sub.cycle === 'YEARLY' ? amount / 12 : amount);
  }, 0);
  const totalFixedHit = tenureBurn + monthlyBurn;

  const tenureLiability = tenures.filter(f => !f.isSettled).reduce((sum, c) => {
    const monthsPaid = calculateTenureProgress(c.startDate, c.totalMonths);
    return sum + ((c.totalMonths - monthsPaid) * (c.monthlyEmi || 0));
  }, 0);
  const borrowedLiability = socials
    .filter(d => !d.isSettled && (d.type || '').toUpperCase() === 'BORROWED')
    .reduce((sum, d) => sum + ((d.totalAmount || 0) - (d.amountSettled || 0)), 0);
  const totalGlobalLiability = tenureLiability + borrowedLiability;
  
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const handleTogglePaid = async (id: string, type: 'TENURE' | 'MONTHLY', isPaid: boolean) => {
    if (!currentUser) return;
    await firebaseFlowService.togglePaidMonth(currentUser.uid, id, type, monthKey, isPaid);
  };

  const handleEdit = (type: string, id: string) => {
    navigate(`/flow/manage/${type}/${id}`);
  };

  const handleAdd = (type: string) => {
    navigate(`/flow/manage/${type}/new`);
  };

  const renderContent = () => {
    if (activeTab === 'tenure') {
      const emiItems = tenures.filter(c => (c.type || '').toUpperCase() === 'EMI');
      const loanItems = tenures.filter(c => (c.type || '').toUpperCase() === 'LOAN');
      
      const isItemSettled = (i: any) => i.isSettled || (i.paidMonths?.length >= i.totalMonths);
      
      const activeEmiItems = emiItems.filter(i => !isItemSettled(i));
      const activeLoanItems = loanItems.filter(i => !isItemSettled(i));
      const archivedItems = tenures.filter(i => isItemSettled(i));
      
      const emiTotal = activeEmiItems.reduce((sum, item) => sum + (item.monthlyEmi || 0), 0);
      const loanTotal = activeLoanItems.reduce((sum, item) => sum + (item.monthlyEmi || 0), 0);

      return (
        <motion.div 
          key="tenure-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={styles.list}
        >
          <div className={styles.tabActionArea}>
            <span className={styles.sectionLabel}>Tenure Flows</span>
            <button className={styles.addBtn} onClick={() => handleAdd('tenure')}>
              <img src={addIcon} alt="add" width="16" height="16" /> Add
            </button>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionHeader}>
              Active EMIs <span>-₹{emiTotal.toLocaleString('en-IN')} <span className={styles.unit}>/ mo</span></span>
            </h4>
            {activeEmiItems.length > 0 ? (
              activeEmiItems.map(item => (
                <div key={item.id} onClick={() => handleEdit('tenure', item.id)}>
                  <TenureCard 
                    data={item} 
                    onMarkPaid={() => handleTogglePaid(item.id, 'TENURE', true)}
                  />
                </div>
              ))
            ) : (
              !loading && (
                <EmptyState 
                  icon={CreditCard}
                  title="No Active EMIs" 
                  description="Plan your installments and track progress." 
                  onAdd={() => handleAdd('tenure')} 
                />
              )
            )}
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionHeader}>
              Active Loans <span>-₹{loanTotal.toLocaleString('en-IN')} <span className={styles.unit}>/ mo</span></span>
            </h4>
            {activeLoanItems.length > 0 ? (
              activeLoanItems.map(item => (
                <div key={item.id} onClick={() => handleEdit('tenure', item.id)}>
                  <TenureCard 
                    data={item} 
                    onMarkPaid={() => handleTogglePaid(item.id, 'TENURE', true)}
                  />
                </div>
              ))
            ) : (
              !loading && (
                <EmptyState 
                  icon={Archive}
                  title="No Active Loans" 
                  description="Track your primary loans and repayment schedules." 
                  onAdd={() => handleAdd('tenure')} 
                />
              )
            )}
          </div>

          {archivedItems.length > 0 && (
            <div className={styles.historySection}>
              <div className={styles.historyHeader} onClick={() => setShowHistory(!showHistory)}>
                <ChevronDown size={18} className={`${styles.icon} ${showHistory ? styles.open : ''}`} />
                <span>Completed EMIs & Loans ({archivedItems.length})</span>
              </div>
              <AnimatePresence>
                {showHistory && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={styles.archivedList}
                  >
                    {archivedItems.map(item => (
                      <div key={item.id} className={styles.archivedItem} onClick={() => handleEdit('tenure', item.id)}>
                        <TenureCard data={item} />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      );
    }

    const handleSettleDebt = async (id: string) => {
      if (window.confirm('Mark this debt as fully settled and archive it?')) {
        await firebaseFlowService.settleFlow(currentUser!.uid, id, 'SOCIAL');
      }
    };

    if (activeTab === 'social') {
      const activeLent = socials.filter(d => (d.type || '').toUpperCase() === 'LENT' && !d.isSettled);
      const activeBorrowed = socials.filter(d => (d.type || '').toUpperCase() === 'BORROWED' && !d.isSettled);
      const archivedItems = socials.filter(d => d.isSettled);

      const lentTotal = activeLent.reduce((sum, d) => sum + ((d.totalAmount || 0) - (d.amountSettled || 0)), 0);
      const borrowedTotal = activeBorrowed.reduce((sum, d) => sum + ((d.totalAmount || 0) - (d.amountSettled || 0)), 0);

      return (
        <motion.div 
          key="social-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={styles.list}
        >
          <div className={styles.tabActionArea}>
            <span className={styles.sectionLabel}>Social Debts</span>
            <button className={styles.addBtn} onClick={() => handleAdd('social')}>
              <img src={addIcon} alt="add" width="16" height="16" /> Add
            </button>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionHeader}>
              Money Lent <span>₹{lentTotal.toLocaleString('en-IN')} <span className={styles.unit}>Total</span></span>
            </h4>
            {activeLent.length > 0 ? (
              activeLent.map(item => (
                <div key={item.id} onClick={() => handleEdit('social', item.id)}>
                  <SocialCard 
                    data={item} 
                    onSettle={() => handleSettleDebt(item.id)}
                  />
                </div>
              ))
            ) : (
              !loading && (
                <EmptyState 
                  icon={Users}
                  title="No Money Lent" 
                  description="Keep track of cash flows with friends and family." 
                  onAdd={() => handleAdd('social')} 
                />
              )
            )}
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionHeader}>
              Money Borrowed <span>₹{borrowedTotal.toLocaleString('en-IN')} <span className={styles.unit}>Total</span></span>
            </h4>
            {activeBorrowed.length > 0 ? (
              activeBorrowed.map(item => (
                <div key={item.id} onClick={() => handleEdit('social', item.id)}>
                  <SocialCard 
                    data={item} 
                    onSettle={() => handleSettleDebt(item.id)}
                  />
                </div>
              ))
            ) : (
              !loading && (
                <EmptyState 
                  icon={Users}
                  title="No Money Borrowed" 
                  description="Track your personal debts and settlement status." 
                  onAdd={() => handleAdd('social')} 
                />
              )
            )}
          </div>

          {archivedItems.length > 0 && (
            <div className={styles.historySection}>
              <div className={styles.historyHeader} onClick={() => setShowHistory(!showHistory)}>
                <ChevronDown size={18} className={`${styles.icon} ${showHistory ? styles.open : ''}`} />
                <span>Settled Debts ({archivedItems.length})</span>
              </div>
              <AnimatePresence>
                {showHistory && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={styles.archivedList}
                  >
                    {archivedItems.map(item => (
                      <div key={item.id} className={styles.archivedItem} onClick={() => handleEdit('social', item.id)}>
                        <SocialCard data={item} />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      );
    }

    if (activeTab === 'monthly') {
      const activeSubs = monthlies.filter(s => !s.isSettled);
      const archivedSubs = monthlies.filter(s => s.isSettled);

      const handleTogglePaid = async (id: string, type: 'TENURE' | 'MONTHLY', isPaid: boolean) => {
        if (!currentUser) return;
        await firebaseFlowService.togglePaidMonth(currentUser.uid, id, type, monthKey, isPaid);
      };

      // const monthlyBurn = activeSubs.reduce((sum, sub) => {
      //   return sum + (sub.cycle === 'MONTHLY' ? sub.amount : sub.amount / 12);
      // }, 0);
      // const yearlyBurn = monthlyBurn * 12;

      const groups = activeSubs.reduce((acc, sub) => {
        const cat = sub.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(sub);
        return acc;
      }, {} as Record<string, Monthly[]>);

      return (
        <motion.div 
          key="monthly-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={styles.list}
        >
          <div className={styles.tabActionArea}>
            <span className={styles.sectionLabel}>Monthly Bills</span>
            <button className={styles.addBtn} onClick={() => handleAdd('monthly')}>
              <img src={addIcon} alt="add" width="16" height="16" /> Add
            </button>
          </div>

          {/* Burn Summary Header */}
          {/* 
          <div className={styles.burnHeader}>
            <div className={styles.burnItem}>
              <span className={styles.burnLabel}>Monthly Hit</span>
              <span className={styles.burnAmount}>₹{Math.round(monthlyBurn).toLocaleString('en-IN')}</span>
            </div>
            <div className={styles.burnDivider} />
            <div className={styles.burnItem}>
              <span className={styles.burnLabel}>Yearly Estimate</span>
              <span className={styles.burnAmount}>₹{Math.round(yearlyBurn).toLocaleString('en-IN')}</span>
            </div>
          </div>
          */}

          {Object.entries(groups).length > 0 ? (
            Object.entries(groups).map(([category, subs]) => {
              const catTotal = subs.reduce((sum, sub) => sum + (sub.cycle === 'MONTHLY' ? sub.amount : sub.amount / 12), 0);
              
              return (
                <div key={category} className={styles.section}>
                  <h4 className={styles.sectionHeader}>
                    {category.toLowerCase()} <span>-₹{Math.round(catTotal).toLocaleString('en-IN')} <span className={styles.unit}>/ mo</span></span>
                  </h4>
                  {subs.map(sub => (
                    <div key={sub.id} onClick={() => handleEdit('monthly', sub.id)}>
                      <MonthlyCard 
                        subscription={sub} 
                        onMarkPaid={() => handleTogglePaid(sub.id, 'MONTHLY', true)}
                      />
                    </div>
                  ))}
                </div>
              );
            })
          ) : (
            <div className={styles.section}>
              <h4 className={styles.sectionHeader}>
                Monthly Bills <span>0 Bills</span>
              </h4>
              {!loading && (
                <EmptyState 
                  icon={RefreshCcw}
                  title="No Subscriptions" 
                  description="Stay on top of your recurring bills." 
                  onAdd={() => handleAdd('monthly')} 
                />
              )}
            </div>
          )}

          {archivedSubs.length > 0 && (
            <div className={styles.historySection}>
              <div className={styles.historyHeader} onClick={() => setShowHistory(!showHistory)}>
                <ChevronDown size={18} className={`${styles.icon} ${showHistory ? styles.open : ''}`} />
                <span>Inactive Bills ({archivedSubs.length})</span>
              </div>
              <AnimatePresence>
                {showHistory && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={styles.archivedList}
                  >
                    {archivedSubs.map(item => (
                      <div key={item.id} className={styles.archivedItem} onClick={() => handleEdit('monthly', item.id)}>
                        <MonthlyCard subscription={item} />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      );
    }

    return null;
  };


  return (
    <div className={styles.container}>
      <div className={styles.globalSummary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Fixed Hit</span>
          <span className={`${styles.summaryValue} ${styles.warning}`}>
            ₹{Math.round(totalFixedHit).toLocaleString('en-IN')}
          </span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Outstanding</span>
          <span className={styles.summaryValue}>
            ₹{totalGlobalLiability.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className={styles.tabHeader}>
        <div className={styles.tabGroupContainer}>
          {/* Wrapper A: Financials */}
          <div className={styles.tabWrapper}>
            {tabs.filter(t => t.id === 'tenure' || t.id === 'monthly').map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(`/flow/${tab.id}`)}
                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
              >
                {activeTab === tab.id && (
                  <motion.div
                     layoutId="activeTab"
                    className={styles.activeHighlight}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className={styles.tabLabel}>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Wrapper B: Personal */}
          <div className={styles.tabWrapper}>
            {tabs.filter(t => t.id === 'social').map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(`/flow/${tab.id}`)}
                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
              >
                {activeTab === tab.id && (
                  <motion.div
                     layoutId="activeTab"
                    className={styles.activeHighlight}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className={styles.tabLabel}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className={styles.content}>
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>
    </div>
  );

}
