/* ==================================================
   INIT
================================================== */
const myName = localStorage.getItem("username");
if (!myName) window.location.href = "auth.html";

const db = firebase.database();

/* ==================================================
   DESKTOP NOTIFICATIONS
================================================== */
Notification.requestPermission();

function sendDesktopNotification(title, body) {
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

/* ==================================================
   POPUP SYSTEM
================================================== */
function makePopup(msg, bgColor) {
  const box = document.createElement("div");
  Object.assign(box.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: bgColor,
    color: "white",
    padding: "10px 15px",
    borderRadius: "6px",
    fontSize: "20px",
    zIndex: "9999"
  });
  box.textContent = msg;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2000);
}

function showError(msg) {
  makePopup(msg, "#ff4444");
}

function showSuccess(msg) {
  makePopup(msg, "#4da6ff");
}

/* ==================================================
   STATE
================================================== */
let currentChatType = "global";
let currentChatFriend = null;
let currentChatID = null;
let privateMessagesRef = null;

/* ==================================================
   UTIL
================================================== */
function getChatID(a, b) {
  return [a, b].sort().join("_");
}

/* ==================================================
   GLOBAL CHAT
================================================== */
function switchToGlobalChat(showPopup = true) {
  currentChatType = "global";
  currentChatFriend = null;
  currentChatID = null;

  document.querySelectorAll(".chatItem").forEach(i => i.classList.remove("activeChat"));
  document.getElementById("globalChatBtn").classList.add("activeChat");
  document.getElementById("messages").innerHTML = "";
  document.getElementById("deleteChatSidebarBtn").style.display = "none";

  if (privateMessagesRef) privateMessagesRef.off();
  db.ref("messages").off();

  db.ref("messages").on("child_added", snap => {
    const msg = snap.val();
    renderMessage(msg.user, msg.text);
  });

  if (showPopup) showSuccess("Switched to global chat");
}

/* ==================================================
   PRIVATE CHAT
================================================== */
function switchToPrivateChat(friend) {
  currentChatType = "private";
  currentChatFriend = friend;
  currentChatID = getChatID(myName, friend);

  db.ref(`unreadChats/${myName}/${currentChatID}`).remove();

  db.ref(`privateChats/${currentChatID}`).get().then(snap => {
    if (!snap.exists()) {
      db.ref(`privateChats/${currentChatID}`).set({ createdAt: Date.now() });
      showSuccess("Chat started.");
    }

    document.getElementById("globalChatBtn").classList.remove("activeChat");
    document.querySelectorAll(".chatItem").forEach(i => i.classList.remove("activeChat"));

    const chatItem = document.getElementById(`chatItem_${friend}`);
    if (chatItem) chatItem.classList.add("activeChat");

    document.getElementById("messages").innerHTML = "";
    document.getElementById("deleteChatSidebarBtn").style.display = "block";

    db.ref("messages").off();
    if (privateMessagesRef) privateMessagesRef.off();

    privateMessagesRef = db.ref(`privateChats/${currentChatID}/messages`);
    privateMessagesRef.on("child_added", snap => {
      const msg = snap.val();
      renderMessage(msg.user, msg.text);
    });

    loadChats(myName);
  });
}

