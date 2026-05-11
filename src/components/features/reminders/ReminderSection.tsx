import { useReminders, type Reminder } from '@/hooks/useReminders';
import ReminderItem from '@/components/shared/ReminderItem/ReminderItem';
import styles from './ReminderSection.module.scss';
import { NavLink } from 'react-router-dom';
import { CheckCircle2, ExternalLink } from 'lucide-react';

export default function ReminderSection() {
  const { reminders, toggleReminder, loading } = useReminders();

  if (loading) return <div style={{ color: 'var(--colors-gray-font-color)', padding: '20px' }}>Loading...</div>;

  const pendingReminders = reminders.filter(r => !r.isCompleted);

  const handleComplete = (id: string, current: boolean) => {
    toggleReminder(id, current);
  };

  return (
    <div className={styles.section}>
      <div className={styles.list}>
        <NavLink to="/reminders" className={styles.widgetHeader}>
          <span className={styles.widgetTitle}>Quick Reminders</span>
          <ExternalLink size={18} className={styles.widgetIcon} />
        </NavLink>
        {pendingReminders.length > 0 ? (
          pendingReminders.slice(0, 4).map((reminder) => {
            return (
              <ReminderItem 
                key={reminder.id}
                reminder={reminder as Reminder}
                onComplete={handleComplete}
                variant="full"
              />
            );
          })
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.iconWrapper}>
              <CheckCircle2 size={24} strokeWidth={2} />
            </div>
            <p>You're all caught up!</p>
            <span>No pending reminders for now.</span>
          </div>
        )}
      </div>
    </div>
  );
}
