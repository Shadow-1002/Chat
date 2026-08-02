let myName = localStorage.getItem("username");
if (!myName) window.location.href = "auth.html";

const db = firebase.database();

/* --------------------------------------------------
   STATE
-------------------------------------------------- */
let currentChatType = "global";
let currentChatFriend = null;
let currentChatID = null;
let privateMessagesRef = null;

/* --------------------------------------------------
   UTIL
-------------------------------------------------- */
function getChatID(a, b) {
  return [a, b].sort().join("_");
}

/* --------------------------------------------------
   GLOBAL CHAT
-------------------------------------------------- */
function switchToGlobalChat() {
  currentChatType = "global";
  currentChatFriend = null;
  currentChatID = null;

  // Remove highlight from chats
  document.querySelectorAll(".chatItem").forEach(i => i.classList.remove("activeChat"));

  // Highlight global chat button
  document.getElementById("globalChatBtn").classList.add("activeChat");

  // Clear messages
  document.getElementById("messages").innerHTML = "";

  // Remove private listener
  if (privateMessagesRef) privateMessagesRef.off();

  // Listen to global messages
  db.ref("messages").off();
  db.ref("messages").on("child_added", snap => {
    const msg = snap.val();
    renderMessage(msg.user, msg.text);
  });

  // Hide delete chat button
  document.getElementById("deleteChatSidebarBtn").style.display = "none";
}

/* --------------------------------------------------
   PRIVATE CHAT
-------------------------------------------------- */
function switchToPrivateChat(friend) {
  currentChatType = "private";
  currentChatFriend = friend;
  currentChatID = getChatID(myName, friend);

  // CREATE CHAT NODE IF IT DOESN'T EXIST
  db.ref("privateChats/" + currentChatID).get().then(snap => {
    if (!snap.exists()) {
      db.ref("privateChats/" + currentChatID).set({
        createdAt: Date.now()
      });
    }

    // Remove highlight from global chat
    document.getElementById("globalChatBtn").classList.remove("activeChat");

    // Highlight selected chat
    document.querySelectorAll(".chatItem").forEach(i => i.classList.remove("activeChat"));
    const chatItem = document.getElementById("chatItem_" + friend);
    if (chatItem) chatItem.classList.add("activeChat");

    // Clear messages
    document.getElementById("messages").innerHTML = "";

    // Remove global listener
    db.ref("messages").off();

    // Remove previous private listener
    if (privateMessagesRef) privateMessagesRef.off();

    // Listen to private chat
    privateMessagesRef = db.ref("privateChats/" + currentChatID + "/messages");
    privateMessagesRef.on("child_added", snap => {
      const msg = snap.val();
      renderMessage(msg.user, msg.text);
    });

    // Clear unread dot
    db.ref("unreadChats/" + myName + "/" + currentChatID).remove();

    // Show delete chat button
    document.getElementById("deleteChatSidebarBtn").style.display = "block";

    // REFRESH CHATS SO NEW CHAT APPEARS
    loadChats(myName);
  });
}

/* --------------------------------------------------
   RENDER MESSAGE
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

  if (user === myName) div.classList.add("me");
  else div.classList.add("other");

  const box = document.getElementById("messages");
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

/* --------------------------------------------------
   SEND MESSAGE
-------------------------------------------------- */
function sendMessage() {
  const text = document.getElementById("input").value.trim();
  if (!text) return;

  const msg = {
    text,
    user: myName,
    time: Date.now()
  };

  if (currentChatType === "global") {
    db.ref("messages").push(msg);
  } else {
    db.ref("privateChats/" + currentChatID + "/messages").push(msg);
  }

  document.getElementById("input").value = "";
}

/* ENTER KEY SENDS MESSAGE */
document.getElementById("input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") sendMessage();
});

/* --------------------------------------------------
   FRIEND SYSTEM
-------------------------------------------------- */
async function searchUser(username) {
  const snap = await db.ref("users/" + username).get();
  return snap.exists();
}

