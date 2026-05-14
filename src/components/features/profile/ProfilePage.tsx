import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Pencil, LogOut, Trash2, RefreshCcw } from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import ImageSelector from './ImageSelector';
import PasswordDrawer from './PasswordDrawer';
import UsernameDrawer from './UsernameDrawer';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { notificationService } from '@/services/notificationService';
import { saveLocalProfileImage, getProfileImage, blobToBase64 } from '@/utils/profileImage';
import styles from './ProfilePage.module.scss';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { currentUser, userData, logout, deleteAccount } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);
  const [isPasswordDrawerOpen, setIsPasswordDrawerOpen] = useState(false);
  const [isUsernameDrawerOpen, setIsUsernameDrawerOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayData = {
    username: userData?.username || 'User',
    email: currentUser?.email || '',
    avatar: getProfileImage(userData?.photoURL || currentUser?.photoURL)
  };

  const handleNotificationToggle = async () => {
    if (!currentUser) return;

    if (userData?.notificationsEnabled) {
      // Logic to disable (optional, usually involves removing token from DB)
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { notificationsEnabled: false });
      return;
    }

    try {
      await notificationService.requestPermission(currentUser.uid);
    } catch (err: any) {
      if (err.message === 'PERMISSION_DENIED') {
        alert('Notification permission denied. Please enable notifications in your browser settings to receive alerts.');
      } else {
        alert('Failed to enable notifications. Please try again.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  const handleImageUpdate = async (image: string | Blob, isCustom: boolean) => {
    if (!currentUser) return;

    try {
      let finalUrl = '';

      if (isCustom && image instanceof Blob) {
        const storageRef = ref(storage, `users/${currentUser.uid}/profile.webp`);
        await uploadBytes(storageRef, image);
        finalUrl = await getDownloadURL(storageRef);
        
        // Save Base64 version locally for offline availability
        const base64 = await blobToBase64(image);
        saveLocalProfileImage(base64);
      } else if (typeof image === 'string') {
        finalUrl = image;
        saveLocalProfileImage(finalUrl);
      }

      if (finalUrl) {
        await updateProfile(currentUser, { photoURL: finalUrl });
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { photoURL: finalUrl });
      }
    } catch (err) {
      console.error('[Profile] Error updating image:', err);
      alert('Failed to update profile image.');
    }
  };


  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    
    setIsDeleting(true);
    try {
      await deleteAccount();
      
      // Atomic Cleanup ONLY on successful auth deletion
      localStorage.removeItem('nexus_staged_items');
      localStorage.removeItem(`migrated_v3_nested_${currentUser.uid}`);
      sessionStorage.clear();
      
      navigate('/auth');
    } catch (err: any) {
      console.error('[Profile] Account deletion failed:', err);
      
      if (err.code === 'auth/requires-recent-login') {
        alert('Security Re-authentication Required: For your protection, please log out and sign in again before deleting your account.');
      } else {
        alert('Failed to delete account. Please check your connection and try again.');
      }
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleResetData = async () => {
    if (!currentUser) return;
    
    const confirmReset = window.confirm(
      '☢️ CRITICAL ACTION: This will permanently delete all your transactions, accounts, and bills. Your login will remain. Proceed?'
    );
    
    if (!confirmReset) return;

    setIsDeleting(true); // Re-use deleting state for loading feedback
    try {
      const userId = currentUser.uid;
      const batch = writeBatch(db);

      const subCollections = [
        'accounts',
        'transactions',
        'reminders',
        'monthlies',
        'tenures',
        'socials',
        'monthlySnapshots',
        'recurringBills'
      ];

      // 1. Queue all documents for deletion
      for (const colName of subCollections) {
        const colRef = collection(db, 'users', userId, colName);
        const snap = await getDocs(colRef);
        snap.docs.forEach((doc) => batch.delete(doc.ref));
      }

      // 2. Reset user document fields
      const userDocRef = doc(db, 'users', userId);
      batch.update(userDocRef, {
        spendableAccountId: 'account_main'
      });

      // 3. Commit
      await batch.commit();

      // 4. Force refresh/redirect
      alert('Data reset successfully! Redirecting to dashboard...');
      navigate('/');
    } catch (err) {
      console.error('[Profile] Data reset failed:', err);
      alert('Failed to reset data. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.avatarContainer}>
          <div className={styles.halo} />
          <img src={displayData.avatar} alt="Profile" className={styles.avatar} />
          <button 
            className={styles.editBtn}
            onClick={() => setIsImageSelectorOpen(true)}
          >
            <Pencil size={14} />
          </button>
        </div>
        <h2 className={styles.username}>{displayData.username}</h2>
      </div>

      <div className={styles.sections}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Identity</h3>
          <div className={styles.card}>
            <div className={styles.field}>
              <div className={styles.fieldInfo}>
                <span className={styles.label}>Username</span>
                <span className={styles.value}>{displayData.username}</span>
              </div>
              <button 
                className={styles.changeBtn}
                onClick={() => setIsUsernameDrawerOpen(true)}
              >
                Change
              </button>
            </div>
            <div className={styles.field}>
              <div className={styles.fieldInfo}>
                <span className={styles.label}>Email Address</span>
                <span className={styles.value}>{displayData.email}</span>
              </div>
              <span className={styles.verifiedBadge}>Verified</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Security</h3>
          <div className={styles.card}>
            <div className={styles.field}>
              <div className={styles.fieldInfo}>
                <span className={styles.label}>Password</span>
                <span className={styles.value}>••••••••••••</span>
              </div>
              <button 
                className={styles.changeBtn}
                onClick={() => setIsPasswordDrawerOpen(true)}
              >
                Change
              </button>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Preferences</h3>
          <div className={styles.card}>
            <div className={styles.field}>
              <div className={styles.fieldInfo}>
                <span className={styles.label}>Enable Notifications</span>
                <span className={styles.value}>{userData?.notificationsEnabled ? 'Active' : 'Disabled'}</span>
              </div>
              <div className={styles.toggleWrapper}>
                <input 
                  type="checkbox" 
                  id="notif-toggle"
                  checked={!!userData?.notificationsEnabled}
                  onChange={handleNotificationToggle}
                  className={styles.toggleInput}
                />
                <label htmlFor="notif-toggle" className={styles.toggleLabel}></label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Account Actions</h3>
        <div className={styles.actionList}>
          <button 
            className={styles.actionItem}
            onClick={() => setIsLogoutModalOpen(true)}
          >
            <div className={styles.actionContent}>
              <div className={styles.actionIcon}>
                <LogOut size={20} />
              </div>
              <span className={styles.actionLabel}>Logout</span>
            </div>
            {/* <ChevronRight size={18} className={styles.chevron} /> */}
          </button>

          <button 
            className={styles.actionItem}
            onClick={handleResetData}
            disabled={isDeleting}
          >
            <div className={styles.actionContent}>
              <div className={styles.actionIcon}>
                <RefreshCcw size={20} />
              </div>
              <span className={styles.actionLabel}>Reset All Data</span>
            </div>
            {/* <ChevronRight size={18} className={styles.chevron} /> */}
          </button>

          <button 
            className={styles.actionItem}
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isDeleting}
          >
            <div className={styles.actionContent}>
              <div className={styles.actionIcon}>
                <Trash2 size={20} />
              </div>
              <span className={styles.actionLabel}>Delete Account</span>
            </div>
            {/* <ChevronRight size={18} className={styles.chevron} /> */}
          </button>
        </div>
      </div>

      {/* <div className={styles.devSection}>
        <h3 className={styles.sectionTitle}>Developer Tools</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button 
            className={styles.devBtn}
            onClick={handleMigrateDummyData}
            disabled={isMigrating}
          >
            <Database size={18} />
            PUSH TX DATA
          </button>
          
          <button 
            className={styles.devBtn}
            style={{ color: '#ff4d4d', borderColor: 'rgba(255, 77, 77, 0.3)', background: 'rgba(255, 77, 77, 0.05)' }}
            onClick={handleClearAllTransactions}
            disabled={isMigrating}
          >
            <Trash2 size={18} />
            CLEAR TX
          </button>

          <button 
            className={styles.devBtn}
            style={{ color: '#4dffdf', borderColor: 'rgba(77, 255, 223, 0.3)', background: 'rgba(77, 255, 223, 0.05)' }}
            onClick={handlePushReminders}
            disabled={isMigrating}
          >
            <Bell size={18} />
            PUSH REMINDERS
          </button>
          
          <button 
            className={styles.devBtn}
            style={{ color: '#ff9a4d', borderColor: 'rgba(255, 154, 77, 0.3)', background: 'rgba(255, 154, 77, 0.05)' }}
            onClick={handleClearAllReminders}
            disabled={isMigrating}
          >
            <Trash2 size={18} />
            CLEAR REMINDERS
          </button>

          <button 
            className={styles.devBtn}
            style={{ color: '#fff', borderColor: 'rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.05)', gridColumn: 'span 2' }}
            onClick={() => {
              if (window.confirm('This will re-sync your local data to the cloud sub-collections. Continue?')) {
                localStorage.removeItem(`migrated_v3_nested_${currentUser?.uid}`);
                window.location.reload();
              }
            }}
          >
            <RefreshCcw size={18} />
            RE-SYNC FLOW DATA
          </button>
        </div>
      </div> */}

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out of your Obsidian account?"
        confirmText="Logout"
        type="primary"
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message={isDeleting ? "Wiping all financial data... please do not close the app." : "This action is permanent and cannot be undone. All your accounts, transactions, and reminders will be erased."}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        type="danger"
      />

      <ImageSelector 
        isOpen={isImageSelectorOpen}
        onClose={() => setIsImageSelectorOpen(false)}
        onSelect={handleImageUpdate}
        currentImageUrl={displayData.avatar}
      />

      <PasswordDrawer 
        isOpen={isPasswordDrawerOpen}
        onClose={() => setIsPasswordDrawerOpen(false)}
      />

      <UsernameDrawer
        isOpen={isUsernameDrawerOpen}
        onClose={() => setIsUsernameDrawerOpen(false)}
      />
    </div>
  );
}
