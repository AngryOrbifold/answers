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
const matrixSizeInput = document.getElementById('matrixSize');
const matrixSizeValue = document.getElementById('matrixSizeValue');


const ctx = canvas.getContext('2d');
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

matrixSizeInput.addEventListener('input', () => {
  matrixSizeValue.textContent = matrixSizeInput.value;
});

// Resize and scale the canvas to match CSS size × devicePixelRatio
function resizeCanvas() {
  const scale = window.devicePixelRatio || 1;
  const rect  = canvas.getBoundingClientRect();
  canvas.width  = rect.width  * scale;
  canvas.height = rect.height * scale;
  // Reset any transforms, then scale drawing context
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(scale, scale);
  redrawCanvas();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Get both CSS coords and physical (backing-pixel) coords
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const cssY = e.clientY - rect.top;
  const scale = window.devicePixelRatio || 1;
  return {
    x: cssX,
    y: cssY,
    physX: Math.floor(cssX * scale),
    physY: Math.floor(cssY * scale)
  };
}

// Clear all
eraseBtn.addEventListener('click', () => {
  shapes = [];
  undone = [];
  redrawCanvas();
});

// Begin drawing or flooding
canvas.addEventListener('mousedown', e => {
  const { x, y, physX, physY } = getMousePos(e);
  if (e.button === 2) {
    // Right-click → flood fill
    floodFill(physX, physY);
    return;
  }
  // Left-click → start drawing
  drawing = true;
  startX = x;
  startY = y;
});

// Preview on move
canvas.addEventListener('mousemove', e => {
  if (!drawing) return;
  const { x, y } = getMousePos(e);
  previewShape = {
    type:      shapeTool.value,
    x1:        startX,
    y1:        startY,
    x2:        x,
    y2:        y,
    fill:      false,
    lineWidth: parseInt(lineWidthInput.value, 10),
    preview:   true
  };
  redrawCanvas();
});

// Commit shape on release
canvas.addEventListener('mouseup', e => {
  if (!drawing) return;
  drawing = false;
  const { x, y } = getMousePos(e);
  shapes.push({
    type:      shapeTool.value,
    x1:        startX,
    y1:        startY,
    x2:        x,
    y2:        y,
    fill:      e.button === 2,
    lineWidth: parseInt(lineWidthInput.value, 10)
  });
  previewShape = null;
  undone = [];
  redrawCanvas();
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const touch = e.touches[0];
  const { x, y } = getMousePos(touch);
  drawing = true;
  startX = x;
  startY = y;
});

canvas.addEventListener('touchmove', e => {
  if (!drawing) return;
  const touch = e.touches[0];
  const { x, y } = getMousePos(touch);
  previewShape = {
    type: shapeTool.value,
    x1: startX,
    y1: startY,
    x2: x,
    y2: y,
    fill: false,
    lineWidth: parseInt(lineWidthInput.value, 10),
    preview: true
  };
  redrawCanvas();
});

canvas.addEventListener('touchend', e => {
  drawing = false;
  previewShape = null;
  redrawCanvas();
});

// Flood-fill algorithm (operates on raw canvas pixels)
function floodFill(x, y, fillColor = [0,0,0,255], tolerance = 180) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data      = imageData.data;
  const width     = imageData.width;
  const height    = imageData.height;
  const stack     = [[x,y]];
  const baseIdx   = (y*width + x)*4;
  const targetCol = data.slice(baseIdx, baseIdx+4);
  const visited   = new Uint8Array(width * height);
  const matchColor = i => {
    for (let j=0; j<4; j++) {
      if (Math.abs(data[i+j] - targetCol[j]) > tolerance) return false;
    }
    return true;
  };
  const setColor = i => {
    for (let j=0; j<4; j++) data[i+j] = fillColor[j];
  };
  while (stack.length) {
    const [cx,cy] = stack.pop();
    const idx = cy*width + cx;
    if (visited[idx]) continue;
    visited[idx] = 1;
    const pixIdx = idx*4;
    if (!matchColor(pixIdx)) continue;
    setColor(pixIdx);
    if (cx>0)           stack.push([cx-1, cy]);
    if (cx<width-1)     stack.push([cx+1, cy]);
    if (cy>0)           stack.push([cx, cy-1]);
    if (cy<height-1)    stack.push([cx, cy+1]);
  }
  ctx.putImageData(imageData, 0, 0);
  shapes.push({ type: 'fill', imageData });
  redrawCanvas();
}
// Redraw everything + preview
function redrawCanvas() {
  // clear in CSS-pixel space
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  shapes.forEach(s => drawShape(s));
  if (previewShape) drawShape(previewShape);
}
// Draw one shape
function drawShape(shape) {
  if (shape.type === 'fill') {
    return ctx.putImageData(shape.imageData, 0, 0);
  }
  const { type, x1, y1, x2, y2, fill, lineWidth, preview } = shape;
  ctx.lineWidth   = lineWidth;
  ctx.strokeStyle = ctx.fillStyle = (preview ? '#999' : '#000');
  ctx.beginPath();
  const w = x2 - x1, h = y2 - y1;
  const cx = x1 + w/2, cy = y1 + h/2;
  switch(type) {
    case 'line':
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      break;
    case 'rectangle':
      return fill
        ? ctx.fillRect(x1,y1,w,h)
        : ctx.strokeRect(x1,y1,w,h);
    case 'pentagon':
      drawPolygon(cx, cy, Math.min(Math.abs(w),Math.abs(h))/2, 5, -Math.PI/2);
      break;
    case 'hexagon':
      drawPolygon(cx, cy, Math.min(Math.abs(w),Math.abs(h))/2, 6, 0);
      break;
    case 'rhombus':
      ctx.moveTo(cx, y1);
      ctx.lineTo(x2,cy);
      ctx.lineTo(cx, y2);
      ctx.lineTo(x1,cy);
      ctx.closePath();
      break;
    case 'oval':
      ctx.ellipse(cx, cy, Math.abs(w)/2, Math.abs(h)/2, 0, 0, 2*Math.PI);
      break;
    case 'matrix': 
      const size = parseInt(matrixSizeInput.value, 10);
      // Enforce square shape
      const dx = x2 - x1;
      const dy = y2 - y1;
      const side = Math.min(Math.abs(dx), Math.abs(dy));

      const wSq = dx >= 0 ? side : -side;
      const hSq = dy >= 0 ? side : -side;
      const x2Sq = x1 + wSq;
      const y2Sq = y1 + hSq;

      const cellWidth = wSq / size;
      const cellHeight = hSq / size;

      // Outer rectangle
      ctx.strokeRect(x1, y1, wSq, hSq);
      for (let i = 1; i < size; i++) {
        const x = x1 + i * cellWidth;
        const y = y1 + i * cellHeight;

        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2Sq);
        ctx.stroke();

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2Sq, y);
        ctx.stroke();
      }
      default:
      return;
  }
  fill ? ctx.fill() : ctx.stroke();
}
// Regular polygon helper
function drawPolygon(cx, cy, radius, sides, rotation=0) {
  if (sides<3) return;
  const angle = 2*Math.PI/sides;
  ctx.moveTo(cx + radius*Math.cos(rotation),
             cy + radius*Math.sin(rotation));
  for (let i=1; i<=sides; i++) {
    ctx.lineTo(
      cx + radius*Math.cos(i*angle + rotation),
      cy + radius*Math.sin(i*angle + rotation)
    );
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
