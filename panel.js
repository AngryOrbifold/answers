let channelId = null;
let username = null;
let userId = null;

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

window.addEventListener('message', (event) => {
  // Optionally check event.origin here for security
  // const allowedOrigin = 'https://your-wix-site.com';
  // if (event.origin !== allowedOrigin) return;

  console.log("🔔 Iframe received message:", event.data);
  const data = event.data;
  if (data?.type === 'twitch-token' && data.token) {
    sessionStorage.setItem('twitchAccessToken', data.token);
    console.log("✅ Token saved:", data.token);
    initApp();
  }
});

window.onload = () => {
  console.log("Iframe loaded, sending ready message");
  window.parent.postMessage({ type: 'iframe-ready' }, '*');
};

function initApp() {
  const token = sessionStorage.getItem('twitchAccessToken');
  console.log("initApp token:", token);
  if (!token) {
    addMessage("Bot: You must log in first.", 'bot');
    submitBtn.disabled = true;
    return;
  }

  fetch("https://api.twitch.tv/helix/users", {
    headers: {
      "Authorization": "Bearer " + token,
      "Client-Id": "1ukz04k3le4774ykaxyd3pxxjkx1c5"  // replace with your client ID
    }
  })
  .then(res => {
    console.log("User info fetch status:", res.status);
    if (!res.ok) throw new Error(`Failed to fetch user info: ${res.status}`);
    return res.json();
  })
  .then(data => {
    console.log("User info response data:", data);
    if (data.data && data.data.length > 0) {
      const user = data.data[0];
      username = user.login;
      userId = user.id;
      channelId = user.id;  // or your channel ID logic

      addMessage(`Bot: Logged in as ${username}`, 'bot');
      submitBtn.disabled = false;
    } else {
      addMessage("Bot: Could not get user info.", 'bot');
      submitBtn.disabled = true;
    }
  })
  .catch(err => {
    console.error("Error fetching user info:", err);
    addMessage("Bot: Error getting user info.", 'bot');
    submitBtn.disabled = true;
  });
}

async function sendAnswer() {
  const token = sessionStorage.getItem("twitchAccessToken");
  if (!token) {
    addMessage("Bot: You must log in first.", 'bot');
    return;
  }

  const answer = input.value.trim();
  if (!answer) return;

  addMessage(`You: ${answer}`, 'user');
  input.value = '';
  submitBtn.disabled = true;

  try {
    const res = await fetch('https://twitch-extension-backend.onrender.com/submit-answer', {
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
