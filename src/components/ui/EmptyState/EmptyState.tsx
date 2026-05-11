import { Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from './EmptyState.module.scss';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onAdd?: () => void;
  actionLabel?: string;
}

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  onAdd,
  actionLabel = "Add Now"
}: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <Icon size={40} className={styles.icon} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      
      {onAdd && (
        <button onClick={onAdd} className={styles.addBtn}>
          <Plus size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
