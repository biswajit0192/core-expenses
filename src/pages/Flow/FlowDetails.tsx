import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pencil, Calendar, DollarSign, Clock, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { firebaseFlowService } from '@/services/firebaseFlowService';
import { useAuth } from '@/context/AuthContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { formatDateWithOrdinal, addMonths } from '@/utils/dateUtils';
import TransactionItem from '@/components/shared/TransactionItem/TransactionItem';
import styles from './FlowDetails.module.scss';

type FlowType = 'tenure' | 'monthly' | 'social';

export default function FlowDetails() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { accounts } = useAccounts();
  const { transactions } = useTransactions();

  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const flowType = type as FlowType;

  useEffect(() => {
    const fetchItem = async () => {
      if (!currentUser || !id) return;
      const colType = flowType === 'tenure' ? 'TENURE' : flowType === 'monthly' ? 'MONTHLY' : 'SOCIAL';

      try {
        const data = await firebaseFlowService.getFlow(currentUser.uid, id, colType);
        if (data) {
          setFormData(data);
        } else {
          console.error("Flow item not found");
        }
      } catch (error) {
        console.error("Failed to fetch flow item:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id, flowType, currentUser]);

  const handleEditClick = () => {
    navigate(`/flow/manage/${type}/${id}`);
  };

  // --- Calculations for Tenure (EMI/Loan) ---
  const tenureStats = useMemo(() => {
    if (!formData || flowType !== 'tenure') return null;
    const paidMonthsCount = formData.paidMonths?.length || 0;
    const monthlyEmi = formData.monthlyEmi || 0;
    const totalMonths = formData.totalMonths || 0;
    const totalPrincipal = formData.totalPrincipal || 0;

    const endDate = addMonths(formData.startDate, totalMonths);
    const totalPaid = paidMonthsCount * monthlyEmi;
    const pendingAmount = Math.max(0, (totalMonths - paidMonthsCount) * monthlyEmi);

    // Installment timeline table items
    const installments = [];
    const paidList = formData.paidMonths || [];
    for (let i = 0; i < totalMonths; i++) {
      const instDateStr = addMonths(formData.startDate, i);
      const instDate = new Date(instDateStr);
      const monthKey = `${instDate.getFullYear()}-${String(instDate.getMonth() + 1).padStart(2, '0')}`;
      const isPaid = paidList.includes(monthKey);
      installments.push({
        number: i + 1,
        dateStr: instDateStr,
        amount: monthlyEmi,
        isPaid
      });
    }

    return {
      endDate,
      totalPaid,
      pendingAmount,
      installments,
      totalPrincipal
    };
  }, [formData, flowType]);

  // --- Calculations for Social ---
  const personTransactions = useMemo(() => {
    if (!formData || flowType !== 'social' || !id) return [];
    const personNameLower = (formData.personName || '').toLowerCase().trim();
    return transactions.filter(tx => {
      // Direct ID Match
      if (tx.socialId === id || tx.flippedSocialId === id || tx.settledSocialId === id) {
        return true;
      }
      // Description Fuzzy Match (e.g. Lent money to Person A)
      if (tx.category === 'Social' && tx.description.toLowerCase().includes(personNameLower)) {
        return true;
      }
      // Target Name Match
      if (tx.socialTargetName?.toLowerCase().trim() === personNameLower) {
        return true;
      }
      return false;
    });
  }, [transactions, formData, flowType, id]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading flow details...</p>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} className={styles.errorIcon} />
        <h2>Flow not found</h2>
        <p>We couldn't retrieve the details for this flow item.</p>
        <button onClick={() => navigate('/flow')} className={styles.backBtn}>
          Back to Flows
        </button>
      </div>
    );
  }

  const nameText = formData.title || formData.provider || formData.personName || 'Unnamed Flow';

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* First Row: Title/Name & Edit button */}
      <div className={styles.headerRow}>
        <h1 className={styles.flowName}>{nameText}</h1>
        <button className={styles.editBtn} onClick={handleEditClick} title="Edit flow">
          <Pencil size={20} />
        </button>
      </div>

      <div className={styles.content}>
        {/* Tenure Layout */}
        {flowType === 'tenure' && tenureStats && (
          <div className={styles.tenureDetails}>
            {/* Quick Cards Grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <Clock className={styles.statIcon} />
                <span className={styles.statLabel}>Started On</span>
                <span className={styles.statVal}>
                  {formatDateWithOrdinal(formData.startDate)}
                </span>
              </div>
              <div className={styles.statCard}>
                <Clock className={styles.statIcon} />
                <span className={styles.statLabel}>Ending On</span>
                <span className={styles.statVal}>
                  {formatDateWithOrdinal(tenureStats.endDate)}
                </span>
              </div>
              <div className={styles.statCard}>
                <DollarSign className={styles.statIcon} />
                <span className={styles.statLabel}>Total Principal</span>
                <span className={styles.statVal}>
                  ₹{tenureStats.totalPrincipal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className={styles.statCard}>
                <DollarSign className={styles.statIcon} />
                <span className={styles.statLabel}>Total Repayable</span>
                <span className={styles.statVal}>
                  ₹{(formData.totalMonths * formData.monthlyEmi).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Balances Section */}
            <div className={styles.repaymentProgress}>
              <div className={styles.balanceRow}>
                <div className={styles.balanceBox}>
                  <span className={styles.balLabel}>Total Paid</span>
                  <span className={`${styles.balValue} ${styles.paidValue}`}>
                    ₹{tenureStats.totalPaid.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={styles.balanceDivider} />
                <div className={styles.balanceBox}>
                  <span className={styles.balLabel}>Pending Amount</span>
                  <span className={`${styles.balValue} ${styles.pendingValue}`}>
                    ₹{tenureStats.pendingAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className={styles.progressWrapper}>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${Math.round(((formData.paidMonths?.length || 0) / formData.totalMonths) * 100)}%` }}
                  />
                </div>
                <div className={styles.progressText}>
                  <span>{formData.paidMonths?.length || 0} of {formData.totalMonths} months paid</span>
                  <span>{Math.round(((formData.paidMonths?.length || 0) / formData.totalMonths) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Installment Table */}
            <div className={styles.tableSection}>
              <h3 className={styles.sectionTitle}>Installment Schedule</h3>
              <div className={styles.tableWrapper}>
                <table className={styles.scheduleTable}>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Due Date</th>
                      <th>EMI Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenureStats.installments.map((inst) => (
                      <tr key={inst.number} className={inst.isPaid ? styles.rowPaid : ''}>
                        <td className={styles.monthCol}>Month {inst.number}</td>
                        <td>{formatDateWithOrdinal(inst.dateStr)}</td>
                        <td className={styles.amountCol}>₹{inst.amount.toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${inst.isPaid ? styles.paidBadge : styles.pendingBadge}`}>
                            {inst.isPaid ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Layout */}
        {flowType === 'monthly' && (
          <div className={styles.monthlyDetails}>
            <div className={styles.detailsList}>
              <div className={styles.detailItem}>
                <Calendar className={styles.detailIcon} />
                <div>
                  <span className={styles.detailLabel}>Started On</span>
                  <span className={styles.detailValue}>
                    {formatDateWithOrdinal(formData.startedAt || formData.nextBillDate)}
                  </span>
                </div>
              </div>

              <div className={styles.detailItem}>
                <DollarSign className={styles.detailIcon} />
                <div>
                  <span className={styles.detailLabel}>Monthly Cost</span>
                  <span className={styles.detailValue}>
                    ₹{formData.amount.toLocaleString('en-IN')} / mo
                  </span>
                </div>
              </div>

              <div className={styles.detailItem}>
                <Clock className={styles.detailIcon} />
                <div>
                  <span className={styles.detailLabel}>Next Billing Date</span>
                  <span className={styles.detailValue}>
                    {formatDateWithOrdinal(formData.nextBillDate)}
                  </span>
                </div>
              </div>

              <div className={styles.detailItem}>
                <AlertCircle className={styles.detailIcon} />
                <div>
                  <span className={styles.detailLabel}>Category</span>
                  <span className={styles.detailValue}>
                    {formData.category || 'Other'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Social Layout */}
        {flowType === 'social' && (
          <div className={styles.socialDetails}>
            {/* Summary details */}
            <div className={styles.socialSummary}>
              <div className={styles.totalBox}>
                <span className={styles.subText}>
                  {formData.type === 'LENT' ? 'Total Lent' : 'Total Borrowed'}
                </span>
                <span className={styles.mainAmt}>
                  ₹{formData.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className={styles.balanceSummary}>
                <div className={styles.subSummary}>
                  <span className={styles.subSummaryLabel}>Settled</span>
                  <span className={styles.subSummaryValue}>
                    ₹{formData.amountSettled.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className={styles.subSummary}>
                  <span className={styles.subSummaryLabel}>Outstanding</span>
                  <span className={`${styles.subSummaryValue} ${styles.outstanding}`}>
                    ₹{(formData.totalAmount - formData.amountSettled).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className={styles.progressWrapper}>
                <div className={styles.progressBar}>
                  <div 
                    className={`${styles.progressFill} ${formData.type === 'LENT' ? styles.lent : styles.borrowed}`}
                    style={{ width: `${Math.round((formData.amountSettled / formData.totalAmount) * 100)}%` }}
                  />
                </div>
                <div className={styles.progressText}>
                  <span>Progress</span>
                  <span>{Math.round((formData.amountSettled / formData.totalAmount) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Journey of Transactions */}
            <div className={styles.journeySection}>
              <h3 className={styles.sectionTitle}>Transaction Journey</h3>
              {personTransactions.length > 0 ? (
                <div className={styles.transactionList}>
                  {personTransactions.map((tx) => (
                    <div key={tx.id} className={styles.journeyItem}>
                      <div className={styles.journeyIconWrapper}>
                        {tx.type === 'CREDIT' || tx.type === 'INCOME' ? (
                          <ArrowDownLeft className={`${styles.journeyIcon} ${styles.received}`} />
                        ) : (
                          <ArrowUpRight className={`${styles.journeyIcon} ${styles.sent}`} />
                        )}
                      </div>
                      <div className={styles.journeyCard}>
                        <TransactionItem transaction={tx} accounts={accounts} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyJourney}>
                  <p>No transaction history recorded yet for {formData.personName}.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
