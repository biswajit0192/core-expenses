import { useNexus } from '@/context/NexusContext';
import { useAccounts } from '@/hooks/useAccounts';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import NexusIcon from '@/assets/icons/nexus-icon.svg?react';
import AddIcon from '@/assets/icons/add.svg?react';
import TransactionItem from '@/components/shared/TransactionItem/TransactionItem';
import ReminderItem from '@/components/shared/ReminderItem/ReminderItem';
import styles from './NexusDrawer.module.scss';
import { useState, useEffect, useRef, useMemo } from 'react';
import { parseNexusInput } from '@/utils/nexusParser';
import { firebaseFlowService } from '@/services/firebaseFlowService';
import type { Social, Transaction } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { SocialActionCard } from './SocialActionCard';

const placeholders = [
  "Paid 350 for Dinner...",
  "Received 2000 for Festival...",
  "Remind me to pay gas bill on 15th...",
  "Ask Core anything..."
];

export default function NexusDrawer() {
  const { 
    isNexusOpen, 
    closeNexus, 
    addLocalItems,
    localTransactions,
    localReminders,
    removeStagedItem,
    clearAllStagedItems,
    commitStagedItems,
    loadingCommit
  } = useNexus();
  const { accounts } = useAccounts();
  const { currentUser } = useAuth();
  const [socials, setSocials] = useState<Social[]>([]);
  
  const [inputValue, setInputValue] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [clearState, setClearState] = useState<'idle' | 'confirm'>('idle');
  const [isShaking, setIsShaking] = useState(false);
  const [showError, setShowError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const stagedItems = useMemo(() => {
    return [...localTransactions, ...localReminders]
      .sort((a: any, b: any) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
  }, [localTransactions, localReminders]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = firebaseFlowService.subscribeToFlows(currentUser.uid, 'SOCIAL', (data) => {
      setSocials(data as Social[]);
    });
    return unsub;
  }, [currentUser]);

  // Auto-scroll logic: only when new items are added
  const prevItemsCount = useRef(stagedItems.length);
  useEffect(() => {
    if (stagedItems.length > prevItemsCount.current) {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    prevItemsCount.current = stagedItems.length;
  }, [stagedItems.length]);

  const validateInput = (text: string) => {
    if (!text.trim()) return { status: 'idle' };
    
    const isReminder = /\b(remind|schedule|task|notif)\b/i.test(text.trim());
    const hasNumber = /\d+/.test(text);
    const hasAction = /\b(paid|spent|received|income|gave|got|sent|transfer)\b/i.test(text);

    if (isReminder || (hasNumber && hasAction)) return { status: 'valid' };
    
    return { status: 'invalid' };
  };

  const validation = validateInput(inputValue);

  const getGhostMessage = () => {
    if (!inputValue.trim()) return null;
    
    const input = inputValue.toLowerCase().trim();
    if (/\b(remind|schedule|task|notif)\b/i.test(input)) {
      return { text: 'Setting a reminder...', type: 'reminder' };
    }
    
    const transKeywords = ['paid', 'spent', 'received', 'income', 'got', 'sent', 'transfer'];
    if (transKeywords.some(k => new RegExp(`\\b${k}\\b`, 'i').test(input))) {
      if (/\d+/.test(inputValue)) {
        return { text: 'Processing transaction...', type: 'transaction' };
      }
      return { text: 'Enter an amount...', type: 'invalid' };
    }

    return { text: 'Please include an amount and action...', type: 'invalid' };
  };

  const ghost = getGhostMessage();

  const handleInputChange = (val: string) => {
    setInputValue(val);
    const result = validateInput(val);
    if (result.status === 'valid' || val === '') {
      setShowError(false);
    }
  };

  const handleAddItem = () => {
    if (validation.status !== 'valid') {
      setIsShaking(true);
      setShowError(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }
    const newItems = parseNexusInput(inputValue, accounts, socials);
    addLocalItems(newItems);
    setInputValue('');
    setShowError(false);
  };

  const removeItem = (id: string) => {
    removeStagedItem(id);
  };

  const handleSaveAll = async () => {
    if (stagedItems.length === 0) return;
    
    try {
      await commitStagedItems();
    } catch (error) {
      console.error("Critical: Failed to sync Nexus items to Firebase:", error);
      alert("Something went wrong while saving to Cloud.");
    }
  };

  const handleClearClick = () => {
    if (clearState === 'idle') {
      setClearState('confirm');
    } else {
      clearAllStagedItems();
      setClearState('idle');
    }
  };

  const cancelClear = () => setClearState('idle');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddItem();
  };

  return (
    <AnimatePresence>
      {isNexusOpen && (
        <motion.div 
          className={styles.drawer}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <header className={styles.header}>
            <AnimatePresence>
              {stagedItems.length > 0 && (
                <motion.div 
                  className={styles.headerLeft}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <div className={styles.sparkIconHeader}>
                    <NexusIcon />
                  </div>
                  <h2 className={styles.promptTextHeader}>
                    Type a transaction or schedule a reminder.
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>
            <button className={styles.closeBtn} onClick={closeNexus}>
              <X size={20} />
            </button>
          </header>

          <div className={styles.stagingArea} ref={scrollRef}>
            <AnimatePresence mode="popLayout" initial={false}>
              {stagedItems.length === 0 ? (
                <motion.div 
                  key="zero-state"
                  className={styles.zeroState}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div className={styles.sparkContainer}>
                    <NexusIcon />
                  </div>
                  <h2 className={styles.promptText}>
                    Type a transaction or schedule a reminder.
                  </h2>
                </motion.div>
              ) : (
                stagedItems.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, x: -100, height: 0 }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                    className={styles.stagedItem}
                  >
                    {['TRANSACTION', 'CREDIT', 'DEBIT'].includes(item.type) ? (
                      <div className={styles.transactionWrapper}>
                        <div className={(item.socialId || item.isNewSocialCandidate) && !item.socialAction ? styles.dimmed : ''}>
                          <TransactionItem 
                            transaction={item as any}
                            accounts={accounts}
                            isInNexus={true}
                          />
                        </div>
                        <SocialActionCard item={item as Transaction} />
                      </div>
                    ) : (
                      <ReminderItem 
                        reminder={item}
                        onComplete={() => removeItem(item.id)}
                        variant="full"
                      />
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <footer className={styles.footer}>
            {stagedItems.length > 0 && (
              <div className={styles.stagingActions}>
                <button 
                  className={`${styles.clearBtn} ${clearState === 'confirm' ? styles.confirming : ''}`} 
                  onClick={handleClearClick}
                >
                  {clearState === 'confirm' ? 'Confirm?' : 'Clear All'}
                </button>
                {clearState === 'confirm' ? (
                  <button className={`${styles.saveBtn} ${styles.cancel}`} onClick={cancelClear}>Cancel</button>
                ) : (
                  <button 
                    className={styles.saveBtn} 
                    onClick={handleSaveAll}
                    disabled={loadingCommit || localTransactions.some(t => (t.socialId || (t as any).isNewSocialCandidate) && !t.socialAction)}
                  >
                    {loadingCommit ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
            )}

            {/* Dynamic Ghost Feedback */}
            <AnimatePresence>
              {ghost && (showError || validation.status === 'valid') && (
                <motion.div
                  key="ghost-msg"
                  className={`${styles.ghostMessage} ${styles[ghost.type]}`}
                  initial={{ opacity: 0, height: 0, y: 5 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  {ghost.text}
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`${styles.inputWrapper} ${isShaking ? styles.shake : ''}`}>
              <AnimatePresence mode="wait">
                {inputValue === '' && (
                  <motion.div
                    key={placeholders[placeholderIndex]}
                    className={styles.placeholderOverlay}
                    initial={{ y: 0, opacity: 0 }}
                    animate={{ y: '-50%', opacity: 0.5 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  >
                    {placeholders[placeholderIndex]}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <input 
                type="text"
                className={styles.input}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <button className={styles.actionBtn} onClick={handleAddItem}>
                <AddIcon />
              </button>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
