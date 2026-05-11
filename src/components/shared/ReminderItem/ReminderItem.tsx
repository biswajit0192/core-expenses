import { useState, useRef } from 'react';
import styles from './ReminderItem.module.scss';
import type { Reminder } from '@/hooks/useReminders';
import { Bell, ExternalLink } from 'lucide-react';

interface ReminderItemProps {
  reminder: Reminder;
  theme?: string;
  onComplete: (id: string, current: boolean) => void;
  variant?: 'simple' | 'full';
  dateFormat?: 'full' | 'timeOnly' | 'dateOnly' | 'compact';
}

export function ReminderItem({ 
  reminder, 
  theme, 
  onComplete, 
  variant = 'simple',
  dateFormat = 'full'
}: ReminderItemProps) {
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [hasStartedSwiping, setHasStartedSwiping] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<any>(null);

  // Logic-driven theme determination
  const isNotify = reminder.type === 'notify' || !!reminder.reminderDate;
  const activeTheme = isNotify ? 'green' : (reminder.theme || theme || 'blue');
  const hasNotification = isNotify;

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (reminder.link) {
      const url = reminder.link.startsWith('http') ? reminder.link : `https://${reminder.link}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleLongPress = () => {
    if (reminder.link) {
      navigator.clipboard.writeText(reminder.link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const startPress = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    timerRef.current = setTimeout(handleLongPress, 500);
  };

  const endPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (reminder.isCompleted || isExiting) return;
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

    if (!hasStartedSwiping) {
      if (diffY > Math.abs(diffX)) {
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

      // 3. Wait for 1 second of "Done" visibility (as requested)
      setTimeout(() => {
        // 4. Trigger height collapse
        setIsExiting(true);
        
        // 5. Final removal once height is 0
        setTimeout(() => {
          onComplete(reminder.id, reminder.isCompleted);
        }, 300); // Match CSS transition duration
      }, 1000);

    } else {
      // Snap back
      setOffsetX(0);
    }
  };

  // Format date based on dateFormat prop
  const formatDate = (dateSource: any) => {
    if (!dateSource) return '';
    try {
      let date: Date;
      if (typeof dateSource === 'string') {
        date = new Date(dateSource);
      } else if (dateSource.seconds) {
        date = new Date(dateSource.seconds * 1000);
      } else {
        date = new Date(dateSource);
      }

      if (dateFormat === 'timeOnly') {
        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }
      
      const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (dateFormat === 'dateOnly') {
        return dateStr;
      }
      
      const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      if (dateFormat === 'compact') {
        return `${dateStr}, ${timeStr}`;
      }

      // full format
      return dateStr.replace(' ', ' ') + ' - ' + timeStr;
    } catch (e) {
      return '';
    }
  };

  if (reminder.isCompleted && !isExiting) return null;

  return (
    <div className={`${styles.swipeWrapper} ${isExiting ? styles.exiting : ''} ${showDone ? styles.showDone : ''}`}>
      <div className={styles.swipeBackground}>
        <span>Done</span>
      </div>
      <div 
        ref={cardRef}
        className={`${styles.reminderCard} ${activeTheme === 'blue' ? styles.blue : styles.green} ${styles[variant]}`}
        style={{ 
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          // Hide card if it's already swiped far enough or if swiping is complete
          opacity: showDone ? 0 : 1 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.info}>
          <p className={styles.title}>{reminder.title}</p>
          {reminder.link && (
            <div className={styles.linkContainer}>
              <span 
                className={`${styles.linkText} ${isCopied ? styles.copied : ''}`}
                onClick={handleLinkClick}
                onMouseDown={startPress}
                onMouseUp={endPress}
                onMouseLeave={endPress}
                onTouchStart={startPress}
                onTouchEnd={endPress}
              >
                {isCopied ? 'Copied to clipboard!' : reminder.link}
              </span>
            </div>
          )}
          <span className={`${styles.date} ${dateFormat === 'compact' ? styles.dateCompact : ''}`}>
            {formatDate(reminder.createdAt)}
          </span>
        </div>
        
        {hasNotification && (
          <div className={styles.notificationIcon}>
            <Bell size={16} fill="currentColor" />
          </div>
        )}

        {reminder.link && (
          <a 
            href={reminder.link.startsWith('http') ? reminder.link : `https://${reminder.link}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkBtn}
            onClick={(e) => e.stopPropagation()}
            title="Open Link"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

export default ReminderItem;
