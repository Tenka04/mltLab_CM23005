'use strict';

/* ============================================================
   GLOBALS
   ============================================================ */
let mobileNet   = null;   // MobileNet V2 instance
let cocoModel   = null;   // COCO-SSD instance
let modelReady  = false;  // true when both models loaded
let imgReady    = false;  // true when preview-img has fully loaded
let uploadChart = null;   // Chart.js instance (upload panel)
let camChart    = null;   // Chart.js instance (webcam panel)
let camStream   = null;   // MediaStream from getUserMedia
let camTimer    = null;   // setInterval handle for webcam loop
let snapDataURL = null;   // Captured snapshot as data URL

/* Bounding-box colour palette */
const BOX_COLORS = ['#ffcc00', '#00e8d0', '#ff8c00', '#ff4040', '#40ff80', '#e8a800', '#00c4b0', '#ff6060', '#ffd040', '#80ffcc'];

/* COCO-SSD classes that are animals */
const ANIMAL_SET = new Set([
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe'
]);

/* Chart.js colour arrays */
const CHART_BG  = ['rgba(255,200,0,.55)', 'rgba(232,168,0,.50)', 'rgba(255,140,0,.50)', 'rgba(0,232,208,.45)', 'rgba(255,96,96,.45)'];
const CHART_BDR = ['#ffcc00', '#e8a800', '#ff8c00', '#00e8d0', '#ff4040'];

/* Animal → emoji map for the fact card */
const ANIMAL_EMOJIS = {
  cat: '🐱', dog: '🐶', bird: '🐦', horse: '🐴', cow: '🐄',
  sheep: '🐑', elephant: '🐘', bear: '🐻', zebra: '🦓', giraffe: '🦒',
  lion: '🦁', tiger: '🐯', wolf: '🐺', fox: '🦊', rabbit: '🐰',
  deer: '🦌', monkey: '🐒', panda: '🐼', penguin: '🐧', eagle: '🦅',
  owl: '🦉', shark: '🦈', dolphin: '🐬', whale: '🐳', crocodile: '🐊',
  snake: '🐍', frog: '🐸', turtle: '🐢', lizard: '🦎', parrot: '🦜',
  flamingo: '🦩', default: '🦒'
};


/* ============================================================
   THEME — Dark / Light
   ============================================================ */

/**
 * Reads saved theme from localStorage and applies it on page load.
 * Called automatically at the bottom of this file.
 */
function initTheme() {
  const saved = localStorage.getItem('ae-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const thumb = document.getElementById('theme-thumb');
  if (thumb) thumb.textContent = saved === 'dark' ? '🌙' : '☀️';
}

/**
 * Toggles between light and dark mode and persists the choice.
 * Bound to the toggle button via onclick in index.html.
 */
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next   = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  document.getElementById('theme-thumb').textContent = next === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('ae-theme', next);
}


/* ============================================================
   MODEL LOAD  (pretrained — no training needed)
   Both models are fetched in parallel with Promise.all
   MobileNet alpha=0.5  → fastest variant (2× faster than 1.0)
   ============================================================ */

/**
 * Loads MobileNet V2 and COCO-SSD in parallel.
 * Updates the banner progress bars and status pill when done.
 */
async function loadModels() {
  try {
    // Animate progress bars while loading
    animateBar('mn-bar', 'mn-status', 0, 65, 1400);
    animateBar('cs-bar', 'cs-status', 0, 45, 2000);

    // Load both pretrained models simultaneously
    const [mn, cs] = await Promise.all([
      mobilenet.load({ version: 2, alpha: 0.5 }),
      cocoSsd.load()
    ]);

    mobileNet  = mn;
    cocoModel  = cs;
    modelReady = true;

    // Fill bars to 100 %
    setBar('mn-bar', 'mn-status', 100);
    setBar('cs-bar', 'cs-status', 100);

    // Update header status pill → green
    document.getElementById('status-pill').classList.add('ready');
    document.getElementById('sdot').classList.add('on');
    document.getElementById('status-txt').textContent = 'Both Models Ready';

    // Update banner → success
    const banner = document.getElementById('load-banner');
    banner.style.background = 'rgba(10,10,0,1)';
    banner.style.borderColor = 'rgba(255,200,0,.40)';
    document.getElementById('lspinner').style.display = 'none';
    document.getElementById('banner-h').textContent = '>> ALL MODELS LOADED. SYSTEM READY.';
    document.getElementById('banner-p').textContent =
      'MOBILENET: TOP-5 LABELS · COCO-SSD: HUMANS + OBJECTS · 0 TRAINING REQUIRED';

    tryEnableClassify();
    showToast('>> MODELS READY. UPLOAD IMAGE OR START CAM.');

  } catch (err) {
    document.getElementById('banner-h').textContent = '❌ Model load failed';
    document.getElementById('banner-p').textContent = err.message;
    showToast('❌ ' + err.message);
    console.error(err);
  }
}


