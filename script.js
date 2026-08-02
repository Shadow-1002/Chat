// Username-only login system
let myName = localStorage.getItem("username");

// If not logged in → go to login page
if (!myName) {
  window.location.href = "auth.html";
}

const realtimeDB = firebase.database();

/* --------------------------------------------------
   CHAT STATE
-------------------------------------------------- */
let currentChatType = "global";      // "global" or "private"
let currentChatFriend = null;        // username of friend in private chat
let currentChatID = null;            // private chat ID (sorted usernames)
let privateMessagesRef = null;       // Firebase ref for current private chat messages

/* --------------------------------------------------
   MARK USER ACTIVE WHEN OPENING CHATTERBOX
-------------------------------------------------- */
firebase.database().ref("users/" + myName + "/lastActive").set(Date.now());

/* --------------------------------------------------
   UTIL: BUILD PRIVATE CHAT ID
-------------------------------------------------- */
function getChatID(userA, userB) {
  return [userA, userB].sort().join("_");
}

/* --------------------------------------------------
   SWITCH TO GLOBAL CHAT
-------------------------------------------------- */
function switchToGlobalChat() {
  currentChatType = "global";
  currentChatFriend = null;
  currentChatID = null;

  // Clear messages box
  const box = document.getElementById("messages");
  box.innerHTML = "";

  // Remove private listener if any
  if (privateMessagesRef) {
    privateMessagesRef.off();
    privateMessagesRef = null;
  }

  // Listen to global messages
  realtimeDB.ref("messages").off();
  realtimeDB.ref("messages").on("child_added", snapshot => {
    const msg = snapshot.val();
    renderMessage(msg.user, msg.text);
  });

  // Scroll to bottom
  box.scrollTop = box.scrollHeight;

  // Optional: update header text
  const header = document.getElementById("chatHeader");
  if (header) header.textContent = "Global Chat";
}

/* --------------------------------------------------
   SWITCH TO PRIVATE CHAT WITH FRIEND
-------------------------------------------------- */
function switchToPrivateChat(friendUsername) {
  currentChatType = "private";
  currentChatFriend = friendUsername;
  currentChatID = getChatID(myName, friendUsername);

  // Clear messages box
  const box = document.getElementById("messages");
  box.innerHTML = "";

  // Remove global listener
  realtimeDB.ref("messages").off();

  // Remove previous private listener
  if (privateMessagesRef) {
    privateMessagesRef.off();
  }

  // Listen to this private chat's messages
  privateMessagesRef = realtimeDB.ref("privateChats/" + currentChatID + "/messages");
  privateMessagesRef.on("child_added", snapshot => {
    const msg = snapshot.val();
    renderMessage(msg.user, msg.text);
  });

  // Clear unread flag for this chat
  firebase.database().ref("unreadChats/" + myName + "/" + currentChatID).remove();

  // Refresh chats list to remove red dot
  loadChats(myName);

  // Optional: update header text
  const header = document.getElementById("chatHeader");
  if (header) header.textContent = "Chat with " + friendUsername;
}

