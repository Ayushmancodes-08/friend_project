import { useState, useEffect, useRef } from 'preact/hooks';
import { DestroyedScreen } from './DestroyedScreen';
import { io } from 'socket.io-client';

const initialCards = [
  {
    index: 0,
    bg: "scene1.png",
    badge: "Scene 1 / 6",
    title: "for Venali, on her day",
    caption: "I wanted to make something quiet and sincere, just to say I see you.",
    hint: "Swipe left to read →",
    theme: "card-1"
  },
  {
    index: 1,
    bg: "scene2.png",
    badge: "Scene 2 / 6",
    title: "Fortune 500 CEO?",
    caption: "Honestly, I’m starting to think you've secretly become the CEO of a Fortune 500 company, because getting your time is harder than getting a Tatkal train ticket! 🚂 But even with your busy schedule, our conversations are the favorite part of my day.",
    hint: "Swipe left to read →",
    theme: "card-2"
  },
  {
    index: 2,
    bg: "scene3.png",
    badge: "Scene 3 / 6",
    title: "The little things",
    caption: "The ridiculous 2am voice notes, the inside jokes, and you trying to ninja your way out of chats 🥷. They are small, but they are the moments that stay with me.",
    hint: "Swipe left to read →",
    theme: "card-3"
  },
  {
    index: 3,
    bg: "scene4.png",
    badge: "Scene 4 / 6",
    title: "The quiet part",
    caption: "Lately it felt like we were fading, and there's a conversation I kept starting in my head but putting off, waiting for a time that felt right.",
    hint: "Swipe left to read →",
    theme: "card-4"
  },
  {
    index: 4,
    bg: "scene5.png",
    badge: "Scene 5 / 6",
    title: "What I never said",
    caption: "I've liked you for a while now, Venali. I didn't know how to say it without making things complicated, but I wanted to tell my truth before the year got busier.",
    hint: "Swipe left to read →",
    theme: "card-5"
  },
  {
    index: 5,
    bg: "scene6.png",
    badge: "Scene 6 / 6",
    title: "Happy Birthday, Captain",
    caption: "No pressure to say anything back or react. I just wanted to tell my truth, and celebrate the person who makes everything a little warmer.",
    captionSpan: "I hope this year is incredibly gentle and good to you.",
    footnote: "All pictures are deleted, dumped and the AI image cannot really regenerate you but do manage Captain",
    redeemable: true,
    theme: "card-6"
  }
];

const PARTICLE_COLORS = [
  'rgba(255, 140, 105, ', // Warm Coral
  'rgba(255, 229, 180, ', // Soft Peach
  'rgba(244, 241, 234, '  // Warm White
];

