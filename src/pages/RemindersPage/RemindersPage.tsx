import { useMemo, useState } from 'react';
import { useReminders } from '@/hooks/useReminders';
import ReminderItem from '@/components/shared/ReminderItem/ReminderItem';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronDown, Bell, StickyNote } from 'lucide-react';
import styles from './RemindersPage.module.scss';

export default function RemindersPage() {
  const { reminders, toggleReminder, loading } = useReminders();
  const [isNotifyOpen, setIsNotifyOpen] = useState(true);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  const handleComplete = (id: string, current: boolean) => {
    toggleReminder(id, current);
  };

  const pendingReminders = useMemo(() => {
    return reminders.filter(r => !r.isCompleted);
  }, [reminders]);

  const notifyList = useMemo(() => pendingReminders.filter(r => r.type === 'notify'), [pendingReminders]);
  const noteList = useMemo(() => pendingReminders.filter(r => r.type === 'note'), [pendingReminders]);

  // Grouping helper for Timeline (notify list) by Reminder Date
  const groupRemindersByDate = (list: any[]) => {
    const groups: { dateHeader: string; items: any[] }[] = [];
    const parseDate = (source: any): Date | null => {
      if (!source) return null;
      if (typeof source === 'string') return new Date(source);
      if (source.seconds) return new Date(source.seconds * 1000);
      return new Date(source);
    };

    list.forEach(reminder => {
      const date = parseDate(reminder.reminderDate || reminder.createdAt);
      if (!date) return;
      const dateHeader = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      let group = groups.find(g => g.dateHeader === dateHeader);
      if (!group) {
        group = { dateHeader, items: [] };
        groups.push(group);
      }
      group.items.push(reminder);
    });
    
    return groups.sort((a, b) => {
      const dateA = parseDate(a.items[0].reminderDate || a.items[0].createdAt);
      const dateB = parseDate(b.items[0].reminderDate || b.items[0].createdAt);
      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
    });
  };

  const groupedNotifyList = useMemo(() => groupRemindersByDate(notifyList), [notifyList]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}>Loading your notes...</div>
      </div>
    );
  }

  const renderNotifyList = () => (
    <div className={styles.timelineContainer}>
      {groupedNotifyList.map(group => (
        <div key={group.dateHeader} className={styles.monthGroup}>
          <div className={styles.monthHeader}>
            <span className={styles.timelineDot} />
            {group.dateHeader}
          </div>
          <div className={styles.timelineItems}>
            {group.items.map((reminder) => (
              <div key={reminder.id} className={styles.timelineItemWrapper}>
                <ReminderItem 
                  reminder={reminder}
                  onComplete={handleComplete}
                  variant="full"
                  dateFormat="timeOnly"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderNoteList = () => (
    <div className={styles.notesList}>
      {noteList.map((reminder) => (
        <div key={reminder.id}>
          <ReminderItem 
            reminder={reminder}
            onComplete={handleComplete}
            variant="full"
            dateFormat="compact"
          />
        </div>
      ))}
    </div>
  );

  const hasBoth = notifyList.length > 0 && noteList.length > 0;

  return (
    <div className={styles.page}>
      <main className={styles.content}>
        {pendingReminders.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.iconCircle}>
              <CheckCircle2 size={48} className={styles.checkIcon} />
            </div>
            <h2 className={styles.emptyTitle}>All Caught Up!</h2>
            <p className={styles.emptyText}>You don't have any pending reminders at the moment.</p>
          </div>
        ) : (
          <div className={styles.listsContainer}>
            {hasBoth ? (
              <>
                {/* Notify Accordion */}
                <div className={styles.accordionSection}>
                  <button 
                    className={`${styles.accordionHeader} ${isNotifyOpen ? styles.open : ''}`}
                    onClick={() => setIsNotifyOpen(!isNotifyOpen)}
                  >
                    <div className={styles.accordionTitle}>
                      <Bell size={18} />
                      <span>Reminders</span>
                      <span className={styles.badge}>{notifyList.length}</span>
                    </div>
                    <ChevronDown size={20} className={styles.chevron} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isNotifyOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className={styles.accordionContent}
                      >
                        <div className={styles.accordionInner}>
                          {renderNotifyList()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Note Accordion */}
                <div className={styles.accordionSection}>
                  <button 
                    className={`${styles.accordionHeader} ${isNotesOpen ? styles.open : ''}`}
                    onClick={() => setIsNotesOpen(!isNotesOpen)}
                  >
                    <div className={styles.accordionTitle}>
                      <StickyNote size={18} />
                      <span>Notes</span>
                      <span className={styles.badge}>{noteList.length}</span>
                    </div>
                    <ChevronDown size={20} className={styles.chevron} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isNotesOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className={styles.accordionContent}
                      >
                        <div className={styles.accordionInner}>
                          {renderNoteList()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* Flat render if only one type exists */
              <>
                {notifyList.length > 0 && renderNotifyList()}
                {noteList.length > 0 && renderNoteList()}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
