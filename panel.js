// Core state
let channelId = null;
let username = null;
let userId = null;

// DOM elements
const input = document.getElementById('input');
const submitBtn = document.getElementById('submit');
const messages = document.getElementById('messages');
const canvas = document.getElementById('drawCanvas');
const eraseBtn = document.getElementById('eraseAll');
const lineWidthInput = document.getElementById('lineWidth');
const lineWidthValue = document.getElementById('lineWidthValue');
const shapeTool = document.getElementById('shapeTool');

// Canvas setup
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

eraseBtn.addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  shapes = [];
  undone = [];
});

canvas.addEventListener('mousedown', (e) => {
  const pos = getMousePos(e);
  const x = Math.floor(pos.x);
  const y = Math.floor(pos.y);

  if (e.button === 2) {
    e.preventDefault();
    floodFill(x, y);
    return;
  }

  drawing = true;
  startX = x;
  startY = y;
});

canvas.addEventListener('mousemove', e => {
  if (!drawing) return;
  const pos = getMousePos(e);
  previewShape = {
    type: shapeTool.value,
    x1: startX,
    y1: startY,
    x2: pos.x,
    y2: pos.y,
    fill: false,
    lineWidth: parseInt(lineWidthInput.value),
    preview: true
  };
  redrawCanvas();
});

canvas.addEventListener('mouseup', e => {
  if (!drawing) return;
  drawing = false;
  const pos = getMousePos(e);
  shapes.push({
    type: shapeTool.value,
    x1: startX,
    y1: startY,
    x2: pos.x,
    y2: pos.y,
    fill: e.button === 2,
    lineWidth: parseInt(lineWidthInput.value)
  });
  previewShape = null;
  undone = [];
  redrawCanvas();
});

function floodFill(x, y, fillColor = [0, 0, 0, 255], tolerance = 180) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  const stack = [[x, y]];
  const baseIdx = (y * width + x) * 4;
  const targetColor = data.slice(baseIdx, baseIdx + 4);

  const matchColor = (i) => {
    for (let j = 0; j < 4; j++) {
      if (Math.abs(data[i + j] - targetColor[j]) > tolerance) return false;
    }
    return true;
  };

  const setColor = (i) => {
    for (let j = 0; j < 4; j++) {
      data[i + j] = fillColor[j];
    }
  };
  const visited = new Uint8Array(width * height);
  while (stack.length) {
    const [cx, cy] = stack.pop();
    const idx = cy * width + cx;
    if (visited[idx]) continue;
    visited[idx] = 1;
    const i = idx * 4;
    if (!matchColor(i)) continue;
    setColor(i);
    if (cx > 0) stack.push([cx - 1, cy]);
    if (cx < width - 1) stack.push([cx + 1, cy]);
    if (cy > 0) stack.push([cx, cy - 1]);
    if (cy < height - 1) stack.push([cx, cy + 1]);
  }

  ctx.putImageData(imageData, 0, 0);
  shapes.push({ type: 'fill', imageData });
  redrawCanvas();
}


function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  shapes.forEach(shape => drawShape(shape));
  if (previewShape) drawShape(previewShape);
}

function drawShape(shape) {
  if (shape.type === 'fill') return ctx.putImageData(shape.imageData, 0, 0);

  const { type, x1, y1, x2, y2, fill, lineWidth, preview } = shape;
  const color = preview ? '#999' : '#000';
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();

  const w = x2 - x1, h = y2 - y1;
  const centerX = x1 + w / 2;
  const centerY = y1 + h / 2;

  switch (type) {
    case 'line':
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      break;
    case 'rectangle':
      return fill ? ctx.fillRect(x1, y1, w, h) : ctx.strokeRect(x1, y1, w, h);
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
  ctx.moveTo(cx + radius * Math.cos(rotation), cy + radius * Math.sin(rotation));
  for (let i = 1; i <= sides; i++) {
    ctx.lineTo(cx + radius * Math.cos(i * angle + rotation), cy + radius * Math.sin(i * angle + rotation));
  }
  ctx.closePath();
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'z') {
    if (shapes.length > 0) undone.push(shapes.pop());
    redrawCanvas();
  } else if (e.ctrlKey && e.key === 'y') {
    if (undone.length > 0) shapes.push(undone.pop());
    redrawCanvas();
  }
});

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
      "Client-Id": "1ukz04k3le4774ykaxyd3pxxjkx1c5"
    }
  })
    .then(res => {
      if (!res.ok) throw new Error(`Failed to fetch user info: ${res.status}`);
      return res.json();
    })
    .then(data => {
      const user = data.data?.[0];
      if (user) {
        username = user.login;
        userId = user.id;
        channelId = user.id;
        addMessage(`Bot: Logged in as ${username}`, 'bot');
        submitBtn.disabled = false;
      } else {
        throw new Error("No user data returned.");
      }
    })
    .catch(err => {
      console.error("User info error:", err);
      addMessage("Bot: Error getting user info.", 'bot');
      submitBtn.disabled = true;
    });
}

submitBtn.addEventListener('click', sendAnswer);

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

  // Check if answer is exactly like "ID <number>"
  const exactIdMatch = answer.match(/^ID\s+(\d+)$/i);
  const idNumber = exactIdMatch ? exactIdMatch[1] : null;
  try {
    let payload = {
      answer,
      userId,     // make sure these are set properly in your script
      username,
      channelId
    };
    // If answer matches "ID number" and canvas is not blank,
    // add the base64 image to the payload
    if (idNumber && !isCanvasBlank(canvas)) {
      const ctx = canvas.getContext("2d");
    
      // Save the current drawing (as image data)
      const drawing = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
      // Fill the canvas with white
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    
      // Redraw the drawing on top
      ctx.putImageData(drawing, 0, 0);
    
      // Export to base64 PNG string
      const dataUrl = canvas.toDataURL('image/png');
      const base64Image = dataUrl.split(',')[1];
      payload.image = base64Image;
    }
    const res = await fetch('https://twitch-extension-backend.onrender.com/submit-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(payload),
      mode: 'cors',
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
    const data = JSON.parse(text);
    addMessage(data.reply || "Bot: No reply received from server.", 'bot');
    if (idNumber) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      shapes = [];
      undone = [];
    }
  } catch (err) {
    console.error("Request error:", err);
    addMessage("Bot: Error sending your answer.", 'bot');
  } finally {
    submitBtn.disabled = false;
    input.focus();
  }
}

function isCanvasBlank(canvas) {
  const blank = document.createElement('canvas');
  blank.width = canvas.width;
  blank.height = canvas.height;
  return canvas.toDataURL() === blank.toDataURL();
}