/* --------------------------------------------------
   RENDER MESSAGE BUBBLE
-------------------------------------------------- */
function renderMessage(user, text) {
  const div = document.createElement("div");
  div.classList.add("bubble");

  const nameTag = document.createElement("div");
  nameTag.style.fontSize = "22px";
  nameTag.style.opacity = "0.7";
  nameTag.style.marginBottom = "4px";
  nameTag.textContent = user;

  const textTag = document.createElement("div");
  textTag.textContent = text;

  div.appendChild(nameTag);
  div.appendChild(textTag);

  if (user === myName) {
    div.classList.add("me");
  } else {
    div.classList.add("other");
  }

  const box = document.getElementById("messages");
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

/* --------------------------------------------------
   INITIAL: START IN GLOBAL CHAT
-------------------------------------------------- */
switchToGlobalChat();

/* --------------------------------------------------
   SEND MESSAGE (GLOBAL OR PRIVATE)
-------------------------------------------------- */
function sendMessage() {
  const text = document.getElementById("input").value;
  if (text.trim() === "") return;

  // Update lastActive when sending a message
  firebase.database().ref("users/" + myName + "/lastActive").set(Date.now());

  const msgData = {
    text: text,
    user: myName,
    time: Date.now()
  };

  if (currentChatType === "global") {
    realtimeDB.ref("messages").push(msgData);
  } else if (currentChatType === "private" && currentChatID) {
    realtimeDB.ref("privateChats/" + currentChatID + "/messages").push(msgData);
  }

  document.getElementById("input").value = "";
}

/* --------------------------------------------------
   ENTER KEY SENDS MESSAGE
-------------------------------------------------- */
document.getElementById("input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});

/* --------------------------------------------------
   AUTO DELETE GLOBAL MESSAGES AFTER 1 HOUR
-------------------------------------------------- */
setInterval(() => {
  const cutoff = Date.now() - 3600000;

  realtimeDB.ref("messages").once("value", snapshot => {
    snapshot.forEach(child => {
      if (child.val().time < cutoff) {
        realtimeDB.ref("messages/" + child.key).remove();
      }
    });
  });
}, 60000);

/* --------------------------------------------------
   LOGOUT
-------------------------------------------------- */
function logout() {
  localStorage.removeItem("username");
  window.location.href = "auth.html";
}

/* --------------------------------------------------
   CLEAR GLOBAL CHAT
-------------------------------------------------- */
function clearChat() {
  if (confirm("Clear all messages?")) {
    firebase.database().ref("messages").remove();
  }
}

/* --------------------------------------------------
   FRIEND SYSTEM
-------------------------------------------------- */

// Search for a user
async function searchUser(username) {
  const snap = await firebase.database().ref("users/" + username).get();
  return snap.exists();
}

// Add friend (no auto chat creation)
async function addFriend(myUsername, friendUsername) {
  if (!friendUsername) {
    alert("Enter a username.");
    return;
  }

  if (myUsername === friendUsername) {
    alert("You can't add yourself.");
    return;
  }

  const exists = await searchUser(friendUsername);
  if (!exists) {
    alert("User not found.");
    return;
  }

  const db = firebase.database();

  // Add friend to me
  await db.ref("users/" + myUsername + "/friends/" + friendUsername).set(true);

  // Add me to friend
  await db.ref("users/" + friendUsername + "/friends/" + myUsername).set(true);

  alert("Friend added!");
}

/* --------------------------------------------------
   LOAD FRIENDS INTO SIDEBAR
-------------------------------------------------- */
function loadFriends(username) {
  firebase.database().ref("users/" + username + "/friends")
    .on("value", snap => {
      const friends = snap.val() || {};
      const list = document.getElementById("friendsList");
      list.innerHTML = "";

      Object.keys(friends).forEach(friend => {
        const div = document.createElement("div");
        div.className = "friendItem";
        div.textContent = friend;

        // Clicking friend opens private chat
        div.onclick = () => {
          switchToPrivateChat(friend);
        };

        list.appendChild(div);
      });

      // Also refresh Chats section whenever friends change
      loadChats(username);
    });
}

/* --------------------------------------------------
   LOAD CHATS SECTION (ABOVE FRIENDS)
-------------------------------------------------- */
function loadChats(username) {
  const chatsList = document.getElementById("chatsList");
  if (!chatsList) return;

  // Get friends and unread flags
  Promise.all([
    firebase.database().ref("users/" + username + "/friends").get(),
    firebase.database().ref("unreadChats/" + username).get()
  ]).then(([friendsSnap, unreadSnap]) => {
    const friends = friendsSnap.val() || {};
    const unread = unreadSnap.val() || {};

    chatsList.innerHTML = "";

    Object.keys(friends).forEach(friend => {
      const chatID = getChatID(username, friend);

      const div = document.createElement("div");
      div.className = "chatItem";

      // Name label
      const nameSpan = document.createElement("span");
      nameSpan.textContent = friend;

      // Red dot on right if unread
      const dotSpan = document.createElement("span");
      dotSpan.style.float = "right";
      dotSpan.style.width = "10px";
      dotSpan.style.height = "10px";
      dotSpan.style.borderRadius = "50%";
      dotSpan.style.backgroundColor = unread[chatID] ? "red" : "transparent";
      dotSpan.style.marginLeft = "8px";

      div.appendChild(nameSpan);
      div.appendChild(dotSpan);

      div.onclick = () => {
        switchToPrivateChat(friend);
      };

      chatsList.appendChild(div);
    });
  });
}

/* --------------------------------------------------
   UNREAD DOTS: LISTEN FOR PRIVATE MESSAGES
-------------------------------------------------- */
firebase.database().ref("privateChats").on("child_added", chatSnap => {
  const chatID = chatSnap.key;

  // Listen to messages in each private chat
  firebase.database().ref("privateChats/" + chatID + "/messages").on("child_added", msgSnap => {
    const msg = msgSnap.val();

    // If message is from someone else and we're not viewing this chat → mark unread
    if (msg.user !== myName && currentChatID !== chatID) {
      firebase.database().ref("unreadChats/" + myName + "/" + chatID).set(true);
      loadChats(myName);
    }
  });
});

/* --------------------------------------------------
   LOAD FRIENDS + CHATS ON PAGE LOAD
-------------------------------------------------- */
loadFriends(myName);

/* --------------------------------------------------
   AUTO-DELETE INACTIVE ACCOUNTS (30 DAYS)
-------------------------------------------------- */
setInterval(() => {
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days

  firebase.database().ref("users").once("value", snap => {
    snap.forEach(child => {
      const user = child.val();

      // NEVER delete admin account
      if (child.key === "Shadow_1002") return;

      if (user.lastActive && user.lastActive < cutoff) {
        firebase.database().ref("users/" + child.key).remove();
      }
    });
  });
}, 3600000); // runs every hour
