importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    data: payload.data,
    actions: [
      {
        action: 'mark-as-paid',
        title: 'Mark as Paid',
        icon: '/icons/check.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'mark-as-paid') {
    const { userId, billId, type, amount, accountId, description } = event.notification.data;
    
    // Ping a cloud function to handle the transaction logic in background
    // Since we can't directly use Firestore with write permission easily in SW 
    // without full auth context, a background function is safer.
    event.waitUntil(
      fetch('https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/handleNotificationAction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark-as-paid',
          userId,
          billId,
          type,
          amount,
          accountId,
          description
        })
      })
    );
  }
});
