const db = firebase.database();

// ASK FOR USERNAME WHEN PAGE LOADS
let myName = prompt("Enter your username:");
if (!myName || myName.trim() === "") {
  myName = "Unknown";
}

// SEND MESSAGE
function sendMessage() {
  const text = document.getElementById("input").value;
  if (text.trim() === "") return;

  db.ref("messages").push({
    text: text,
    user: myName,
    time: Date.now()
  });

  document.getElementById("input").value = "";
}

// DISPLAY MESSAGES WITH BUBBLES + USERNAMES
db.ref("messages").on("child_added", snapshot => {
  const msg = snapshot.val();

  const div = document.createElement("div");
  div.classList.add("bubble");

  // username label
  const nameSpan = document.createElement("div");
  nameSpan.style.fontSize = "14px";
  nameSpan.style.marginBottom = "4px";
  nameSpan.style.opacity = "0.7";
  nameSpan.textContent = msg.user || "Unknown";

  const textSpan = document.createElement("div");
  textSpan.textContent = msg.text;

  div.appendChild(nameSpan);
  div.appendChild(textSpan);

  if (msg.user === myName) {
    div.classList.add("me");
  } else {
    div.classList.add("other");
  }

  document.getElementById("messages").appendChild(div);

  // AUTO SCROLL TO BOTTOM
  const box = document.getElementById("messages");
  box.scrollTop = box.scrollHeight;
});

// ENTER KEY SENDS MESSAGE
document.getElementById("input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// AUTO DELETE MESSAGES AFTER 1 HOUR
setInterval(() => {
  const cutoff = Date.now() - 3600000; // 1 hour

  db.ref("messages").once("value", snapshot => {
    snapshot.forEach(child => {
      if (child.val().time < cutoff) {
        db.ref("messages/" + child.key).remove();
      }
    });
  });
}, 60000); // runs every minute
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
document.getElementById("signupBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;

  // Show username section
  document.getElementById("usernameSection").style.display = "block";
};
document.getElementById("saveUsernameBtn").onclick = async () => {
  const username = document.getElementById("username").value.trim();
  const uid = auth.currentUser.uid;

  // Check if username already exists
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", username));
  const snapshot = await getDocs(q);

  if (!username) {
    alert("Username cannot be empty.");
    return;
  }

  if (!snapshot.empty) {
    alert("Username already taken.");
    return;
  }

  // Save user profile
  await setDoc(doc(db, "users", uid), {
    uid,
    email: auth.currentUser.email,
    username
  });

  alert("Username saved!");
};
document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const userCred = await signInWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;

  // Check if user already has a username
  const userDoc = await getDoc(doc(db, "users", uid));

  if (!userDoc.exists()) {
    // Show username creation
    document.getElementById("usernameSection").style.display = "block";
  } else {
    alert("Logged in!");
    loadFriendRequests();
  }
};
<input id="searchUsername" placeholder="Search username">
<button id="searchBtn">Search</button>

<div id="searchResult"></div>
document.getElementById("searchBtn").onclick = async () => {
  const name = document.getElementById("searchUsername").value.trim();

  if (!name) {
    document.getElementById("searchResult").innerText = "Enter a username.";
    return;
  }

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", name));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    document.getElementById("searchResult").innerText = "No user found.";
    return;
  }

  // Found user
  const userData = snapshot.docs[0].data();
  const foundUID = userData.uid;

  document.getElementById("searchResult").innerHTML = `
    Found: ${userData.username}
    <button id="sendRequestBtn">Send Friend Request</button>
  `;

  setupSendRequest(foundUID);
};
function setupSendRequest(targetUID) {
  document.getElementById("sendRequestBtn").onclick = async () => {
    const currentUID = auth.currentUser.uid;

    if (currentUID === targetUID) {
      alert("You cannot add yourself.");
      return;
    }

    const requestID = `${currentUID}_${targetUID}`;

    await setDoc(doc(db, "friendRequests", requestID), {
      from: currentUID,
      to: targetUID,
      status: "pending",
      timestamp: Date.now()
    });

    alert("Friend request sent!");
  };
}
async function loadFriendRequests() {
  const uid = auth.currentUser.uid;

  const requestsRef = collection(db, "friendRequests");

  // Incoming: to == uid
  const incomingQ = query(requestsRef, where("to", "==", uid));
  const incomingSnap = await getDocs(incomingQ);

  // Outgoing: from == uid
  const outgoingQ = query(requestsRef, where("from", "==", uid));
  const outgoingSnap = await getDocs(outgoingQ);

  displayIncoming(incomingSnap);
  displayOutgoing(outgoingSnap);
}
async function displayIncoming(snapshot) {
  const container = document.getElementById("incomingRequests");
  container.innerHTML = "<h3>Incoming</h3>";

  snapshot.forEach(async (docSnap) => {
    const data = docSnap.data();

    // Get sender's username
    const userDoc = await getDocs(
      query(collection(db, "users"), where("uid", "==", data.from))
    );
    const sender = userDoc.docs[0].data().username;

    container.innerHTML += `
      <div>
        ${sender} wants to be friends
        <button onclick="acceptRequest('${docSnap.id}', '${data.from}')">Accept</button>
        <button onclick="declineRequest('${docSnap.id}')">Decline</button>
      </div>
    `;
  });
}
async function displayOutgoing(snapshot) {
  const container = document.getElementById("outgoingRequests");
  container.innerHTML = "<h3>Outgoing</h3>";

  snapshot.forEach(async (docSnap) => {
    const data = docSnap.data();

    // Get receiver's username
    const userDoc = await getDocs(
      query(collection(db, "users"), where("uid", "==", data.to))
    );
    const receiver = userDoc.docs[0].data().username;

    container.innerHTML += `
      <div>
        You sent a request to ${receiver} (pending)
      </div>
    `;
  });
}
async function acceptRequest(requestID, otherUID) {
  const uid = auth.currentUser.uid;

  // Update request status
  await updateDoc(doc(db, "friendRequests", requestID), {
    status: "accepted"
  });

  // Create friendship
  const friendshipID = `${uid}_${otherUID}`;
  await setDoc(doc(db, "friends", friendshipID), {
    userA: uid,
    userB: otherUID
  });

  alert("Friend request accepted!");

  loadFriendRequests();
}
async function declineRequest(requestID) {
  await updateDoc(doc(db, "friendRequests", requestID), {
    status: "declined"
  });

  alert("Friend request declined.");
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";

async function createDMRoom(uidA, uidB) {
  const roomID = `dm_${uidA}_${uidB}`;

  await setDoc(doc(db, "rooms", roomID), {
    roomID,
    type: "dm",
    members: [uidA, uidB],
    createdAt: Date.now()
  });

  return roomID;
}
async function acceptRequest(requestID, otherUID) {
  const uid = auth.currentUser.uid;

  // Update request status
  await updateDoc(doc(db, "friendRequests", requestID), {
    status: "accepted"
  });

  // Create friendship
  const friendshipID = `${uid}_${otherUID}`;
  await setDoc(doc(db, "friends", friendshipID), {
    userA: uid,
    userB: otherUID
  });

  // ⭐ Create DM room
  await createDMRoom(uid, otherUID);

  alert("Friend request accepted!");

  loadFriendRequests();
}

  loadFriendRequests();
}