// ── Particle & Confetti Engines ──────────────────────────────────────────
class Particle {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.reset();
    this.y = Math.random() * this.canvasHeight;
  }

  reset() {
    this.x = Math.random() * this.canvasWidth;
    this.y = this.canvasHeight + 10;
    this.size = Math.random() * 3 + 1.2;
    this.speedX = (Math.random() - 0.5) * 0.35;
    this.speedY = -(Math.random() * 0.4 + 0.25);
    this.colorBase = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    this.maxAlpha = Math.random() * 0.45 + 0.15;
    this.alpha = 0;
    this.fadeSpeed = Math.random() * 0.008 + 0.003;
    this.isFadingOut = false;
    this.wobbleSpeed = Math.random() * 0.015 + 0.004;
    this.wobbleRange = Math.random() * 1.2 + 0.4;
    this.wobbleAngle = Math.random() * Math.PI * 2;
  }

  update(mouseX, mouseY) {
    this.x += this.speedX + Math.sin(this.wobbleAngle) * this.wobbleRange * 0.08;
    this.y += this.speedY;
    this.wobbleAngle += this.wobbleSpeed;

    if (mouseX !== -9999 && mouseX !== undefined && mouseX !== null) {
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 120) {
        const force = (120 - dist) / 120;
        this.x -= (dx / dist) * force * 1.5;
        this.y -= (dy / dist) * force * 1.5;
      }
    }

    if (!this.isFadingOut) {
      this.alpha += this.fadeSpeed;
      if (this.alpha >= this.maxAlpha) {
        this.alpha = this.maxAlpha;
        if (this.y < this.canvasHeight * 0.35) {
          this.isFadingOut = true;
        }
      }
    } else {
      this.alpha -= this.fadeSpeed;
    }

    if (this.y < -10 || this.alpha <= 0 || this.x < -10 || this.x > this.canvasWidth + 10) {
      this.reset();
    }
  }

  draw(ctx) {
    ctx.beginPath();
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.size * 2.5
    );
    gradient.addColorStop(0, `${this.colorBase}${this.alpha})`);
    gradient.addColorStop(0.4, `${this.colorBase}${this.alpha * 0.4})`);
    gradient.addColorStop(1, `${this.colorBase}0)`);
    
    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Confetti {
  constructor(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.size = Math.random() * 8 + 6;
    this.width = this.size;
    this.height = this.size * (Math.random() * 0.4 + 0.6);
    
    const angle = Math.random() * Math.PI * 1.5 + Math.PI * 1.25; 
    const speed = Math.random() * 11 + 6;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    this.gravity = 0.20;
    this.drag = 0.975;
    
    const colors = ['#FF8C69', '#FFE5B4', '#FF69B4', '#9370DB', '#87CEFA', '#FFD700', '#48D1CC'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.25;
  }

  update() {
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.vy += this.gravity;
    
    this.x += this.vx;
    this.y += this.vy;
    
    this.rotation += this.rotationSpeed;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }
}

// ── Ambient Synthesizer (Web Audio API) ──────────────────────────────────
class AmbientSynthesizer {
  constructor() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; // starts muted
    
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.value = 0.8;
    
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.55;
    
    this.delayFilter = this.ctx.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.value = 800;
    
    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    
    this.delayNode.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    
    this.isPlaying = false;
    this.nextNoteTime = 0;
    this.currentChordIdx = 0;
    
    this.chords = [
      [130.81, 164.81, 196.00, 246.94], // Cmaj7
      [110.00, 130.81, 164.81, 196.00], // Am7
      [87.31, 220.00, 261.63, 329.63, 392.00], // Fmaj9
      [98.00, 246.94, 293.66, 329.63, 440.00]  // G6/add9
    ];
    
    this.droneOsc = null;
    this.droneGain = null;
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.startDrone();
    this.nextNoteTime = this.ctx.currentTime;
    this.scheduler();
  }

  startDrone() {
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sine';
    
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.08;
    
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 150;
    
    this.droneOsc.connect(droneFilter);
    droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    
    this.droneOsc.frequency.setValueAtTime(this.chords[0][0] / 2, this.ctx.currentTime);
    this.droneOsc.start();
  }

  updateDroneRoot(targetFreq, time) {
    if (this.droneOsc) {
      this.droneOsc.frequency.exponentialRampToValueAtTime(targetFreq / 2, time + 3.0);
    }
  }

  playNote(freq, time) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.18, time + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 5.5);
    
    const noteFilter = this.ctx.createBiquadFilter();
    noteFilter.type = 'lowpass';
    noteFilter.frequency.setValueAtTime(1200, time);
    noteFilter.frequency.exponentialRampToValueAtTime(350, time + 3.0);
    
    osc.connect(noteFilter);
    noteFilter.connect(gainNode);
    
    gainNode.connect(this.masterGain);
    gainNode.connect(this.delayNode);
    
    osc.start(time);
    osc.stop(time + 6.0);
  }

  scheduler() {
    if (!this.isPlaying) return;
    
    const lookahead = 0.5;
    while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
      this.scheduleNextNote(this.nextNoteTime);
      const noteInterval = 3.5 + Math.random() * 2.0;
      this.nextNoteTime += noteInterval;
    }
    
    setTimeout(() => this.scheduler(), 150);
  }

  scheduleNextNote(time) {
    if (Math.random() < 0.2) {
      this.currentChordIdx = (this.currentChordIdx + 1) % this.chords.length;
      const currentRoot = this.chords[this.currentChordIdx][0];
      this.updateDroneRoot(currentRoot, time);
    }
    
    const currentChord = this.chords[this.currentChordIdx];
    let baseFreq = currentChord[Math.floor(Math.random() * currentChord.length)];
    
    this.playNote(baseFreq, time);
    
    if (Math.random() < 0.6) {
      const highFreq = baseFreq * 2;
      const offset = 0.05 + Math.random() * 0.15;
      this.playNote(highFreq, time + offset);
    }
    
    if (Math.random() < 0.3) {
      const chimeFreq = currentChord[Math.floor(Math.random() * currentChord.length)] * 4;
      this.playNote(chimeFreq, time + 0.6);
    }
  }

  setMute(mute) {
    if (!this.ctx) return;
    const targetGain = mute ? 0 : 0.25;
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 1.2);
  }
}

