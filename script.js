const db = firebase.database();

function sendMessage() {
  const text = document.getElementById("input").value;
  if (text.trim() === "") return;

  db.ref("messages").push({
    text: "ME: " + text,
    time: Date.now()
  });

  document.getElementById("input").value = "";
}

db.ref("messages").on("child_added", snapshot => {
  const msg = snapshot.val();

  const div = document.createElement("div");
  div.classList.add("bubble");

  if (msg.text.startsWith("ME: ")) {
    div.classList.add("me");
    div.textContent = msg.text.replace("ME: ", "");
  } else {
    div.classList.add("other");
    div.textContent = msg.text;
  }

  document.getElementById("messages").appendChild(div);
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

  db.ref("messages").once("value", snapshot => {
    snapshot.forEach(child => {
      if (child.val().time < cutoff) {
        db.ref("messages/" + child.key).remove();
      }
    });
  });
}, 60000);