/* ============================================================
   TABS
   ============================================================ */

/**
 * Switches between the Upload and Webcam panels.
 * @param {string} id  - 'upload' or 'webcam'
 * @param {Element} btn - The clicked tab button element
 */
function switchTab(id, btn) {
  document.querySelectorAll('.panel').forEach(p  => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  btn.classList.add('active');
}


/* ============================================================
   FILE LOAD — Drag-and-Drop + Browse
   ============================================================ */

function onDragOver(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.add('drag-over');
}

function onDragLeave() {
  document.getElementById('drop-zone').classList.remove('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadFile(file);
  else showToast('>> ERR: INVALID_FILE. USE JPG PNG WEBP GIF');
}

function onFileSelect(e) {
  if (e.target.files[0]) loadFile(e.target.files[0]);
}

/** Reads a File object and passes its data URL to setPreviewSrc(). */
function loadFile(file) {
  const reader  = new FileReader();
  reader.onload = ev => setPreviewSrc(ev.target.result);
  reader.readAsDataURL(file);
}

/**
 * Sets the preview image src and waits for it to load
 * before enabling the Classify button.
 * @param {string} src - data URL or object URL
 */
function setPreviewSrc(src) {
  imgReady = false;
  tryEnableClassify();

  const img = document.getElementById('preview-img');

  // IMPORTANT: set onload BEFORE setting src
  // Otherwise the event may fire before the handler is attached
  img.onload = () => {
    imgReady = true;
    tryEnableClassify();
  };

  img.src = src;
  img.style.display = 'block';
  document.getElementById('img-wrap').style.display = 'inline-block';
  document.getElementById('no-img').style.display   = 'none';

  clearUploadResults();
}

/** Enable classify button only when both model and image are ready. */
function tryEnableClassify() {
  document.getElementById('classify-btn').disabled = !(modelReady && imgReady);
}


/* ============================================================
   CLASSIFY IMAGE
   ─────────────────────────────────────────────────────────
   Runs MobileNet V2 + COCO-SSD in parallel.

   Human detection logic:
     If COCO-SSD detects ≥1 person with score ≥ 40%:
       → Show blue "Human Detected" hero card
       → Inject "Person (Human)" as rank #1 in the list
         using COCO-SSD's confidence score
       → Show Human Wikipedia fact
     Else:
       → Show standard MobileNet Top-5 best-match hero
       → Show Wikipedia fact for the top animal label
   ============================================================ */

async function classifyImage() {
  if (!modelReady || !imgReady) return;

  const img = document.getElementById('preview-img');
  setBusy(true);

  try {
    // Run both models at the same time → no extra wait
    const [mnPreds, detections] = await Promise.all([
      mobileNet.classify(img, 5),  // Top-5 ImageNet labels
      cocoModel.detect(img)         // Bounding boxes
    ]);

    // Filter confident person detections (threshold: 40%)
    const personDets = detections.filter(d => d.class === 'person' && d.score > 0.40);
    const hasPerson  = personDets.length > 0;

    if (hasPerson) {
      // ── HUMAN detected ──────────────────────────────────
      const personScore = Math.max(...personDets.map(d => d.score));
      // Inject person as rank #1, keep up to 4 MobileNet labels below
      const merged = [
        { className: 'Person (Human)', probability: personScore },
        ...mnPreds
      ].slice(0, 5);

      renderPersonHero(personDets, false);
      renderPreds(merged, 'pred-list', 'best-hero', 'hero-name', 'hero-conf', true);
      drawChart(merged, 'upload-chart', 'upload');

    } else {
      // ── ANIMAL / OBJECT detected ─────────────────────────
      document.getElementById('person-hero').style.display = 'none';
      renderPreds(mnPreds, 'pred-list', 'best-hero', 'hero-name', 'hero-conf', false);
      drawChart(mnPreds, 'upload-chart', 'upload');
      fetchFact(cleanLabel(mnPreds[0].className)); // Wikipedia fact
    }

    // Draw bounding boxes for ALL detected objects
    drawBBoxes(img, detections);
    spawnConfetti();

    const msg = hasPerson
      ? `>> HUMAN_DETECTED: ${personDets.length} SUBJECT(S)`
      : `>> CLASSIFY_COMPLETE. ${detections.length} OBJECT(S) FOUND.`;
    showToast(msg);

  } catch (err) {
    showToast('❌ Error: ' + err.message);
    console.error(err);
  }

  setBusy(false);
}

/** Toggle loading state on the Classify button. */
function setBusy(on) {
  document.getElementById('classify-btn').disabled          = on;
  document.getElementById('cls-spinner').style.display      = on ? 'block' : 'none';
  document.getElementById('cls-txt').textContent            = on ? 'Classifying…' : '✨ Classify';
}

/** Clear all result UI elements (predictions, chart, fact card, bbox). */
function clearUploadResults() {
  document.getElementById('person-hero').style.display = 'none';
  document.getElementById('best-hero').style.display   = 'none';
  document.getElementById('pred-list').innerHTML =
    '<div class="empty-hint"><span>🔭</span>> READY. PRESS RUN_CLASSIFY.</div>';
  document.getElementById('detect-badges').innerHTML = '';
  document.getElementById('fact-card').style.display = 'none';

  const c = document.getElementById('bbox-canvas');
  c.getContext('2d').clearRect(0, 0, c.width, c.height);
  c.style.display = 'none';

  if (uploadChart) { uploadChart.destroy(); uploadChart = null; }
}

/** Reset the upload panel completely. */
function resetUpload() {
  const img     = document.getElementById('preview-img');
  img.src       = '';
  img.style.display = 'none';
  document.getElementById('img-wrap').style.display = 'none';

  imgReady = false;
  document.getElementById('no-img').style.display   = 'flex';
  document.getElementById('file-input').value       = '';

  clearUploadResults();
  document.getElementById('pred-list').innerHTML =
    '<div class="empty-hint"><span>🔭</span>&gt; AWAITING INPUT...</div>';

  tryEnableClassify();
}


/* ============================================================
   PERSON HERO CARD
   ============================================================ */

/**
 * Shows the blue "Human Detected" hero card for upload or webcam.
 * @param {Array}   personDets - COCO-SSD detections where class === 'person'
 * @param {boolean} isCam      - true when called from the webcam panel
 */
function renderPersonHero(personDets, isCam) {
  const heroId      = isCam ? 'cam-person-hero'       : 'person-hero';
  const countTextId = isCam ? 'cam-person-count-text' : 'person-count-text';
  const subId       = isCam ? 'cam-person-sub'        : 'person-sub';

  const hero = document.getElementById(heroId);
  hero.style.display = 'block';

  const n        = personDets.length;
  const topScore = (Math.max(...personDets.map(d => d.score)) * 100).toFixed(0);

  document.getElementById(countTextId).innerHTML =
    `${n === 1 ? 'Person' : n + ' People'}`
    + `<span class="person-count-chip">${topScore}% confidence</span>`;

  document.getElementById(subId).textContent =
    `Detected by COCO-SSD · ${n} bounding box${n > 1 ? 'es' : ''}`;

  // Hide the generic best-hero when person is shown
  document.getElementById(isCam ? 'cam-best-hero' : 'best-hero').style.display = 'none';

  // Show Human Wikipedia fact (upload panel only)
  if (!isCam) {
    document.getElementById('fact-card').style.display    = 'block';
    document.getElementById('fact-animal-name').textContent = 'Human (Homo sapiens)';
    document.getElementById('fact-thumb').textContent      = '🧑';
    document.getElementById('fact-body').innerHTML = `
      <p class="fact-text">
        Homo sapiens are the only extant members of the genus Homo.
        Modern humans are anatomically distinct from other great apes and are
        characterized by larger and more complex brains that enable advanced
        cognitive skills. Humans are highly social and tend to live in complex
        social structures composed of cooperating and competing groups.
      </p>
      <div class="fact-source">
        📖 Source:
        <a href="https://en.wikipedia.org/wiki/Human" target="_blank" rel="noopener">
          Wikipedia — Human
        </a>
      </div>`;
  }
}


/* ============================================================
   RENDER PREDICTIONS LIST
   ============================================================ */

/**
 * Renders the ranked prediction rows with animated progress bars.
 * @param {Array}   preds       - Array of {className, probability}
 * @param {string}  listId      - Container element ID
 * @param {string}  heroId      - Best-hero card element ID
 * @param {string}  nameId      - Hero name element ID
 * @param {string}  confId      - Hero confidence element ID
 * @param {boolean} personIsTop - Skip the generic hero if person is top
 */
function renderPreds(preds, listId, heroId, nameId, confId, personIsTop) {
  // Show best-hero only for non-person top results
  if (!personIsTop) {
    const hero = document.getElementById(heroId);
    hero.style.display = 'block';
    document.getElementById(nameId).textContent = cleanLabel(preds[0].className);
    document.getElementById(confId).textContent =
      (preds[0].probability * 100).toFixed(1) + '% confidence';
  }

  const list   = document.getElementById(listId);
  list.innerHTML = '';
  const medals = ['🥇', '🥈', '🥉', '4.', '5.'];

  preds.forEach((p, i) => {
    const pct      = (p.probability * 100).toFixed(1);
    const isPerson = p.className.toLowerCase().includes('person') ||
                     p.className.toLowerCase().includes('human');

    const div = document.createElement('div');
    div.className = `pred-item ${isPerson ? 'person-rank' : 'r' + i}`;
    div.style.animationDelay = `${i * 65}ms`;
    div.innerHTML = `
      <div class="pred-row">
        <span class="pred-name">${medals[i]} ${cleanLabel(p.className)}</span>
        <span class="pred-pct">${pct}%</span>
      </div>
      <div class="bar-bg">
        <div class="bar-fg" id="bf-${listId}-${i}"></div>
      </div>`;
    list.appendChild(div);

    // Double-rAF ensures element is in the DOM before animating width
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = document.getElementById(`bf-${listId}-${i}`);
      if (el) el.style.width = pct + '%';
    }));
  });
}

