import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  const firebaseConfig = {
      apiKey: "AIzaSyDbcH_OAGxFrfxPRarAnY4PUdAdz-rjymE",
      authDomain: "chat-ad084.firebaseapp.com",
      databaseURL: "https://chat-ad084-default-rtdb.firebaseio.com",
      projectId: "chat-ad084",
      storageBucket: "chat-ad084.firebasestorage.app",
      messagingSenderId: "703998786296",
      appId: "1:703998786296:web:99cabe960b1b00dd1d990d",
      measurementId: "G-MEVR8MCS49"
    };

    firebase.initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

