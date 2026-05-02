require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Config ───────────────────────────────────────────────────────────────
const NTFY_TOPIC      = process.env.NTFY_TOPIC      || 'ayushman-secret-cards-x7k2';
const YOUR_PHONE      = process.env.YOUR_PHONE      || '';   // e.g. +919876543210
const CALLMEBOT_KEY   = process.env.CALLMEBOT_APIKEY || '';
const DESTROY_KEY     = process.env.DESTROY_KEY     || 'dev-unlock-2025';

// ── Persistent state ─────────────────────────────────────────────────────
const STATE_FILE = path.join(__dirname, 'state.json');

function readState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch (_) {}
  return { destroyed: false, sessionOpen: false, lastCard: 0, replySent: false, deviceId: null };
}

function writeState(patch) {
  const current = readState();
  const next = { ...current, ...patch };
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
  return next;
}

// ── ntfy.sh push notification ─────────────────────────────────────────────
// This sends a REAL push notification to your phone (like WhatsApp pings)
// Just install the "ntfy" app from Play Store / App Store and subscribe to your topic
async function pushNtfy(title, message, priority = 3) {
  try {
    // HTTP headers must be ASCII-safe — strip emoji from title for header
    const safeTitle = title.replace(/[^\x00-\x7F]/g, '').trim();
    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: {
        'Title':        safeTitle || 'Card Notification',
        'Priority':     String(priority),
        'Tags':         'bell',
        'Content-Type': 'text/plain'
      },
      body: `${title}\n${message}`   // Full emoji title goes in the body text
    });
    console.log(`[ntfy] ${res.status} — ${safeTitle}`);
  } catch (err) {
    console.error('[ntfy] Error:', err.message);
  }
}

// ── CallMeBot WhatsApp notification ──────────────────────────────────────
// Sends an actual WhatsApp message to YOUR number (free, personal use)
async function pushWhatsApp(message) {
  if (!YOUR_PHONE || !CALLMEBOT_KEY || YOUR_PHONE.includes('XXXXXXXXXX')) {
    console.log('[whatsapp] Skipped — phone/apikey not configured yet');
    return;
  }
  try {
    const encoded = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${YOUR_PHONE}&text=${encoded}&apikey=${CALLMEBOT_KEY}`;
    const res = await fetch(url);
    console.log(`[whatsapp] ${res.status} — sent to ${YOUR_PHONE}`);
  } catch (err) {
    console.error('[whatsapp] Error:', err.message);
  }
}

// ── Send via ALL channels ─────────────────────────────────────────────────
async function notifyAll(title, message, priority = 3) {
  await Promise.all([
    pushNtfy(title, message, priority),
    pushWhatsApp(`${title}\n\n${message}`)
  ]);
}

// ── Card names ────────────────────────────────────────────────────────────
const cardNames = [
  "Card 1 — Don't overthink this",
  "Card 2 — Queen of Stubbornness",
  "Card 3 — Books over Drama",
  "Card 4 — Everything will be fine",
  "Card 5 — My incredible lying skills",
  "Card 6 — Reply Card"
];

// ── Health check — pinged by UptimeRobot to keep Render server alive ─────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
});

app.get('/api/status', (req, res) => {
  const state = readState();
  res.json({ destroyed: state.destroyed });
});

app.post('/api/open', async (req, res) => {
  const { deviceId } = req.body || {};
  const state = readState();
  
  if (state.destroyed) return res.json({ destroyed: true });

  if (state.sessionOpen) {
    if (state.deviceId && state.deviceId !== deviceId) {
      return res.json({ locked: true });
    }
    return res.json({ ok: true });
  }

  writeState({ sessionOpen: true, deviceId });

  await notifyAll(
    '👀 She opened your cards!',
    'Your friend accessed the site: https://friend-project-pink.vercel.app/ - Watch the dashboard for live updates.',
    5
  );

  io.emit('session_open', { time: new Date().toISOString() });
  res.json({ ok: true });
});

app.post('/api/card', async (req, res) => {
  const { index } = req.body;
  const state = readState();
  if (state.destroyed) return res.json({ destroyed: true });

  writeState({ lastCard: index });
  const name = cardNames[index] || `Card ${index + 1}`;
  io.emit('card_view', { index, name });

  await notifyAll(
    `📖 Now on: ${name}`,
    `She swiped to card ${index + 1} of ${cardNames.length}.`,
    2
  );

  res.json({ ok: true });
});

app.post('/api/destroy', async (req, res) => {
  const { replied, message } = req.body;
  writeState({ destroyed: true, replySent: !!replied });
  io.emit('destroyed', { replied, message });

  if (replied) {
    await notifyAll(
      '💬 She replied!',
      `Her message: "${message}"`,
      5
    );
  } else {
    await notifyAll(
      '🔇 She passed — no reply',
      'She reached the end without replying. App is now destroyed.',
      4
    );
  }

  res.json({ ok: true });
});

app.post('/api/reset', (req, res) => {
  const { key } = req.body;
  if (key !== DESTROY_KEY) {
    return res.status(403).json({ error: 'Wrong key' });
  }
  writeState({ destroyed: false, sessionOpen: false, lastCard: 0, replySent: false, deviceId: null });
  io.emit('reset');
  res.json({ ok: true });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// ── Socket.io ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[ws] connected:', socket.id);
  socket.emit('state_sync', readState());
  socket.on('disconnect', () => console.log('[ws] disconnected:', socket.id));
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('\n========================================');
  console.log(`🚀  Server:     http://localhost:${PORT}`);
  console.log(`📊  Dashboard:  http://localhost:${PORT}/dashboard`);
  console.log(`📡  ntfy topic: https://ntfy.sh/${NTFY_TOPIC}`);
  console.log(`📱  WhatsApp:   ${YOUR_PHONE || '⚠️  NOT CONFIGURED — fill .env'}`);
  console.log(`🔑  Dev key:    ${DESTROY_KEY}`);
  console.log('========================================\n');
});
