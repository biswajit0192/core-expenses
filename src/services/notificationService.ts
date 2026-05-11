import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const VAPID_KEY = "YOUR_PUBLIC_VAPID_KEY_HERE"; // User needs to replace this

export const notificationService = {
  async requestPermission(userId: string) {
    if (!messaging) return null;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
          await this.saveToken(userId, token);
          return token;
        }
      } else if (permission === 'denied') {
        throw new Error('PERMISSION_DENIED');
      }
    } catch (error) {
      console.error('[NotificationService] Permission error:', error);
      throw error;
    }
    return null;
  },

  async saveToken(userId: string, token: string) {
    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        notificationsEnabled: true,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('[NotificationService] Save token error:', error);
    }
  },

  onMessageListener() {
    return new Promise((resolve) => {
      if (!messaging) return;
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    });
  }
};
