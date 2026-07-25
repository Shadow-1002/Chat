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
  loadFriends();
  loadGroups();
}

<div id="chatWindow"></div>

<input id="messageInput" placeholder="Type a message">
<button id="sendMessageBtn">Send</button>
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { auth, db } from "./firebase.js";
let currentRoomID = null;

function openDMRoom(roomID) {
  currentRoomID = roomID;
  loadMessages(roomID);
}
function loadMessages(roomID) {
  const messagesRef = collection(db, "messages");
  const q = query(
    messagesRef,
    where("roomID", "==", roomID),
    orderBy("timestamp", "asc")
  );

  onSnapshot(q, (snapshot) => {
    const chatWindow = document.getElementById("chatWindow");
    chatWindow.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      chatWindow.innerHTML += `
        <div><b>${msg.username}:</b> ${msg.text}</div>
      `;
    });
  });
}
document.getElementById("sendMessageBtn").onclick = async () => {
  const text = document.getElementById("messageInput").value.trim();
  if (!text || !currentRoomID) return;

  const uid = auth.currentUser.uid;

  // Get username
  const userDoc = await getDocs(
    query(collection(db, "users"), where("uid", "==", uid))
  );
  const username = userDoc.docs[0].data().username;

  await addDoc(collection(db, "messages"), {
    roomID: currentRoomID,
    sender: uid,
    username,
    text,
    timestamp: Date.now()
  });

  document.getElementById("messageInput").value = "";
};
import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { auth, db } from "./firebase.js";
async function loadFriends() {
  const uid = auth.currentUser.uid;

  const friendsRef = collection(db, "friends");

  // Find friendships where the user is userA or userB
  const q1 = query(friendsRef, where("userA", "==", uid));
  const q2 = query(friendsRef, where("userB", "==", uid));

  const snap1 = await getDocs(q1);
  const snap2 = await getDocs(q2);

  const friendUIDs = [];

  snap1.forEach(docSnap => friendUIDs.push(docSnap.data().userB));
  snap2.forEach(docSnap => friendUIDs.push(docSnap.data().userA));

  displayFriends(friendUIDs);
}
async function displayFriends(friendUIDs) {
  const container = document.getElementById("friendsList");
  container.innerHTML = "";

  for (const fUID of friendUIDs) {
    const userDoc = await getDocs(
      query(collection(db, "users"), where("uid", "==", fUID))
    );

    const username = userDoc.docs[0].data().username;

    container.innerHTML += `
      <div class="friendItem" onclick="openFriendDM('${fUID}')">
        ${username}
      </div>
    `;
  }
}
async function openFriendDM(friendUID) {
  const uid = auth.currentUser.uid;

  const roomID = `dm_${uid}_${friendUID}`;

  // If room doesn't exist in this order, try reversed order
  const reversedRoomID = `dm_${friendUID}_${uid}`;

  const roomsRef = collection(db, "rooms");

  const q1 = query(roomsRef, where("roomID", "==", roomID));
  const q2 = query(roomsRef, where("roomID", "==", reversedRoomID));

  const snap1 = await getDocs(q1);
  const snap2 = await getDocs(q2);

  let finalRoomID = null;

  if (!snap1.empty) finalRoomID = roomID;
  else if (!snap2.empty) finalRoomID = reversedRoomID;

  if (!finalRoomID) {
    alert("DM room not found.");
    return;
  }

  openDMRoom(finalRoomID);
}
import { doc, setDoc, collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "./firebase.js";
document.getElementById("createGroupBtn").onclick = async () => {
  const name = document.getElementById("groupNameInput").value.trim();
  const uid = auth.currentUser.uid;

  if (!name) {
    alert("Group name cannot be empty.");
    return;
  }

  const roomID = `group_${name}_${Date.now()}`;

  await setDoc(doc(db, "rooms", roomID), {
    roomID,
    type: "group",
    name,
    members: [uid],
    createdAt: Date.now()
  });

  alert("Group created!");

  loadGroups();
};
async function loadGroups() {
  const uid = auth.currentUser.uid;

  const roomsRef = collection(db, "rooms");
  const q = query(roomsRef, where("type", "==", "group"));

  const snap = await getDocs(q);

  const groups = [];

  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.members.includes(uid)) {
      groups.push(data);
    }
  });

  displayGroups(groups);
}
function displayGroups(groups) {
  const container = document.getElementById("groupList");
  container.innerHTML = "<h3>Your Groups</h3>";

  groups.forEach(group => {
    container.innerHTML += `
      <div class="groupItem" onclick="openGroupRoom('${group.roomID}')">
        ${group.name}
      </div>
    `;
  });
}
function openGroupRoom(roomID) {
  openDMRoom(roomID); // same messaging system
}
async function addMemberToGroup(roomID, newUID) {
  const roomRef = doc(db, "rooms", roomID);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) return;

  const data = roomSnap.data();

  if (!data.members.includes(newUID)) {
    data.members.push(newUID);
    await updateDoc(roomRef, { members: data.members });
  }
}