/**
 * Strips underscores and takes the first part of comma-separated MobileNet labels.
 * E.g. "tabby, tabby_cat" → "tabby"
 */
function cleanLabel(raw) {
  return raw.split(',')[0].replace(/_/g, ' ').trim();
}


/* ============================================================
   BOUNDING BOXES  (COCO-SSD)
   Colour coding:
     person → always indigo  (#6366F1)
     animal → BOX_COLORS array
     other  → slate grey     (#94A3B8)
   ============================================================ */

function getBoxColor(cls, idx) {
  if (cls === 'person')    return '#6366F1';
  if (ANIMAL_SET.has(cls)) return BOX_COLORS[idx % BOX_COLORS.length];
  return '#94A3B8';
}

/**
 * Draws bounding boxes over the uploaded image.
 * Scales coordinates from natural image size to displayed size.
 */
function drawBBoxes(img, detections) {
  const canvas  = document.getElementById('bbox-canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.style.width  = img.offsetWidth  + 'px';
  canvas.style.height = img.offsetHeight + 'px';
  canvas.style.display = detections.length ? 'block' : 'none';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sx = img.offsetWidth  / img.naturalWidth;
  const sy = img.offsetHeight / img.naturalHeight;

  const badges = document.getElementById('detect-badges');
  badges.innerHTML = '';

  detections.forEach((det, i) => {
    const color         = getBoxColor(det.class, i);
    const [x, y, w, h] = det.bbox;
    const score         = (det.score * 100).toFixed(0);

    // Scale bbox to display dimensions
    const dx = x * sx,  dy = y * sy;
    const dw = w * sx,  dh = h * sy;

    // Box outline with glow
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.strokeRect(dx, dy, dw, dh);
    ctx.shadowBlur  = 0;

    // Corner brackets (more elegant than a plain box)
    const bs = 14;
    ctx.fillStyle = color;
    ctx.fillRect(dx,         dy,         bs, 3);  // TL horizontal
    ctx.fillRect(dx,         dy,         3,  bs); // TL vertical
    ctx.fillRect(dx+dw-bs,  dy,          bs, 3);  // TR horizontal
    ctx.fillRect(dx+dw-3,   dy,          3,  bs); // TR vertical
    ctx.fillRect(dx,         dy+dh-3,    bs, 3);  // BL horizontal
    ctx.fillRect(dx,         dy+dh-bs,   3,  bs); // BL vertical
    ctx.fillRect(dx+dw-bs,   dy+dh-3,   bs, 3);  // BR horizontal
    ctx.fillRect(dx+dw-3,    dy+dh-bs,  3,  bs); // BR vertical

    // Label pill
    const lbl = det.class === 'person' ? `👤 Person ${score}%` : `${det.class} ${score}%`;
    ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
    const tw = ctx.measureText(lbl).width;
    ctx.fillStyle = color;
    ctx.beginPath();
    roundRect(ctx, dx, dy - 24, tw + 14, 22, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(lbl, dx + 7, dy - 8);

    // Badge pill below image
    const badge = document.createElement('div');
    badge.className = 'dbadge';
    badge.style.cssText = `background:${color}18;color:${color};border-color:${color}55`;
    badge.style.animationDelay = `${i * 80}ms`;
    const icon = det.class === 'person' ? '👤'
               : ANIMAL_SET.has(det.class) ? '🐾' : '📦';
    badge.textContent = `${icon} ${det.class} · ${score}%`;
    badges.appendChild(badge);
  });
}

/** Draw bounding boxes directly on the webcam bbox canvas. */
function drawCamBBoxes(video, detections) {
  const cc = document.getElementById('cam-bbox-canvas');
  cc.width  = video.videoWidth;
  cc.height = video.videoHeight;

  const ctx = cc.getContext('2d');
  ctx.clearRect(0, 0, cc.width, cc.height);

  detections.forEach((det, i) => {
    const color         = getBoxColor(det.class, i);
    const [x, y, w, h] = det.bbox;
    const score         = (det.score * 100).toFixed(0);

    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur  = 0;

    const lbl = det.class === 'person' ? `👤 Person ${score}%` : `${det.class} ${score}%`;
    ctx.font = 'bold 13px sans-serif';
    const tw = ctx.measureText(lbl).width;
    ctx.fillStyle = color;
    ctx.beginPath();
    roundRect(ctx, x, y - 24, tw + 14, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(lbl, x + 7, y - 8);
  });
}

/** Draws a rounded rectangle path (for label pill backgrounds). */
function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);   ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);   ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
  ctx.lineTo(x,     y + r);   ctx.quadraticCurveTo(x,     y,     x + r, y);
}


