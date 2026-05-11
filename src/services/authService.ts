import { 
  sendPasswordResetEmail, 
  reauthenticateWithCredential, 
  EmailAuthProvider, 
  updatePassword,
  updateProfile,
  type User
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export const authService = {
  /**
   * Send a password reset email
   */
  async sendPasswordReset(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('[AuthService] Reset password error:', error);
      throw error;
    }
  },

  /**
   * Verify current password by re-authenticating the user
   */
  async verifyCurrentPassword(user: User, password: string) {
    if (!user.email) throw new Error('User email not found');
    
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    } catch (error: any) {
      console.error('[AuthService] Re-auth error:', error);
      throw error;
    }
  },

  /**
   * Update the current user's password
   */
  async updateUserPassword(user: User, newPassword: string) {
    try {
      await updatePassword(user, newPassword);
    } catch (error: any) {
      console.error('[AuthService] Update password error:', error);
      throw error;
    }
  },

  /**
   * Update the current user's username in Auth profile and Firestore
   */
  async updateUsername(user: User, newUsername: string) {
    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(user, { displayName: newUsername });

      // 2. Update Firestore User Document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { username: newUsername });
    } catch (error: any) {
      console.error('[AuthService] Update username error:', error);
      throw error;
    }
  }
};
