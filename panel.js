let channelId = null;  // if you want to set it from somewhere, or hardcode
let username = null;
let userId = null;

const input = document.getElementById('input');
const submitBtn = document.getElementById('submit');
const messages = document.getElementById('messages');

const token = sessionStorage.getItem("twitchAccessToken");  // Load token once

if (!token) {
  addMessage("Bot: You must log in first.", 'bot');
  submitBtn.disabled = true;
} else {
  // Fetch user info from Twitch API to get username and userId
  fetch("https://api.twitch.tv/helix/users", {
    headers: {
      "Authorization": "Bearer " + token,
      "Client-Id": "1ukz04k3le4774ykaxyd3pxxjkx1c5"  // replace with your client ID
    }
  })
  .then(res => {
    if (!res.ok) throw new Error(`Failed to fetch user info: ${res.status}`);
    return res.json();
  })
  .then(data => {
    if (data.data && data.data.length > 0) {
      const user = data.data[0];
      username = user.login;
      userId = user.id;
      channelId = user.id;  // or wherever your channel ID comes from

      addMessage(`Bot: Logged in as ${username}`, 'bot');
    } else {
      addMessage("Bot: Could not get user info.", 'bot');
      submitBtn.disabled = true;
    }
  })
  .catch(err => {
    console.error(err);
    addMessage("Bot: Error getting user info.", 'bot');
    submitBtn.disabled = true;
  });
}

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
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        answer,
        userId,
        username,
        channelId
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
