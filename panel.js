let channelId = null;
let username = null;
let userId = null;
let token = null;  // Global token variable

const input = document.getElementById('input');
const submitBtn = document.getElementById('submit');
const messages = document.getElementById('messages');

function addMessage(text, sender = 'bot') {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.color = sender === 'user' ? '#333' : '#007bff';
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

async function sendAnswer() {
  const answer = input.value.trim();
  if (!answer) return;

  addMessage(`You: ${answer}`, 'user');
  input.value = '';
  submitBtn.disabled = true;

  try {
    const res = await fetch('https://your-backend/submit-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + oauthAccessToken  // <-- Twitch OAuth token
      },
      body: JSON.stringify({
        answer,
        userId,   // optional, can also be read from token on backend
        username  // optional, same here
      }),
      mode: 'cors',
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);

    const data = JSON.parse(text);
    addMessage(data.reply || "Bot: No reply received from server.", 'bot');

  } catch (err) {
    console.error("Request error:", err);
    addMessage("Bot: Error sending your answer.", 'bot');
  } finally {
    submitBtn.disabled = false;
    input.focus();
  }
}

submitBtn.onclick = sendAnswer;

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    console.error("Failed to decode JWT", e);
    return null;
  }
}

Twitch.ext.onContext((context, changed) => {
  console.log("Extension context changed", context, changed);
});

Twitch.ext.onVisibilityChanged = function(visible, context) {
  console.log("Panel visibility changed", visible);
};

window.Twitch.ext.onAuthorized(auth => {
  token = auth.token;  // Store token globally
  const payload = parseJwt(token);

  channelId = payload.channel_id;
  userId = payload.user_id;  // this will be available only if user has granted permission

  console.log("JWT payload:", payload);
  console.log("userId:", userId);
  console.log("Sending token:", token);
});