/* ==================================================
   RENDER MESSAGE
================================================== */
function renderMessage(user, text) {
  const div = document.createElement("div");
  div.classList.add("bubble", user === myName ? "me" : "other");

  const nameTag = document.createElement("div");
  Object.assign(nameTag.style, {
    fontSize: "22px",
    opacity: "0.7",
    marginBottom: "4px"
  });
  nameTag.textContent = user;

  const textTag = document.createElement("div");
  textTag.textContent = text;

  div.appendChild(nameTag);
  div.appendChild(textTag);

  const box = document.getElementById("messages");
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

/* ==================================================
   SEND MESSAGE
================================================== */
function sendMessage() {
  const input = document.getElementById("input");
  const text = input.value.trim();
  if (!text) return;

  const msg = { text, user: myName, time: Date.now() };

  if (currentChatType === "global") {
    db.ref("messages").push(msg);
  } else {
    db.ref(`privateChats/${currentChatID}/messages`).push(msg);
  }

  input.value = "";
  showSuccess("Message sent");
}

/* ==================================================
   FRIEND SYSTEM
================================================== */
async function searchUser(username) {
  const snap = await db.ref("users/" + username).get();
  return snap.exists();
}

async function addFriend(myUsername, friendUsername) {
  if (!friendUsername) return showError("Enter a username.");
  if (myUsername === friendUsername) return showError("You can't add yourself.");

  const exists = await searchUser(friendUsername);
  if (!exists) return showError("User not found.");

  await db.ref(`users/${myUsername}/friends/${friendUsername}`).set(true);
  await db.ref(`users/${friendUsername}/friends/${myUsername}`).set(true);

  loadFriends(myName);
  showSuccess("Friend added.");
}

/* ==================================================
   DELETE FRIEND
================================================== */
function deleteFriend(friend) {
  db.ref(`users/${myName}/friends/${friend}`).remove();
  db.ref(`users/${friend}/friends/${myName}`).remove();

  const chatID = getChatID(myName, friend);
  db.ref(`privateChats/${chatID}`).remove();
  db.ref(`unreadChats/${myName}/${chatID}`).remove();

  closePopup();
  loadFriends(myName);
  loadChats(myName);

  showSuccess("Friend deleted.");
}

/* ==================================================
   DELETE CHAT
================================================== */
function deleteChat() {
  if (!currentChatID) return;

  db.ref(`privateChats/${currentChatID}`).remove();
  db.ref(`unreadChats/${myName}/${currentChatID}`).remove();

  showSuccess("Chat deleted.");

  setTimeout(() => {
    switchToGlobalChat(false);
    loadChats(myName);
  }, 2000);
}

/* ==================================================
   POPUP NEXT TO FRIEND
================================================== */
function openPopup(friend, element) {
  const popup = document.getElementById("popupBox");
  const nameLabel = document.getElementById("popupFriendName");

  nameLabel.textContent = friend;

  const rect = element.getBoundingClientRect();
  popup.style.left = rect.right + 10 + "px";
  popup.style.top = rect.top + "px";
  popup.style.display = "flex";

  document.getElementById("popupStartChatBtn").onclick = () => {
    closePopup();
    switchToPrivateChat(friend);
  };

  document.getElementById("popupDeleteFriendBtn").onclick = () => {
    deleteFriend(friend);
  };
}

function closePopup() {
  document.getElementById("popupBox").style.display = "none";
}

/* ==================================================
   LOAD FRIENDS
================================================== */
function loadFriends(username) {
  db.ref(`users/${username}/friends`).on("value", snap => {
    const friends = snap.val() || {};
    const list = document.getElementById("friendsList");
    list.innerHTML = "";

    Object.keys(friends).forEach(friend => {
      const div = document.createElement("div");
      div.className = "friendItem";
      div.textContent = friend;
      div.onclick = () => openPopup(friend, div);
      list.appendChild(div);
    });

    loadChats(username);
  });
}

/* ==================================================
   LOAD CHATS
================================================== */
function loadChats(username) {
  const chatsList = document.getElementById("chatsList");

  Promise.all([
    db.ref(`users/${username}/friends`).get(),
    db.ref(`unreadChats/${username}`).get()
  ]).then(([friendsSnap, unreadSnap]) => {
    const friends = friendsSnap.val() || {};
    const unread = unreadSnap.val() || {};

    chatsList.innerHTML = "";

    Object.keys(friends).forEach(friend => {
      const chatID = getChatID(username, friend);

      db.ref(`privateChats/${chatID}`).get().then(chatSnap => {
        if (!chatSnap.exists()) return;

        const div = document.createElement("div");
        div.className = "chatItem";
        div.id = `chatItem_${friend}`;

        const nameSpan = document.createElement("span");
        nameSpan.textContent = friend;

        const dotSpan = document.createElement("span");
        Object.assign(dotSpan.style, {
          float: "right",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor: unread[chatID] ? "red" : "transparent"
        });

        div.appendChild(nameSpan);
        div.appendChild(dotSpan);
        div.onclick = () => switchToPrivateChat(friend);

        chatsList.appendChild(div);
      });
    });
  });
}

/* ==================================================
   UNREAD DOT LISTENER + FIXED NOTIFICATIONS
================================================== */
db.ref("privateChats").once("value").then(allChatsSnap => {
  const allChats = allChatsSnap.val() || {};

  Object.keys(allChats).forEach(chatID => {
    // Only listen to chats that involve me
    if (!chatID.includes(myName)) return;

    db.ref(`privateChats/${chatID}/messages`).on("child_added", msgSnap => {
      const msg = msgSnap.val();

      if (msg.user !== myName && currentChatID !== chatID) {
        db.ref(`unreadChats/${myName}/${chatID}`).set(true);
        loadChats(myName);

        sendDesktopNotification("ChatterBox", `New message from ${msg.user}: ${msg.text}`);
      }
    });
  });
});

/* --------------------------------------------------
   AUTO DELETE MESSAGES AFTER 1 HOUR
-------------------------------------------------- */
function autoDeleteMessages() {
  const cutoff = Date.now() - 3600000; // 1 hour

  // 1. Delete from existing chats
  db.ref("privateChats").once("value").then(chatsSnap => {
    const chats = chatsSnap.val() || {};

    Object.keys(chats).forEach(chatID => {
      deleteOldMessagesInChat(chatID, cutoff);
    });
  });

  // 2. Delete from new chats
  db.ref("privateChats").on("child_added", chatSnap => {
    const chatID = chatSnap.key;
    deleteOldMessagesInChat(chatID, cutoff);
  });

  // 3. Delete from global chat
  db.ref("messages").once("value").then(msgSnap => {
    const msgs = msgSnap.val() || {};

    Object.keys(msgs).forEach(msgID => {
      if (msgs[msgID].time < cutoff) {
        db.ref("messages/" + msgID).remove();
      }
    });
  });
}

function deleteOldMessagesInChat(chatID, cutoff) {
  db.ref("privateChats/" + chatID + "/messages").once("value").then(msgSnap => {
    const msgs = msgSnap.val() || {};

    Object.keys(msgs).forEach(msgID => {
      if (msgs[msgID].time < cutoff) {
        db.ref("privateChats/" + chatID + "/messages/" + msgID).remove();
      }
    });
  });
}

// Run every minute
setInterval(autoDeleteMessages, 60000);

/* ==================================================
   START
================================================== */
switchToGlobalChat();
loadFriends(myName);

function logout() {
  localStorage.removeItem("username");
  showSuccess("Logged out.");
  setTimeout(() => {
    window.location.href = "auth.html";
  }, 500);
}

function clearChat() {
  const messagesBox = document.getElementById("messages");

  if (currentChatType === "global") {
    db.ref("messages").remove();
    messagesBox.innerHTML = "";
    showSuccess("Chat cleared");
    return;
  }

  if (currentChatID) {
    db.ref(`privateChats/${currentChatID}/messages`).remove();
    messagesBox.innerHTML = "";
    showSuccess("Chat cleared");
  }
}

/* ==================================================
   ENTER KEY SEND
================================================== */
document.getElementById("input").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});
