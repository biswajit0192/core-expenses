export interface Transaction {
  id: string; // UUID
  type: 'CREDIT' | 'DEBIT' | 'TRANSFER' | 'INCOME' | 'EXPENSE'; // Migration bridge
  amount: number;
  category: string;
  description: string;
  date: string; // ISO format
  accountId: string;
  isReminder: boolean;
  isRecurringHit?: boolean;
  isLocal?: boolean;
  socialId?: string; // Linked person/social entity
  socialAction?: 'SETTLE' | 'ADD' | 'GENERAL'; // Intent gate
  socialTargetName?: string; // Recognized name for UI display
  flippedSocialId?: string; // ID of the new debt card if a relationship was flipped
  settledSocialId?: string; // ID of the debt card being settled
  socialType?: 'LENT' | 'BORROWED';
  outstandingBalance?: number;
  isNewSocialCandidate?: boolean;
}

export interface Account {
  id: string;
  name: string;
  bankName?: string | null;
  balance: number;
  type: string;
  accountCategory?: 'Spending' | 'Savings' | 'Fixed';
  includeInSafeToSpend?: boolean; // New granular control
  goalAmount?: number | null;
  budget?: number | null;
  goalDate?: string | null;
  isSelected: boolean;
  theme: 'blue' | 'green' | 'red';
  priority: number;
}



export interface Reminder {
  id: string;
  task: string;
  dueDate: string;
  isCompleted: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  type?: 'notify' | 'note';
  isLocal?: boolean;
  link?: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  category: string;
  isActive: boolean;
  dueDate: string; // ISO format for current month instance
  status: 'UPCOMING' | 'PAID';
}

export interface MonthlySnapshot {
  id: string; // monthKey (YYYY-MM)
  monthKey: string;
  initialBalance: number;
  fixedHit: number;
  initialSTS: number;
  currentSTS: number; // The stateful real-time number
  snapshotDate: string; // ISO
  createdAt: any;
}

export interface Tenure {
  id: string;
  title: string;
  category: string;
  monthlyEmi: number;
  totalPrincipal: number;
  totalMonths: number;
  monthsPaid: number;
  type: 'EMI' | 'LOAN';
  interestType?: 'FLAT' | 'REDUCING';
  startDate: string; // ISO format
  accountId?: string;
  isSettled?: boolean;
  paidMonths?: string[];
}

export interface Social {
  id: string;
  personName: string;
  type: 'LENT' | 'BORROWED';
  totalAmount: number;
  amountSettled: number;
  date: string;
  themeColor?: string;
  createdAt: string; // ISO format
  settledAt?: string; // ISO format
  isSettled?: boolean;
}

export interface Monthly {
  id: string;
  provider: string;
  amount: number;
  cycle: 'MONTHLY' | 'YEARLY';
  category: 'ENTERTAINMENT' | 'SOFTWARE' | 'UTILITIES' | 'OTHER';
  nextBillDate: string; // ISO format
  startedAt: string; // ISO format
  accountId?: string;
  isSettled?: boolean;
  paidMonths?: string[];
}

export interface GlobalState {
  transactions: Transaction[];
  accounts: Account[];
  reminders: Reminder[];
  recurringBills: RecurringBill[];
  tenures: Tenure[];
  socials: Social[];
  monthlies: Monthly[];
}
