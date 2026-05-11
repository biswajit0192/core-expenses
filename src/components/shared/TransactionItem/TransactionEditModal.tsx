import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import styles from './TransactionEditModal.module.scss';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { description: string; amount: number }) => Promise<void>;
  initialData: { description: string; amount: number };
}

export default function TransactionEditModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData 
}: TransactionEditModalProps) {
  const [description, setDescription] = useState(initialData.description);
  const [amount, setAmount] = useState(initialData.amount.toString());
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !description.trim()) return;

    setLoading(true);
    try {
      await onSave({ description: description.trim(), amount: numAmount });
      onClose();
    } catch (error) {
      console.error("Failed to save transaction:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div 
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <header className={styles.header}>
              <h3>Edit Transaction</h3>
              <button className={styles.closeBtn} onClick={onClose}>
                <X size={20} />
              </button>
            </header>

            <div className={styles.content}>
              <div className={styles.field}>
                <label>Description</label>
                <input 
                  type="text" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Dinner, Fuel, etc."
                />
              </div>

              <div className={styles.field}>
                <label>Amount (₹)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <footer className={styles.footer}>
              <button 
                className={styles.saveBtn} 
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
