importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");

firebase.initializeApp({
  apiKey: "AIzaSyDbcH_OAGxFrfxPRarAnY4PUdAdz-rjymE",
  authDomain: "chat-ad084.firebaseapp.com",
  projectId: "chat-ad084",
  messagingSenderId: "703998786296",
  appId: "1:703998786296:web:99cabe960b1b00dd1d990d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png"
  });
});
