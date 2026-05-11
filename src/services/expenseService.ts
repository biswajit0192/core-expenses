import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc 
} from 'firebase/firestore';
import { getCategoryFromTitle } from '@/utils/categoryMapper';

/**
 * Service for handling static expenses with auto-categorization
 */
export const expenseService = {
  /**
   * Adds a new static expense with keyword-based auto-categorization
   */
  async addStaticExpense(userId: string, data: {
    name: string;
    amount: number;
    dueDate: string;
  }) {
    // 1. Automatically get category from the name
    const category = getCategoryFromTitle(data.name);
    
    const expensesRef = collection(db, 'users', userId, 'staticExpenses');
    
    // 2. Save to Firestore
    return await addDoc(expensesRef, {
      ...data,
      category,
      isActive: true,
      status: 'UPCOMING'
    });
  }
};
