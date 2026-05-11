import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { DateTime } from 'luxon';

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();
const IST = 'Asia/Kolkata';

/**
 * Scheduled function to check for due reminders every 15 minutes.
 */
export const checkReminders = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const now = DateTime.now().setZone(IST);
    const windowStart = now.toISO();
    const windowEnd = now.plus({ minutes: 15 }).toISO();

    const usersSnap = await db.collection('users').get();
    
    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const tokens = userDoc.data().fcmTokens || [];
      if (tokens.length === 0) continue;

      const remindersSnap = await db.collection('users', userId, 'reminders')
        .where('dueDate', '>=', windowStart)
        .where('dueDate', '<=', windowEnd)
        .where('isCompleted', '==', false)
        .get();

      for (const reminderDoc of remindersSnap.docs) {
        const reminder = reminderDoc.data();
        const payload = {
          notification: {
            title: 'Reminder Due!',
            body: reminder.text,
          },
          tokens: tokens,
        };

        try {
          await messaging.sendMulticast(payload);
          console.log(`Notification sent for reminder: ${reminderDoc.id}`);
        } catch (error) {
          console.error(`Error sending notification:`, error);
        }
      }
    }
  });

/**
 * Scheduled function to check for unpaid bills at 9:00 AM IST daily.
 */
export const checkFixedHits = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone(IST)
  .onRun(async (context) => {
    const today = DateTime.now().setZone(IST).toISODate(); // YYYY-MM-DD
    const monthKey = DateTime.now().setZone(IST).toFormat('yyyy-MM');

    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const tokens = userData.fcmTokens || [];
      if (tokens.length === 0) continue;

      const collections = ['tenures', 'monthlies'];
      
      for (const col of collections) {
        const billsSnap = await db.collection('users', userId, col)
          .where('nextBillDate', '==', today)
          .get();

        for (const billDoc of billsSnap.docs) {
          const bill = billDoc.data();
          const paidMonths = bill.paidMonths || [];
          
          if (!paidMonths.includes(monthKey)) {
            const amount = bill.monthlyEmi || bill.amount;
            const description = bill.title || bill.provider;
            
            const payload = {
              notification: {
                title: 'Bill Due Today!',
                body: `${description}: ₹${amount} is due.`,
              },
              data: {
                userId,
                billId: billDoc.id,
                billType: col,
                amount: String(amount),
                description,
                accountId: userData.spendableAccountId || 'account_main',
                action: 'mark-as-paid-prompt'
              },
              tokens: tokens,
            };

            await messaging.sendMulticast(payload);
          }
        }
      }
    }
  });

/**
 * Handle notification actions via HTTPS call.
 */
export const handleNotificationAction = functions.https.onRequest(async (req, res) => {
  const { action, userId, billId, billType, amount, accountId, description } = req.body;

  if (action === 'mark-as-paid') {
    const monthKey = DateTime.now().setZone(IST).toFormat('yyyy-MM');
    const batch = db.batch();

    // 1. Log Transaction
    const transRef = db.collection('users').doc(userId).collection('transactions').doc();
    batch.set(transRef, {
      type: 'DEBIT',
      amount: Number(amount),
      description: `[Auto] ${description}`,
      category: 'EMI',
      date: new Date().toISOString(),
      accountId,
      isRecurringHit: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Update Bill Status
    const billRef = db.collection('users').doc(userId).collection(billType).doc(billId);
    batch.update(billRef, {
      paidMonths: admin.firestore.FieldValue.arrayUnion(monthKey),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Update Account Balance
    const accountRef = db.collection('users').doc(userId).collection('accounts').doc(accountId);
    batch.update(accountRef, {
      balance: admin.firestore.FieldValue.increment(-Number(amount))
    });

    try {
      await batch.commit();
      res.status(200).send({ success: true });
    } catch (error) {
      console.error('Action failed:', error);
      res.status(500).send({ error: 'Internal Server Error' });
    }
  } else {
    res.status(400).send({ error: 'Invalid action' });
  }
});