async function addFriend(myUsername, friendUsername) {
  if (!friendUsername) return alert("Enter a username.");
  if (myUsername === friendUsername) return alert("You can't add yourself.");

  const exists = await searchUser(friendUsername);
  if (!exists) return alert("User not found.");

  await db.ref("users/" + myUsername + "/friends/" + friendUsername).set(true);
  await db.ref("users/" + friendUsername + "/friends/" + myUsername).set(true);

  loadFriends(myName);
}

/* --------------------------------------------------
   DELETE FRIEND
-------------------------------------------------- */
function deleteFriend(friend) {
  db.ref("users/" + myName + "/friends/" + friend).remove();
  db.ref("users/" + friend + "/friends/" + myName).remove();

  // Delete chat if exists
  const chatID = getChatID(myName, friend);
  db.ref("privateChats/" + chatID).remove();
  db.ref("unreadChats/" + myName + "/" + chatID).remove();

  closePopup();
  loadFriends(myName);
  loadChats(myName);
}

/* --------------------------------------------------
   DELETE CHAT
-------------------------------------------------- */
function deleteChat() {
  if (!currentChatID) return;

  db.ref("privateChats/" + currentChatID).remove();
  db.ref("unreadChats/" + myName + "/" + currentChatID).remove();

  switchToGlobalChat();
  loadChats(myName);
}

/* --------------------------------------------------
   POPUP NEXT TO FRIEND
-------------------------------------------------- */
function openPopup(friend, element) {
  const popup = document.getElementById("popupBox");
  const nameLabel = document.getElementById("popupFriendName");

  nameLabel.textContent = friend;

  // Position popup next to friend item
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

/* --------------------------------------------------
   LOAD FRIENDS
-------------------------------------------------- */
function loadFriends(username) {
  db.ref("users/" + username + "/friends").on("value", snap => {
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

/* --------------------------------------------------
   LOAD CHATS
-------------------------------------------------- */
function loadChats(username) {
  const chatsList = document.getElementById("chatsList");

  Promise.all([
    db.ref("users/" + username + "/friends").get(),
    db.ref("unreadChats/" + username).get()
  ]).then(([friendsSnap, unreadSnap]) => {
    const friends = friendsSnap.val() || {};
    const unread = unreadSnap.val() || {};

    chatsList.innerHTML = "";

    Object.keys(friends).forEach(friend => {
      const chatID = getChatID(username, friend);

      // Only show chat if it exists
      db.ref("privateChats/" + chatID).get().then(chatSnap => {
        if (!chatSnap.exists()) return;

        const div = document.createElement("div");
        div.className = "chatItem";
        div.id = "chatItem_" + friend;

        const nameSpan = document.createElement("span");
        nameSpan.textContent = friend;

        const dotSpan = document.createElement("span");
        dotSpan.style.float = "right";
        dotSpan.style.width = "10px";
        dotSpan.style.height = "10px";
        dotSpan.style.borderRadius = "50%";
        dotSpan.style.backgroundColor = unread[chatID] ? "red" : "transparent";

        div.appendChild(nameSpan);
        div.appendChild(dotSpan);

        div.onclick = () => switchToPrivateChat(friend);

        chatsList.appendChild(div);
      });
    });
  });
}

/* --------------------------------------------------
   UNREAD DOT LISTENER
-------------------------------------------------- */
db.ref("privateChats").on("child_added", chatSnap => {
  const chatID = chatSnap.key;

  db.ref("privateChats/" + chatID + "/messages").on("child_added", msgSnap => {
    const msg = msgSnap.val();

    if (msg.user !== myName && currentChatID !== chatID) {
      db.ref("unreadChats/" + myName + "/" + chatID).set(true);
      loadChats(myName);
    }
  });
});

/* --------------------------------------------------
   START
-------------------------------------------------- */
switchToGlobalChat();
loadFriends(myName);
