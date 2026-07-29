// Username-only login system
let myName = localStorage.getItem("username");

// If not logged in → go to login page
if (!myName) {
  window.location.href = "auth.html";
}

const realtimeDB = firebase.database();

// SEND MESSAGE
function sendMessage() {
  const text = document.getElementById("input").value;
  if (text.trim() === "") return;

  realtimeDB.ref("messages").push({
    text: text,
    user: myName,
    time: Date.now()
  });

  document.getElementById("input").value = "";
}

// DISPLAY MESSAGES
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

// ENTER KEY SENDS MESSAGE
document.getElementById("input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// AUTO DELETE MESSAGES AFTER 1 HOUR
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

function logout() {
  localStorage.removeItem("username");
  window.location.href = "auth.html";
}

function clearChat() {
  if (confirm("Clear all messages?")) {
    firebase.database().ref("messages").remove();
  }
}