// ── Backend URL ──────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '';
const API = `${API_BASE}/api`;

async function serverCall(path, body) {
  try {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (e) { 
    return null;
  }
}

export function App() {
  const [current, setCurrent] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [vanishingCard, setVanishingCard] = useState(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [envelopeOpened, setEnvelopeOpened] = useState(false);
  const [envelopeFading, setEnvelopeFading] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(true);

  // Gift Modal
  const [isGiftModalActive, setIsGiftModalActive] = useState(false);

  // Audio Toggle
  const [isMuted, setIsMuted] = useState(true);
  const synthRef = useRef(null);

  // Swipe Physics State
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [tiltStyle, setTiltStyle] = useState({});

  // Background Dual Layers State (Cross-fade)
  const [bgActive, setBgActive] = useState("scene1.png");
  const [bgIncoming, setBgIncoming] = useState("");
  const [bgTransition, setBgTransition] = useState(false);

  // Particle Canvas & Confetti Refs
  const canvasRef = useRef(null);
  const confettiRef = useRef([]);

  // ── 1. Background Layer Cross-Fade Effect ──────────────────────────────────
  useEffect(() => {
    if (current >= initialCards.length) return;
    const nextBg = initialCards[current].bg;
    if (!nextBg) return;

    setBgIncoming(nextBg);
    setBgTransition(true);

    const timer = setTimeout(() => {
      setBgActive(nextBg);
      setBgIncoming("");
      setBgTransition(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [current]);

  // ── 2. On Mount: Check lock + open page signal ─────────────────────────────
  useEffect(() => {
    async function init() {
      // Check local destruction lock
      if (localStorage.getItem('isDestroyed') === 'true') {
        setIsDestroyed(true);
        setStatusChecked(true);
        serverCall('/status').then(res => {
          if (res) {
            if (res.cardsVisible !== undefined) setCardsVisible(res.cardsVisible);
            if (res.replySent !== undefined) setReplySent(res.replySent);
          }
        });
        return;
      }

      // Setup device ID
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('deviceId', deviceId);
      }

      // Signal Server
      serverCall('/open', { deviceId }).then(res => {
        if (res) {
          if (res.destroyed) {
            setIsDestroyed(true);
            localStorage.setItem('isDestroyed', 'true');
            if (res.replySent !== undefined) setReplySent(res.replySent);
          } else if (res.locked) {
            setIsLocked(true);
          }
          if (res.cardsVisible !== undefined) {
            setCardsVisible(res.cardsVisible);
          }
        }
      });
      
      setStatusChecked(true);
    }
    init();
  }, []);

  // ── 3. WebSocket Setup ───────────────────────────────────────────────────
  useEffect(() => {
    if (!statusChecked) return;

    const socket = io(API_BASE || window.location.origin, {
      transports: ['websocket', 'polling']
    });

    socket.on('state_sync', (state) => {
      if (state.destroyed) {
        setIsDestroyed(true);
        localStorage.setItem('isDestroyed', 'true');
        setReplySent(state.replySent);
      } else {
        setIsDestroyed(false);
        localStorage.removeItem('isDestroyed');
        setReplySent(false);
      }
      if (state.locked) setIsLocked(true);
      if (state.cardsVisible !== undefined) setCardsVisible(state.cardsVisible);
    });

    socket.on('visibility_changed', (state) => {
      if (state.cardsVisible !== undefined) setCardsVisible(state.cardsVisible);
    });

    socket.on('destroyed', (data) => {
      setIsDestroyed(true);
      localStorage.setItem('isDestroyed', 'true');
      if (data && data.replied !== undefined) {
        setReplySent(data.replied);
      }
    });

    socket.on('reset', () => {
      setIsDestroyed(false);
      localStorage.removeItem('isDestroyed');
      setReplySent(false);
      setCardsVisible(true);
      setCurrent(0);
      setIsDone(false);
      setEnvelopeOpened(false);
      setEnvelopeFading(false);
    });

    return () => socket.disconnect();
  }, [statusChecked]);

  // ── 4. Particle Canvas animation loop ─────────────────────────────────────
  useEffect(() => {
    if (!envelopeOpened || isDone || isDestroyed || isLocked || !cardsVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    let mouseX = -9999;
    let mouseY = -9999;
    
    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const handleMouseLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const particles = [];
    for (let i = 0; i < 30; i++) {
      particles.push(new Particle(canvas.width, canvas.height));
    }

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update(mouseX, mouseY);
        p.draw(ctx);
      });

      if (confettiRef.current.length > 0) {
        for (let i = confettiRef.current.length - 1; i >= 0; i--) {
          const c = confettiRef.current[i];
          c.update();
          if (c.y > canvas.height + 20 || c.x < -20 || c.x > canvas.width + 20) {
            confettiRef.current.splice(i, 1);
          } else {
            c.draw(ctx);
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, [envelopeOpened, isDone, isDestroyed, isLocked, cardsVisible]);

  // ── 5. Touch / Drag Gestures ──────────────────────────────────────────────
  const getX = (e) => e.touches ? e.touches[0].clientX : e.clientX;
  const getY = (e) => e.touches ? e.touches[0].clientY : e.clientY;

  const handleStart = (e) => {
    if (isDragging || current >= initialCards.length || isGiftModalActive) return;
    if (e.target.closest('button') || e.target.closest('a')) return;

    setIsDragging(true);
    setStartX(getX(e));
    setStartY(getY(e));
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    const dx = getX(e) - startX;
    const dy = getY(e) - startY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (e.cancelable) e.preventDefault();
    }

    setOffsetX(dx);
    setOffsetY(dy);

    // Audio-Swipe Dynamic Resonance Reaction
    if (synthRef.current && synthRef.current.delayFilter) {
      const dragRatio = Math.min(Math.abs(dx) / 200, 1.0);
      synthRef.current.delayFilter.frequency.setValueAtTime(800 + dragRatio * 1400, synthRef.current.ctx.currentTime);
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (synthRef.current && synthRef.current.delayFilter) {
      synthRef.current.delayFilter.frequency.setValueAtTime(800, synthRef.current.ctx.currentTime);
    }

    if (offsetX < -120) {
      dismissCard();
    } else {
      setOffsetX(0);
      setOffsetY(0);
    }
  };

  const playSwipeChime = () => {
    if (!synthRef.current || !synthRef.current.ctx || isMuted) return;
    const ctx = synthRef.current.ctx;
    const now = ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 783.99]; // C5, D5, E5, G5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      
      gainNode.gain.setValueAtTime(0, now + idx * 0.06);
      gainNode.gain.linearRampToValueAtTime(0.08, now + idx * 0.06 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.3);
      
      osc.connect(gainNode);
      gainNode.connect(synthRef.current.masterGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.4);
    });
  };

  const spawnSwipeConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const startX = 80;
    const startY = canvas.height * 0.4;
    const newConfetti = [];
    for (let i = 0; i < 15; i++) {
      newConfetti.push(new Confetti(startX, startY));
    }
    confettiRef.current = [...confettiRef.current, ...newConfetti];
  };

  const dismissCard = () => {
    setVanishingCard(current);
    playSwipeChime();
    spawnSwipeConfetti();
    
    setTimeout(() => {
      setVanishingCard(null);
      setOffsetX(0);
      setOffsetY(0);
      const next = current + 1;
      if (next >= initialCards.length) {
        setIsDone(true);
      } else {
        setCurrent(next);
        serverCall('/card', { index: next });
      }
    }, 400);
  };

  // 3D Tilt Hover Effects
  const handleMouseMoveCard = (e) => {
    if (isDragging || isGiftModalActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    
    const rotateY = ((x - xc) / xc) * 12; // up to 12 degrees
    const rotateX = -((y - yc) / yc) * 12;
    
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    });
  };

  const handleMouseLeaveCard = () => {
    setTiltStyle({});
  };

  // ── 6. Audio controls ──────────────────────────────────────────────────────
  const toggleAudio = () => {
    if (!synthRef.current) {
      synthRef.current = new AmbientSynthesizer();
      synthRef.current.start();
    }
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    synthRef.current.setMute(nextMuted);
  };

  const playGiftChime = () => {
    if (!synthRef.current || !synthRef.current.ctx) return;
    const ctx = synthRef.current.ctx;
    const now = ctx.currentTime;
    const notes = [659.25, 783.99, 1046.50];
    const times = [0, 0.12, 0.24];
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + times[idx]);
      
      gainNode.gain.setValueAtTime(0, now + times[idx]);
      gainNode.gain.linearRampToValueAtTime(0.15, now + times[idx] + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + times[idx] + 0.8);
      
      osc.connect(gainNode);
      gainNode.connect(synthRef.current.masterGain);
      
      osc.start(now + times[idx]);
      osc.stop(now + times[idx] + 1.0);
    });
  };

  // ── 7. Envelope Open Handler ──────────────────────────────────────────────
  const handleOpenEnvelope = () => {
    serverCall('/disclaimer');
    setEnvelopeFading(true);

    if (!synthRef.current) {
      synthRef.current = new AmbientSynthesizer();
      synthRef.current.start();
    }

    setTimeout(() => {
      setEnvelopeOpened(true);
    }, 800);
  };

  // ── 8. Redeem Gift Handler & Formspree ─────────────────────────────────────
  const sendRedeemNotification = () => {
    const FORMSPREE_URL = "https://formspree.io/f/mqeooznd";
    
    fetch(FORMSPREE_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: "Gift Redeemed",
        recipient: "Venali",
        message: "Venali Sahoo just clicked the 'Redeem your gift' button on her birthday cards website!",
        timestamp: new Date().toLocaleString()
      })
    })
    .then(response => {
      if (response.ok) {
        console.log("Redeem email notification sent successfully.");
      }
    })
    .catch(error => {
      console.error("Error sending email notification:", error);
    });
  };

  const spawnConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const startX = canvas.width / 2;
    const startY = canvas.height * 0.5;
    const newConfetti = [];
    for (let i = 0; i < 130; i++) {
      newConfetti.push(new Confetti(startX, startY));
    }
    confettiRef.current = [...confettiRef.current, ...newConfetti];
  };

  const handleRedeemGift = () => {
    setIsGiftModalActive(true);
    sendRedeemNotification();
    
    if (synthRef.current && synthRef.current.ctx) {
      const audioCtx = synthRef.current.ctx;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      playGiftChime();
    }
    
    spawnConfetti();

    // Sends real-time notification update to local server & mobile tracker
    serverCall('/destroy', { replied: true, message: "Gift Redeemed! 🎁" });
  };

  const handleCloseModal = () => {
    setIsGiftModalActive(false);
    // Destroys and locks the deck locally to prevent double redemption
    localStorage.setItem('isDestroyed', 'true');
    setTimeout(() => {
      setIsDestroyed(true);
    }, 500);
  };

  const restartDeck = () => {
    setCurrent(0);
    setIsDone(false);
    setEnvelopeOpened(false);
    setEnvelopeFading(false);
    localStorage.removeItem('isDestroyed');
    setIsDestroyed(false);
  };

  // ── 9. Card Styles Generator ──────────────────────────────────────────────
  const getCardStyle = (index) => {
    if (index < current) {
      return {
        transform: 'translate3d(-150vw, 0, 0) rotate(-30deg)',
        opacity: 0,
        pointerEvents: 'none'
      };
    }

    if (index === current) {
      const isVanishing = index === vanishingCard;
      if (isDragging || isVanishing) {
        const transformStyle = isVanishing
          ? `translate3d(-150vw, ${offsetY * 0.25}px, 0) rotate(-30deg)`
          : `translate3d(${offsetX}px, ${offsetY * 0.25}px, 0) rotate(${offsetX * 0.05}deg)`;
        const opacityStyle = isVanishing ? 0 : Math.max(1 - Math.abs(offsetX) / 1000, 0.5);
        const blurStyle = isVanishing ? 'blur(10px)' : `blur(${Math.min(Math.abs(offsetX) / 40, 8)}px)`;
        
        return {
          transform: transformStyle,
          opacity: opacityStyle,
          filter: blurStyle,
          zIndex: 50,
          pointerEvents: isVanishing ? 'none' : 'auto',
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease, filter 0.4s ease'
        };
      } else {
        return {
          opacity: 1,
          filter: 'none',
          zIndex: 50,
          pointerEvents: 'auto',
          transition: 'transform 0.15s ease-out, opacity 0.3s ease',
          ...tiltStyle
        };
      }
    }

    const depth = index - current;
    if (depth <= 3) {
      const xOffset = -15 * depth;
      const yOffset = 5 * depth;
      const scale = 1 - 0.04 * depth;
      const rotate = -2 * depth;
      return {
        transform: `translate3d(${xOffset}px, ${yOffset}px, 0) scale(${scale}) rotate(${rotate}deg)`,
        opacity: (1 - 0.18 * depth).toString(),
        zIndex: 10 - depth,
        pointerEvents: 'none',
        transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      };
    }

    return {
      opacity: 0,
      zIndex: 0,
      pointerEvents: 'none'
    };
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {(isDestroyed || isLocked) && (
        <DestroyedScreen 
          message={
            isLocked 
              ? "This link is active on another device." 
              : (replySent 
                  ? "Gift already redeemed I guess 🎁. Thank you for your response! ✨🌸" 
                  : "Kya farq padhta hai... gift toh khol hi diya hai! 🌸")
          } 
        />
      )}

      {!statusChecked && <div style={{ position: 'fixed', inset: 0, background: '#0f0a15', zIndex: 9998 }} />}

      {!cardsVisible && statusChecked && !isDestroyed && !isLocked && (
        <div className="coming-soon-screen">
          <div className="coming-soon-content">
            <h2>New cards coming soon</h2>
          </div>
        </div>
      )}

      {!envelopeOpened && cardsVisible !== false && statusChecked && !isDestroyed && !isLocked && (
        <div className="welcome-overlay" style={envelopeFading ? { opacity: 0 } : {}}>
          <div className="welcome-content">
            <div className="envelope-badge">Strictly Confidential</div>
            <h1 className="welcome-title">for Venali</h1>
            <div className="welcome-divider"></div>
            <p className="welcome-subtitle">
              This digital envelope is strictly intended for <strong>Venali Sahoo</strong>.<br />
              <span>If you are not the intended recipient, please close this tab immediately.</span>
            </p>
            <button className="start-btn" onClick={handleOpenEnvelope}>Open Envelope ✉</button>
          </div>
        </div>
      )}

      {envelopeOpened && cardsVisible !== false && !isDestroyed && !isLocked && (
        <>
          {/* Dual Layer Crossfading Backgrounds */}
          <div className="bg-layers-container">
            <div className={`bg-layer ${bgTransition ? '' : 'active'}`} style={{ backgroundImage: `url('${bgActive}')` }} />
            {bgIncoming && (
              <div className={`bg-layer ${bgTransition ? 'active' : ''}`} style={{ backgroundImage: `url('${bgIncoming}')` }} />
            )}
            <div className="bg-overlay" />
          </div>

          {/* Fireflies particle canvas */}
          <canvas ref={canvasRef} className="particle-canvas" />

          {/* Header Controls */}
          <div className="header-controls">
            <div className="logo" onClick={restartDeck}>Venali.</div>
            <div className="right-controls">
              <button className="audio-toggle" onClick={toggleAudio} aria-label="Toggle Soundtrack">
                {isMuted ? (
                  <svg viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : (
                  <div className="audio-wave playing">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${(current / initialCards.length) * 100}%` }} />
          </div>



          {/* Main swiper stack */}
          {!isDone && (
            <main
              className="deck-container"
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
            >
              <div className="card-stack">
                {initialCards.map((card, idx) => {
                  const isActive = idx === current;
                  return (
                    <div
                      key={idx}
                      className={`card-wrapper ${isActive ? 'active' : ''}`}
                      style={getCardStyle(idx)}
                      onMouseMove={isActive ? handleMouseMoveCard : undefined}
                      onMouseLeave={isActive ? handleMouseLeaveCard : undefined}
                    >
                      <div className={`card ${card.theme}`}>
                        {isActive && offsetX < -30 && (
                          <div className="swipe-indicator-next" style={{ opacity: Math.min((-offsetX - 30) / 60, 1) }}>
                            Next →
                          </div>
                        )}
                        <div className="card-image-box">
                          <img src={card.bg} alt={card.title} className="card-img" draggable={false} />
                        </div>
                        <div className="card-content-box">
                          <span className="card-badge">{card.badge}</span>
                          <h2 className="card-title">{card.title}</h2>
                          <p className="card-caption">
                            {card.caption}
                            {card.captionSpan && <span>{card.captionSpan}</span>}
                            {card.footnote && <span className="footnote-raw">{card.footnote}</span>}
                          </p>
                          {card.redeemable && (
                            <button className="redeem-btn" onClick={handleRedeemGift}>Redeem your gift</button>
                          )}
                          {!card.redeemable && (
                            <div className="swipe-hint">{card.hint}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </main>
          )}

          {/* Bottom Dot Navigation */}
          {!isDone && (
            <div className="dot-navigation">
              {initialCards.map((_, idx) => (
                <div
                  key={idx}
                  className={`dot-nav-item ${idx === current ? 'active' : ''}`}
                  onClick={() => {
                    setCurrent(idx);
                    serverCall('/card', { index: idx });
                  }}
                />
              ))}
            </div>
          )}

          {/* Done Screen */}
          {isDone && (
            <div className="done-screen show">
              <div className="done-content">
                <div className="done-emoji">🌸</div>
                <h2>All Caught Up</h2>
                <p>Thank you for taking the time to read through my thoughts.</p>
                <button className="restart-btn" onClick={restartDeck}>Read Again ↻</button>
              </div>
            </div>
          )}

          {/* Gift Modal */}
          <div className={`gift-modal-overlay ${isGiftModalActive ? 'active' : ''}`} onClick={(e) => {
            if (e.target.classList.contains('gift-modal-overlay')) {
              handleCloseModal();
            }
          }}>
            <div className="gift-modal-content">
              <button className="close-modal-btn" onClick={handleCloseModal} aria-label="Close Modal">&times;</button>
              <div className="gift-header">Birthday Gift Card</div>
              <div className="gift-body">
                <p className="gift-announcement">gift is on the way Captain!!!</p>
                <p className="gift-note">Valid forever, whenever you're ready.</p>
              </div>
              <div className="gift-footer">Happy Birthday, Captain.</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
