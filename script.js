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
