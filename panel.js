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

function sendAnswer() {
  const answer = input.value.trim();
  if (!answer) return;

  addMessage(`You: ${answer}`, 'user');
  input.value = '';
  submitBtn.disabled = true;

  console.log("Sending:", {
    answer,
    channelId,
    username,
    userId
  });
 
  fetch('https://twitch-extension-backend.onrender.com/submit-answer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      answer,
      channelId,
      userId
    }),
    mode: 'cors', // optional, default
  })
  .then(async res => {
    const contentType = res.headers.get("content-type");
    const text = await res.text();  // read raw response
    console.log("Raw response text:", text);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${text}`);
    }

    try {
      const data = JSON.parse(text);
      if (data.reply) {
        addMessage(`Bot: ${data.reply}`, 'bot');
      } else {
        addMessage("Bot: No reply received from server.", 'bot');
      }
    } catch (err) {
      console.error("Failed to parse JSON:", err);
      addMessage("Bot: Invalid JSON received from server.", 'bot');
    }
  })
  .catch(err => {
    console.error("Request error:", err);
    addMessage("Bot: Error sending your answer.", 'bot');
  })
  .finally(() => {
    submitBtn.disabled = false;
    input.focus();
  });
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
