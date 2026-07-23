const db = firebase.database();
function sendMessage() {
  const text = document.getElementById("input").value;

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

  // If the message is yours
  if (msg.text.startsWith("ME: ")) {
    div.classList.add("me");
    div.textContent = msg.text.replace("ME: ", "");
  } else {
    div.classList.add("other");
    div.textContent = msg.text;
  }

  document.getElementById("messages").appendChild(div);
});

