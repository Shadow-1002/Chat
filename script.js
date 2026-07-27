/* ============================
   CHatterBox — REALTIME CHAT
   ============================ */

// Load username + email from login page
let myName = localStorage.getItem("username");
let myEmail = localStorage.getItem("email");

// If user is not logged in, redirect
if (!myName || !myEmail) {
  alert("You must log in first.");
  window.location.href = "auth.html";
}

// Set your admin email here
const ADMIN_EMAIL = "davidmatthewwang@gmail.com";   // <-- CHANGE THIS

// Connect to Realtime Database
const realtimeDB = firebase.database();

/* ============================
   SEND MESSAGE
   ============================ */

function sendMessage() {
  const text = document.getElementById("input").value;
  if (text.trim() === "") return;

  realtimeDB.ref("messages").push({
    text: text,
    user: myName,
    email: myEmail,
    time: Date.now()
  });

  document.getElementById("input").value = "";
}

/* ============================
   DISPLAY MESSAGES
   ============================ */

realtimeDB.ref("messages").on("child_added", snapshot => {
  const msg = snapshot.val();

  const div = document.createElement("div");
  div.classList.add("bubble");

  // Username label
  const nameSpan = document.createElement("div");
  nameSpan.style.fontSize = "40px";
  nameSpan.style.marginBottom = "4px";
  nameSpan.style.opacity = "0.7";
  nameSpan.textContent = msg.user || "Unknown";

  const textSpan = document.createElement("div");
  textSpan.textContent = msg.text;

  div.appendChild(nameSpan);
  div.appendChild(textSpan);

  // Bubble color based on sender
  if (msg.user === myName) {
    div.classList.add("me");
  } else {
    div.classList.add("other");
  }

  // ADMIN ONLY: click bubble to reveal email
  div.onclick = () => {
    if (myEmail === ADMIN_EMAIL) {
      alert("Email: " + msg.email);
    }
  };

  document.getElementById("messages").appendChild(div);

  // Auto-scroll
  const box = document.getElementById("messages");
  box.scrollTop = box.scrollHeight;
});

/* ============================
   ENTER KEY SENDS MESSAGE
   ============================ */

document.getElementById("input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});

/* ============================
   AUTO DELETE OLD MESSAGES
   ============================ */

setInterval(() => {
  const cutoff = Date.now() - 3600000; // 1 hour

  realtimeDB.ref("messages").once("value", snapshot => {
    snapshot.forEach(child => {
      if (child.val().time < cutoff) {
        realtimeDB.ref("messages/" + child.key).remove();
      }
    });
  });
}, 60000);