/* ============================================================
   WIKIPEDIA FACT CARD
   ============================================================ */

/** Returns an emoji for a given animal name string. */
function getAnimalEmoji(name) {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(ANIMAL_EMOJIS)) {
    if (lower.includes(k)) return v;
  }
  return ANIMAL_EMOJIS.default;
}

/**
 * Fetches a Wikipedia summary for the given label and renders it
 * in the fact card. Falls back to the first word of the label.
 * @param {string} name - clean animal/subject name
 */
async function fetchFact(name) {
  const card = document.getElementById('fact-card');
  card.style.display = 'block';
  document.getElementById('fact-animal-name').textContent = name;
  document.getElementById('fact-thumb').textContent = getAnimalEmoji(name);
  document.getElementById('fact-body').innerHTML =
    `<div class="fact-loading">
       <div class="mini-spin"></div>
       <span>Fetching fact about ${name}…</span>
     </div>`;

  // Try full name, then first word as fallback
  for (const query of [name, name.split(' ')[0]]) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!res.ok) continue;

      const data = await res.json();
      if (data.extract && data.type !== 'disambiguation') {
        // Show 3 sentences maximum
        const snippet = data.extract.split('. ').slice(0, 3).join('. ') + '.';
        document.getElementById('fact-body').innerHTML = `
          <p class="fact-text">${snippet}</p>
          <div class="fact-source">
            📖 Source:
            <a href="${data.content_urls?.desktop?.page || '#'}"
               target="_blank" rel="noopener">
              Wikipedia — ${data.title}
            </a>
          </div>`;
        return;
      }
    } catch (_) { /* network error — try next query */ }
  }

  // Fallback if nothing found
  document.getElementById('fact-body').innerHTML =
    `<p class="fact-text" style="color:var(--muted)">
       No Wikipedia entry found for "<strong>${name}</strong>".
     </p>`;
}


