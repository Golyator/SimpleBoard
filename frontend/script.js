let nickname = "";
let messageContainer = document.getElementById("messages");
loadMessages();
setInterval(loadMessages, 2000);

// Nickname setzen
function setNickname() {
  nickname = document.getElementById("nickname").value.trim();
  if (!nickname) return showError("Bitte gib einen Nickname ein!");
  fetch("/api/set-nickname", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  })
    .then((res) => res.json())
    .then(() => {
      document.getElementById("nickname-form").style.display = "none";
      document.getElementById("message-form").style.display = "flex";
      loadMessages();
      // Automatische Aktualisierung alle 2 Sekunden
      setInterval(loadMessages, 2000);
    })
    .catch(() => showError("Fehler beim Setzen des Nicknames!"));
}

// Nachricht senden
function sendMessage() {
  const messageInput = document.getElementById("message");
  const message = messageInput.value.trim();
  if (!message) return showError("Bitte gib eine Nachricht ein!");
  fetch("/api/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  })
    .then(() => {
      messageInput.value = "";
      loadMessages();
    })
    .catch(() => showError("Fehler beim Senden der Nachricht!"));
}

// Nachrichten laden
function loadMessages() {
  fetch("/api/get-messages")
    .then((res) => res.json())
    .then((messages) => {
      messageContainer.innerHTML = messages
        .map(
          (msg) => `
          <div class="message">
            <strong>${escapeHtml(msg.nickname)}</strong>
            <p>${escapeHtml(msg.message)}</p>
            <small>${new Date(msg.timestamp).toLocaleString()}</small>
          </div>
        `,
        )
        .join("");
    })
    .catch(() => showError("Fehler beim Laden der Nachrichten!"));
}

// Fehler anzeigen
function showError(message) {
  let errorElement = document.querySelector(".error");
  if (!errorElement) {
    errorElement = document.createElement("div");
    errorElement.className = "error";
    document.querySelector(".container").prepend(errorElement);
  }
  errorElement.textContent = message;
}

// HTML escapen (XSS-Schutz)
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
