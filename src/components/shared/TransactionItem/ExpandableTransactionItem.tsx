import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit2, AlertCircle, X, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { transactionService } from '@/services/transactionService';
import TransactionItem from './TransactionItem';
import TransactionEditModal from './TransactionEditModal';
import type { Transaction, Account } from '@/types';
import styles from './ExpandableTransactionItem.module.scss';

interface ExpandableTransactionItemProps {
  transaction: Transaction;
  accounts: Account[];
}

export default function ExpandableTransactionItem({ transaction, accounts }: ExpandableTransactionItemProps) {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const txDate = new Date(transaction.date);
  const now = new Date();
  const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
  
  const isProtected = 
    transaction.category === 'EMI' || 
    (transaction as any).socialId || 
    transaction.isRecurringHit ||
    diffDays > 7;

  const handleDelete = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await transactionService.reconcileDeletion(currentUser.uid, transaction);
      setIsOpen(false);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (newData: { description: string, amount: number }) => {
    if (!currentUser) return;
    try {
      await transactionService.reconcileEdit(currentUser.uid, transaction, newData);
    } catch (error) {
      console.error("Edit failed:", error);
      throw error;
    }
  };

  return (
    <div className={`${styles.expandableWrapper} ${isOpen ? styles.isOpen : ''}`}>
      <div onClick={() => !isProtected && setIsOpen(!isOpen)}>
        <TransactionItem 
          transaction={transaction} 
          accounts={accounts} 
          className={styles.item}
        />
      </div>

      <AnimatePresence>
        {isOpen && !isProtected && (
          <motion.div 
            className={styles.actionBar}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className={styles.actionContent}>
              {!deleteConfirm ? (
                <>
                  <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
                    <Edit2 size={14} />
                    <span>Edit</span>
                  </button>
                  <button className={styles.deleteBtn} onClick={() => setDeleteConfirm(true)}>
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </>
              ) : (
                <div className={styles.confirmWrapper}>
                  <span className={styles.confirmLabel}>
                    <AlertCircle size={14} />
                    Confirm?
                  </span>
                  <div className={styles.confirmActions}>
                    <button className={styles.cancelBtn} onClick={() => setDeleteConfirm(false)} disabled={loading}>
                      <X size={16} />
                    </button>
                    <button className={styles.confirmBtn} onClick={handleDelete} disabled={loading}>
                      {loading ? '...' : <Check size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TransactionEditModal 
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={handleEdit}
        initialData={{ 
          description: transaction.description || transaction.category, 
          amount: transaction.amount 
        }}
      />
    </div>
  );
}