/* ============================================================
   WEBCAM
   ============================================================ */

/** Starts the webcam stream and begins the classification loop. */
async function startWebcam() {
  if (!modelReady) { showToast('>> ERR: MODELS NOT READY. STANDBY...'); return; }
  if (camStream)   return; // already running

  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 } }
    });

    const video = document.getElementById('webcam-video');
    video.srcObject = camStream;

    // Wait for video metadata then play
    await new Promise((res, rej) => {
      video.onloadedmetadata = () => video.play().then(res).catch(rej);
      video.onerror          = rej;
    });

    // Show live UI elements
    document.getElementById('cam-placeholder').classList.add('gone');
    document.getElementById('vid-live').classList.add('on');
    document.getElementById('scan-bar').classList.add('on');
    document.getElementById('fps-chip').style.display = 'inline';
    document.getElementById('btn-snap').classList.add('on');

    showToast('>> CAM_ONLINE. DETECTING HUMANS & ANIMALS...');

    // Classify every 900 ms — fast enough to feel live, won't overload GPU
    camTimer = setInterval(classifyCamFrame, 900);

  } catch (err) {
    showToast('❌ Camera error: ' + err.message);
    console.error(err);
  }
}

/** Stops the webcam stream and clears live UI. */
function stopWebcam() {
  if (camTimer)  { clearInterval(camTimer);  camTimer  = null; }
  if (camStream) {
    camStream.getTracks().forEach(t => t.stop());
    camStream = null;
  }

  document.getElementById('webcam-video').srcObject = null;
  document.getElementById('cam-placeholder').classList.remove('gone');
  document.getElementById('vid-live').classList.remove('on');
  document.getElementById('scan-bar').classList.remove('on');
  document.getElementById('fps-chip').style.display  = 'none';
  document.getElementById('fps-chip').textContent    = '';
  document.getElementById('btn-snap').classList.remove('on');
  document.getElementById('cam-person-hero').style.display = 'none';
  document.getElementById('cam-best-hero').style.display   = 'none';
  document.getElementById('cam-pred-list').innerHTML =
    '<div class="empty-hint"><pre>&gt; CAM_OFFLINE\n&gt; START CAMERA TO BEGIN</pre></div>';
  document.getElementById('cam-bbox-canvas')
    .getContext('2d').clearRect(0, 0, 99999, 99999);

  if (camChart) { camChart.destroy(); camChart = null; }
  showToast('>> CAM_OFFLINE.');
}

