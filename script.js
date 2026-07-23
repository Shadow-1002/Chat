const db = firebase.database();

function sendMessage() {
  const text = document.getElementById("input").value;

  db.ref("messages").push({
    text: text,
    time: Date.now()
  });

  document.getElementById("input").value = "";
}

db.ref("messages").on("child_added", snapshot => {
  const msg = snapshot.val();

  const div = document.createElement("div");
  div.textContent = msg.text;

  document.getElementById("messages").appendChild(div);
});
