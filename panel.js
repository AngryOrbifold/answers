let channelId = null;
let username = null;
let userId = null;

const input = document.getElementById('input');
const submitBtn = document.getElementById('submit');
const messages = document.getElementById('messages');

const canvas = document.getElementById('drawCanvas');
const eraseBtn = document.getElementById('eraseAll');
const lineWidthInput = document.getElementById('lineWidth');
const lineWidthValue = document.getElementById('lineWidthValue');

const ctx = canvas.getContext('2d');
const scale = window.devicePixelRatio || 1;
canvas.width = canvas.offsetWidth * scale;
canvas.height = canvas.offsetHeight * scale;
ctx.scale(scale, scale);

let drawing = false;
let startX = 0;
let startY = 0;
let shapes = [];
let undone = [];
let previewShape = null;

canvas.addEventListener('contextmenu', e => e.preventDefault());

lineWidthInput.addEventListener('input', () => {
  lineWidthValue.textContent = lineWidthInput.value;
});

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

// Erase all canvas
eraseBtn.addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  shapes = [];
  undone = []
  drawHistory.length = 0; // Clear undo stack if you're tracking it
});

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
  const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
  if (e.button === 2) {
    // Right click → Fill
    e.preventDefault();
    floodFill(x, y);
    return;
  }
  // Left click → Start drawing
  drawing = true;
  startX = x;
  startY = y;
});

canvas.addEventListener('mousemove', e => {
  if (!drawing) return;
  const pos = getMousePos(e);
  previewShape = {
    type: document.getElementById('shapeTool').value,
    x1: startX,
    y1: startY,
    x2: pos.x,
    y2: pos.y,
    fill: false,
    lineWidth: parseInt(document.getElementById('lineWidth').value),
    preview: true
  };
  redrawCanvas();
});

canvas.addEventListener('mouseup', e => {
  if (!drawing) return;
  drawing = false;
  const pos = getMousePos(e);
  const shape = {
    type: document.getElementById('shapeTool').value,
    x1: startX,
    y1: startY,
    x2: pos.x,
    y2: pos.y,
    fill: e.button === 2,
    lineWidth: parseInt(document.getElementById('lineWidth').value)
  };
  shapes.push(shape);
  previewShape = null;
  undone = [];
  redrawCanvas();
});

//fill region
function floodFill(x, y, fillColor = [0, 0, 0, 255]) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;

  const stack = [[x, y]];
  const baseIdx = (y * width + x) * 4;
  const targetColor = data.slice(baseIdx, baseIdx + 4);

  const matchColor = (i) =>
    data[i] === targetColor[0] &&
    data[i + 1] === targetColor[1] &&
    data[i + 2] === targetColor[2] &&
    data[i + 3] === targetColor[3];

  const setColor = (i) => {
    data[i]     = fillColor[0];
    data[i + 1] = fillColor[1];
    data[i + 2] = fillColor[2];
    data[i + 3] = fillColor[3];
  };

  while (stack.length) {
    const [cx, cy] = stack.pop();
    const i = (cy * width + cx) * 4;
    if (!matchColor(i)) continue;

    setColor(i);
    if (cx > 0) stack.push([cx - 1, cy]);
    if (cx < width - 1) stack.push([cx + 1, cy]);
    if (cy > 0) stack.push([cx, cy - 1]);
    if (cy < canvas.height - 1) stack.push([cx, cy + 1]);
  }

  // Save the filled image as a special shape
  shapes.push({
    type: 'fill',
    imageData: imageData
  });

  redrawCanvas(); // <- re-render everything including this new fill
}

// Redraw everything
function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  shapes.forEach(shape => drawShape(shape));
  if (previewShape) drawShape(previewShape);
}

