import React from 'react';
import type { Transaction } from '@/types';
import { useNexus } from '@/context/NexusContext';
import styles from './SocialActionCard.module.scss';

interface SocialActionCardProps {
  item: Transaction;
}

export const SocialActionCard: React.FC<SocialActionCardProps> = ({ item }) => {
  const { updateStagedItem } = useNexus();

  // GATE 1: New Person Candidate
  if (item.isNewSocialCandidate && !item.socialAction) {
    const isDebit = item.type === 'DEBIT';

    return (
      <div className={styles.socialGate}>
        <div className={styles.gateTitle}>
          New person detected: <strong>{item.socialTargetName}</strong>
        </div>
        <div className={styles.gateActions}>
          {isDebit ? (
            <button 
              className={styles.gateBtn}
              onClick={() => updateStagedItem(item.id, { socialAction: 'ADD' })}
            >
              Lent to {item.socialTargetName}
            </button>
          ) : (
            <button 
              className={styles.gateBtn}
              onClick={() => updateStagedItem(item.id, { socialAction: 'SETTLE' })}
            >
              Borrowed from {item.socialTargetName}
            </button>
          )}
          <button 
            className={`${styles.gateBtn} ${styles.secondary}`}
            onClick={() => updateStagedItem(item.id, { socialAction: 'GENERAL', isNewSocialCandidate: false })}
          >
            General
          </button>
        </div>
      </div>
    );
  }

  // GATE 2: Existing Person + Polarity Math
  if (item.socialId && !item.socialAction) {
    const isAddingToDebt = (item.socialType === 'LENT' && item.type === 'DEBIT') || 
                           (item.socialType === 'BORROWED' && item.type === 'CREDIT');
    
    const outstanding = item.outstandingBalance || 0;
    const isOverpayment = !isAddingToDebt && item.amount > outstanding;
    
    // Logic: If adding, balance GAINS. If settling, balance DROPS.
    const previewBalance = isAddingToDebt ? (outstanding + item.amount) : Math.abs(outstanding - item.amount);

    return (
      <div className={styles.socialGate}>
        <div className={styles.gateTitle}>
          Recognized <strong>{item.socialTargetName}</strong>
          {item.outstandingBalance !== undefined && (
            <div className={styles.balanceInfo}>
              {isOverpayment ? (
                <span className={styles.surplus}>
                  Surplus: ₹{previewBalance.toLocaleString('en-IN')}
                </span>
              ) : (
                <span className={styles.remaining}>
                  {isAddingToDebt ? 'New Total: ' : 'Remaining: '} ₹{previewBalance.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={styles.gateActions}>
          <button 
            className={styles.gateBtn}
            onClick={() => updateStagedItem(item.id, { socialAction: isAddingToDebt ? 'ADD' : 'SETTLE' })}
          >
            {isOverpayment ? 'Settle & Flip Balance' : (
              isAddingToDebt 
                ? (item.socialType === 'LENT' ? 'Add to Lent' : 'Borrow More')
                : (item.socialType === 'LENT' ? 'Settle Lent' : 'Settle Debt')
            )}
          </button>
          <button 
            className={`${styles.gateBtn} ${styles.secondary}`}
            onClick={() => updateStagedItem(item.id, { socialAction: 'GENERAL', socialId: undefined })}
          >
            General
          </button>
        </div>
      </div>
    );
  }

  return null;
};