/* FPS counter state */
let _fpsCnt = 0;
let _fpsT   = performance.now();

/**
 * One iteration of the webcam classification loop.
 * 1. Draws video frame onto 224×224 canvas → pass to MobileNet
 * 2. Also runs COCO-SSD on the full video element → bounding boxes
 * 3. Updates predictions, chart, and bbox overlay
 */
async function classifyCamFrame() {
  const video = document.getElementById('webcam-video');
  if (!camStream || video.readyState < 2 || video.videoWidth === 0) return;

  try {
    // Capture frame at 224×224 for MobileNet (fast, fixed input size)
    const canvas = document.getElementById('webcam-canvas');
    canvas.getContext('2d').drawImage(video, 0, 0, 224, 224);

    const [mnPreds, detections] = await Promise.all([
      mobileNet.classify(canvas, 5), // Top-5 from 224×224 canvas
      cocoModel.detect(video)         // Full-res video for accurate bboxes
    ]);

    const personDets = detections.filter(d => d.class === 'person' && d.score > 0.40);
    const hasPerson  = personDets.length > 0;

    if (hasPerson) {
      const personScore = Math.max(...personDets.map(d => d.score));
      const merged = [
        { className: 'Person (Human)', probability: personScore },
        ...mnPreds
      ].slice(0, 5);
      renderPersonHero(personDets, true);
      renderPreds(merged, 'cam-pred-list', 'cam-best-hero', 'cam-hero-name', 'cam-hero-conf', true);
      drawChart(merged, 'cam-chart', 'cam');
    } else {
      document.getElementById('cam-person-hero').style.display = 'none';
      renderPreds(mnPreds, 'cam-pred-list', 'cam-best-hero', 'cam-hero-name', 'cam-hero-conf', false);
      drawChart(mnPreds, 'cam-chart', 'cam');
    }

    drawCamBBoxes(video, detections);

    // Update predictions-per-second counter every 2.5 s
    _fpsCnt++;
    const now = performance.now();
    if (now - _fpsT >= 2500) {
      document.getElementById('fps-chip').textContent =
        (_fpsCnt / ((now - _fpsT) / 1000)).toFixed(1) + ' pred/s';
      _fpsCnt = 0;
      _fpsT   = now;
    }

  } catch (_) {
    // Silently skip bad frames (e.g. during rapid tab switching)
  }
}