function drawShape(shape) {
  if (shape.type === 'fill') {
    ctx.putImageData(shape.imageData, 0, 0);
    return;
  }

  const { type, x1, y1, x2, y2, fill, lineWidth, preview } = shape;
  const color = preview ? '#999' : '#000';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  const w = x2 - x1;
  const h = y2 - y1;
  const centerX = x1 + w / 2;
  const centerY = y1 + h / 2;

  switch (type) {
    case 'line':
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      break;

    case 'rectangle':
      if (fill) ctx.fillRect(x1, y1, w, h);
      else ctx.strokeRect(x1, y1, w, h);
      return;

    case 'pentagon':
      drawPolygon(centerX, centerY, Math.min(Math.abs(w), Math.abs(h)) / 2, 5, -Math.PI / 2);
      break;

    case 'hexagon':
      drawPolygon(centerX, centerY, Math.min(Math.abs(w), Math.abs(h)) / 2, 6);
      break;

    case 'rhombus':
      ctx.moveTo(centerX, y1);
      ctx.lineTo(x2, centerY);
      ctx.lineTo(centerX, y2);
      ctx.lineTo(x1, centerY);
      ctx.closePath();
      break;

    case 'oval':
      ctx.ellipse(centerX, centerY, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, 2 * Math.PI);
      break;

    default:
      return;
  }

  fill ? ctx.fill() : ctx.stroke();
}

function drawPolygon(cx, cy, radius, sides, rotation = 0) {
  if (sides < 3) return;
  const angle = (2 * Math.PI) / sides;
  ctx.moveTo(
    cx + radius * Math.cos(rotation),
    cy + radius * Math.sin(rotation)
  );
  for (let i = 1; i <= sides; i++) {
    ctx.lineTo(
      cx + radius * Math.cos(i * angle + rotation),
      cy + radius * Math.sin(i * angle + rotation)
    );
  }
  ctx.closePath();
}

// Add redo function
function redo() {
  if (undone.length === 0) return;
  shapes.push(undone.pop());
  redrawCanvas();
}

// Optional: Redo logic
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'z') {
    if (shapes.length > 0) undone.push(shapes.pop());
    redrawCanvas();
  } else if (e.ctrlKey && e.key === 'y') {
    if (undone.length > 0) shapes.push(undone.pop());
    redrawCanvas();
  }
});

// OTHER CODE NOT RELATED TO DRAWING

function addMessage(text, sender = 'bot') {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.color = sender === 'user' ? '#333' : '#007bff';
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

window.addEventListener('load', () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  if (accessToken) {
    sessionStorage.setItem('twitchAccessToken', accessToken);
    history.replaceState(null, '', window.location.pathname);
  }
  initApp();
});

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

  // Check for exact pattern: "ID <number>"
  const exactIdMatch = answer.match(/^ID\s+(\d+)$/i);
  const idNumber = exactIdMatch ? exactIdMatch[1] : null;

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

    // Then: send image if ID was mentioned
    if (idNumber && !isCanvasBlank(canvas)) {
      await sendCanvasToBackend(idNumber);
    }

  } catch (err) {
    console.error("Request error:", err);
    addMessage("Bot: Error sending your answer.", 'bot');
  } finally {
    submitBtn.disabled = false;
    input.focus();
  }
}

submitBtn.addEventListener('click', sendAnswer);

function isCanvasBlank(canvas) {
  const blank = document.createElement('canvas');
  blank.width = canvas.width;
  blank.height = canvas.height;
  return canvas.toDataURL() === blank.toDataURL();
}

function sendCanvasToBackend(id) {
  return new Promise((resolve, reject) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const value = avg > 127 ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = value;
    }

    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob(blob => {
      if (!blob) return reject("Blob generation failed");

      const formData = new FormData();
      formData.append('image', blob, `canvas_id${id}.jpg`);
      formData.append('id', id);

      fetch(`https://twitch-extension-backend.onrender.com/upload-image`, {
        method: 'POST',
        body: formData
      })
      .then(res => res.text())
      .then(text => {
        console.log("Upload response:", text);
        addMessage("Bot: Drawing sent with ID " + id, 'bot');
        resolve();
      })
      .catch(err => {
        console.error("Upload error:", err);
        addMessage("Bot: Error sending image.", 'bot');
        reject(err);
      });

    }, 'image/jpeg', 0.95);
  });
}
