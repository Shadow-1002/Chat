// Username-only login system
let myName = localStorage.getItem("username");

// If not logged in → go to login page
if (!myName) {
  window.location.href = "auth.html";
}

const realtimeDB = firebase.database();

/* --------------------------------------------------
   MARK USER ACTIVE WHEN OPENING CHATTERBOX
-------------------------------------------------- */
firebase.database().ref("users/" + myName + "/lastActive").set(Date.now());

/* --------------------------------------------------
   SEND MESSAGE (GLOBAL CHAT)
-------------------------------------------------- */
function sendMessage() {
  const text = document.getElementById("input").value;
  if (text.trim() === "") return;

  // Update lastActive when sending a message
  firebase.database().ref("users/" + myName + "/lastActive").set(Date.now());

  realtimeDB.ref("messages").push({
    text: text,
    user: myName,
    time: Date.now()
  });

  document.getElementById("input").value = "";
}

/* --------------------------------------------------
   DISPLAY MESSAGES
-------------------------------------------------- */
realtimeDB.ref("messages").on("child_added", snapshot => {
  const msg = snapshot.val();

  const div = document.createElement("div");
  div.classList.add("bubble");

  const nameTag = document.createElement("div");
  nameTag.style.fontSize = "22px";
  nameTag.style.opacity = "0.7";
  nameTag.style.marginBottom = "4px";
  nameTag.textContent = msg.user;

  const textTag = document.createElement("div");
  textTag.textContent = msg.text;

  div.appendChild(nameTag);
  div.appendChild(textTag);

  if (msg.user === myName) {
    div.classList.add("me");
  } else {
    div.classList.add("other");
  }

  document.getElementById("messages").appendChild(div);

  const box = document.getElementById("messages");
  box.scrollTop = box.scrollHeight;
});

/* --------------------------------------------------
   ENTER KEY SENDS MESSAGE
-------------------------------------------------- */
document.getElementById("input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});

/* --------------------------------------------------
   AUTO DELETE MESSAGES AFTER 1 HOUR
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
   CLEAR CHAT
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

// Load friends into sidebar
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

        div.onclick = () => {
          alert("Clicked friend: " + friend);
        };

        list.appendChild(div);
      });
    });
}

// Load friend list on page load
loadFriends(myName);

/* --------------------------------------------------
   AUTO-DELETE INACTIVE ACCOUNTS (30 DAYS)
-------------------------------------------------- */
setInterval(() => {
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days

  firebase.database().ref("users").once("value", snap => {
    snap.forEach(child => {
      const user = child.val();

      if (user.lastActive && user.lastActive < cutoff) {
        firebase.database().ref("users/" + child.key).remove();
      }
    });
  });
}, 3600000); // runs every hour
