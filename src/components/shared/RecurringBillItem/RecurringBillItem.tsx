import { useState, useRef } from 'react';
import styles from './RecurringBillItem.module.scss';
import type { UnifiedExpenseItem } from '@/hooks/useRecurringBills';

interface RecurringBillItemProps {
  expense: UnifiedExpenseItem;
  variant?: 'compact' | 'detailed';
  onToggleStatus?: () => void;
}

export default function RecurringBillItem({ 
  expense, 
  variant = 'compact', 
  onToggleStatus 
}: RecurringBillItemProps) {
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [hasStartedSwiping, setHasStartedSwiping] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isToday = expense.daysUntil === 0;
  const isLocked = expense.daysUntil > 0 && expense.status === 'UPCOMING';

  const handleTouchStart = (e: React.TouchEvent) => {
    if (expense.status === 'PAID' || isExiting || isLocked) return;
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
    setIsSwiping(true);
    setHasStartedSwiping(false);
    e.stopPropagation();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const diffX = currentX - startX;
    const diffY = Math.abs(currentY - startY);

    // If it's the first bit of movement, decide if we swipe or scroll
    if (!hasStartedSwiping) {
      if (diffY > Math.abs(diffX)) {
        // More vertical movement -> disable swipe, allow scroll
        setIsSwiping(false);
        return;
      }
      if (Math.abs(diffX) > 10) {
        setHasStartedSwiping(true);
      }
    }

    if (hasStartedSwiping && diffX > 0) {
      setOffsetX(diffX);
      e.stopPropagation();
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);

    const threshold = (cardRef.current?.offsetWidth || 300) * 0.4;
    
    if (offsetX > threshold) {
      // 1. Slide off first
      setOffsetX(1000); 
      
      // 2. Shortly after slide starts, reveal the "Done" background
      setTimeout(() => setShowDone(true), 150);

      // 3. Wait for 1 second of "Done" visibility
      setTimeout(() => {
        // 4. Trigger height collapse
        setIsExiting(true);
        
        // 5. Final removal once height is 0
        setTimeout(() => {
          onToggleStatus?.();
          // Reset states for reset
          setOffsetX(0);
          setShowDone(false);
          setIsExiting(false);
        }, 300); // Match CSS transition duration
      }, 1000);

    } else {
      // Snap back
      setOffsetX(0);
    }
  };

  // Explicit Mouse support using internal logic (ReminderItem doesn't have it, but added for cross-browser testing)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (expense.status === 'PAID' || isExiting || isLocked) return;
    setStartX(e.clientX);
    setIsSwiping(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSwiping) return;
    const currentX = e.clientX;
    const diff = currentX - startX;
    if (diff > 0) setOffsetX(diff);
  };

  return (
    <div className={`${styles.swipeWrapper} ${isExiting ? styles.exiting : ''} ${showDone ? styles.showDone : ''}`}>
      <div className={styles.swipeBackground}>
        <span>Paid</span>
      </div>
      <div 
        ref={cardRef}
        className={`${styles.item} ${variant === 'compact' ? styles.compact : styles.detailed} ${expense.status === 'PAID' ? styles.isPaid : ''} ${isLocked ? styles.isLocked : ''}`}
        style={{ 
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          opacity: showDone ? 0 : 1 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={() => isSwiping && handleTouchEnd()}
      >
        <div className={styles.leftSection}>
          <div className={styles.info}>
            <span className={styles.name}>{expense.title}</span>
            <span className={styles.dueDate}>
              {expense.status === 'PAID' 
                ? 'Paid' 
                : isToday 
                  ? 'Due today' 
                  : expense.daysUntil < 0 
                    ? `Overdue by ${Math.abs(expense.daysUntil)} day${Math.abs(expense.daysUntil) === 1 ? '' : 's'}`
                    : `Due in ${expense.daysUntil} day${expense.daysUntil === 1 ? '' : 's'}`
              }
            </span>
          </div>
        </div>

        <div className={styles.rightSection}>
          <span className={styles.amount}>
            {Math.round(expense.amount).toLocaleString('en-IN')}.00
          </span>
          {expense.progress && (
            <span className={styles.progressText}>
              {expense.progress}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