/* ============================================================
   SNAPSHOT
   ============================================================ */

/** Captures the current webcam frame, shows it in a modal. */
function takeSnapshot() {
  const video = document.getElementById('webcam-video');
  if (!camStream || video.readyState < 2) {
    showToast('>> ERR: CAM_NOT_READY');
    return;
  }

  // White flash effect
  const flash = document.createElement('div');
  flash.className = 'snap-flash';
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove());

  // Draw mirrored frame to canvas
  const sc = document.createElement('canvas');
  sc.width  = video.videoWidth;
  sc.height = video.videoHeight;
  const ctx = sc.getContext('2d');
  ctx.translate(sc.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);

  snapDataURL = sc.toDataURL('image/jpeg', 0.92);
  document.getElementById('snap-preview-img').src = snapDataURL;
  document.getElementById('snap-modal').classList.add('open');
}

function closeSnapModal() {
  document.getElementById('snap-modal').classList.remove('open');
}

/**
 * Sends the snapshot to the Upload panel and classifies it.
 * Switches to the Upload tab automatically.
 */
function classifySnapshot() {
  closeSnapModal();
  switchTab('upload', document.querySelector('.tab-btn'));
  setPreviewSrc(snapDataURL);

  // Small delay to allow image.onload to fire before classifyImage() runs
  setTimeout(() => {
    if (imgReady && modelReady) classifyImage();
  }, 350);

  showToast('>> FRAME_LOADED. RUNNING CLASSIFY...');
}


/* ============================================================
   CHART.JS — Confidence Bar Chart
   Person labels always get indigo so they stand out.
   ============================================================ */

/**
 * Returns bg + border colour arrays for Chart.js,
 * giving person labels an indigo colour.
 */
function getPredColors(preds) {
  return preds.map((p, i) => {
    const isHuman = p.className.toLowerCase().includes('person') ||
                    p.className.toLowerCase().includes('human');
    if (isHuman) return { bg: 'rgba(0,232,208,.55)', bdr: '#00e8d0' };
    return {
      bg:  CHART_BG[i]  || CHART_BG[4],
      bdr: CHART_BDR[i] || CHART_BDR[4]
    };
  });
}

/**
 * Renders or replaces a Chart.js bar chart.
 * @param {Array}  preds    - prediction array
 * @param {string} canvasId - target canvas element ID
 * @param {string} key      - 'upload' or 'cam'
 */
function drawChart(preds, canvasId, key) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const tc = isDark ? '#5a5010' : '#8a7c50';  // tick colour
  const gc = isDark ? 'rgba(255,200,0,.06)' : 'rgba(74,56,0,.08)';  // grid colour
  const tb = isDark ? 'rgba(8,8,0,.97)' : 'rgba(250,248,240,.97)';  // tooltip bg
  const tt = isDark ? '#e8d060' : '#1a1400';                 // tooltip title

  const ctx = document.getElementById(canvasId).getContext('2d');
  if (key === 'upload' && uploadChart) { uploadChart.destroy(); }
  if (key === 'cam'    && camChart)    { camChart.destroy();    }

  const colors = getPredColors(preds);

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: preds.map(p => cleanLabel(p.className)),
      datasets: [{
        data:            preds.map(p => (p.probability * 100).toFixed(2)),
        backgroundColor: colors.map(c => c.bg),
        borderColor:     colors.map(c => c.bdr),
        borderWidth:     2,
        borderRadius:    10,
        borderSkipped:   false
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation: {
        duration: key === 'upload' ? 700 : 300,
        easing:   'easeOutQuart'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tb,
          titleColor:      tt,
          bodyColor:       tc,
          borderColor:     'rgba(196,181,253,.35)',
          borderWidth:     1,
          padding:         12,
          cornerRadius:    12,
          titleFont: { family: 'JetBrains Mono',    size: 11 },
          bodyFont:  { family: 'Plus Jakarta Sans', size: 12 },
          callbacks: { label: c => ` ${c.raw}% confidence` }
        }
      },
      scales: {
        x: {
          ticks: { color: tc, font: { family: 'Plus Jakarta Sans', size: 10 }, maxRotation: 22 },
          grid:  { color: gc }
        },
        y: {
          beginAtZero: true,
          max:         100,
          ticks: {
            color: tc,
            font:  { family: 'JetBrains Mono', size: 10 },
            callback: v => v + '%'
          },
          grid: { color: gc }
        }
      }
    }
  });

  if (key === 'upload') uploadChart = chart;
  else                  camChart    = chart;
}


/* ============================================================
   CONFETTI
   ============================================================ */
function spawnConfetti() {
  const cols = ['#ffcc00','#e8a800','#ff8c00','#00e8d0','#40ff80','#ffd040','#ff6060'];
  for (let i = 0; i < 34; i++) {
    const el = document.createElement('div');
    el.className = 'cpiece';
    el.style.cssText = `
      left:             ${Math.random() * 100}vw;
      top:              ${Math.random() * 25}vh;
      background:       ${cols[i % cols.length]};
      animation-duration: ${1.2 + Math.random() * 0.8}s;
      animation-delay:  ${Math.random() * 0.4}s;
      border-radius:    ${Math.random() > 0.5 ? '50%' : '3px'};`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}


/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
let _toastTimer;

/**
 * Shows a brief toast message at the bottom of the screen.
 * @param {string} msg - Message text (can include emoji)
 */
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}


/* ============================================================
   LOAD BAR HELPERS
   ============================================================ */

/** Animate a model progress bar from `from`% to `to`% over `ms` ms. */
function animateBar(barId, labelId, from, to, ms) {
  let start = null;
  const el  = document.getElementById(barId);
  const lb  = document.getElementById(labelId);

  const step = ts => {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / ms, 1);
    const value    = Math.round(from + (to - from) * progress);
    el.style.width = value + '%';
    lb.textContent = value + '%';
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

/** Instantly set a model progress bar to a given percentage. */
function setBar(barId, labelId, value) {
  document.getElementById(barId).style.width = value + '%';
  document.getElementById(labelId).textContent = value + '%';
}


/* ============================================================
   INIT
   Run on page load:
     1. Apply saved theme
     2. Start loading both models
   ============================================================ */
initTheme();
loadModels();