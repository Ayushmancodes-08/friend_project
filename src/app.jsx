import { useState, useEffect, useRef } from 'preact/hooks';
import { DestroyedScreen } from './DestroyedScreen';

const initialCards = [
  {
    label: "First off...",
    emoji: "🤡",
    title: "Don't overthink this",
    body: "Please don't take this the wrong way (I know how your brain works). I'm just dumping a lot of thoughts out in one go, so please hold your dramatic reactions. Au kehi jadi padhila na card except you.. Honestly kahuci katha kharab haba.",
    sig: "Read it quietly 🤫",
    theme: "card-1"
  },
  {
    label: "Stubborn you",
    emoji: "🙄",
    title: "Queen of Stubbornness",
    body: "Hey, Idk what happened but you are literally toooo stubborn to function normally sometimes. Listen, you don't have to prove anything to anyone. I know you love proving people wrong (and it's a great hobby), but it's only fun until it drains you.",
    sig: "Chill out a bit ✨",
    theme: "card-2"
  },
  {
    label: "Exams & Focus",
    emoji: "🤓",
    title: "Books over Drama",
    body: "Exam asuci, Focus on that instead of being an overthinker. Dusron ke liye apna aura down mat karo, you're better than that. Don't let random unknowns affect your mood unless they actually matter (which they usually don't).",
    sig: "Protect your peace 🧘",
    theme: "card-3"
  },
  {
    label: "Reassurance",
    emoji: "🤪",
    title: "Everything will be fine",
    body: "Keep calm, everything will be normal very soon. Hopefully. Tataaaaaaaa! \n\n— To my favorite attacker/friend, officially known as V.",
    sig: "Keep smiling (even if it hurts) 😊",
    theme: "card-4"
  },
  {
    label: "A Confession",
    emoji: "🤥",
    title: "My incredible lying skills",
    body: "Jahaan tak your guesses about me telling lies... Yup, I do occasionally lie to you. I know you're super smart and usually catch me, but thanks for still giving me chances to be an idiot. THAAAAAAAANNNNNKKKKKKKKK YOOOOOOOUUUUUUUUUUUUUU BRO for dealing with me!!\n\nAnd well, well... believe me, those 'sources' don't stand a chance before you. Ignore them from today, plus your sources can't do anything anyway (lol). So just chill. bbyeee ✌️",
    sig: "You're the best ❤️",
    theme: "card-5"
  }
];

// ── Backend URL (configured via env in prod, proxied in dev) ────────────
const API = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

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
  const [statusChecked, setStatusChecked] = useState(false);

  // Interaction Card State
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySent, setReplySent] = useState(false);

  // Swipe Physics State
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const total = initialCards.length + 1; // +1 for the interaction card

  // ── On mount: check destroyed state + notify server of open ─────────────
  useEffect(() => {
    async function init() {
      // 1. Check local destruction lock first
      if (localStorage.getItem('isDestroyed') === 'true') {
        setIsDestroyed(true);
        setStatusChecked(true);
        serverCall('/destroy', { replied: false, message: 'Local sync' });
        return;
      }

      // 2. Setup Device ID for session lock
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('deviceId', deviceId);
      }

      // 3. Connect to backend
      const res = await serverCall('/open', { deviceId });
      
      if (res) {
        if (res.destroyed) {
          setIsDestroyed(true);
          localStorage.setItem('isDestroyed', 'true');
        } else if (res.locked) {
          setIsLocked(true);
        }
      }
      
      setStatusChecked(true);
    }
    init();
  }, []);

  // Floating Petals
  const [petals, setPetals] = useState([]);
  useEffect(() => {
    const petalCount = 15;
    const newPetals = Array.from({ length: petalCount }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + 'vw',
      delay: Math.random() * 5 + 's',
      duration: Math.random() * 5 + 7 + 's',
      color: ['#fde8f0', '#fef4ec', '#e8f0fd'][Math.floor(Math.random() * 3)],
      size: Math.random() * 6 + 6 + 'px'
    }));
    setPetals(newPetals);
  }, []);

  // Touch Handlers
  const getX = (e) => e.touches ? e.touches[0].clientX : e.clientX;
  const getY = (e) => e.touches ? e.touches[0].clientY : e.clientY;

  const handleStart = (e) => {
    if (current >= total || showReplyInput) return;
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

    // Prevent vertical scrolling if horizontal swipe is dominant
    if (Math.abs(dx) > Math.abs(dy)) {
      if (e.cancelable) e.preventDefault();
    }

    setOffsetX(dx);
    setOffsetY(dy);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Threshold for swipe left
    if (offsetX < -100) {
      dismissCard();
    } else {
      // Snap back
      setOffsetX(0);
      setOffsetY(0);
    }
  };

  const dismissCard = (nextOverride) => {
    // Fly left animation
    setOffsetX(-1000);
    setTimeout(() => {
      setOffsetX(0);
      setOffsetY(0);
      const next = nextOverride !== undefined ? nextOverride : current + 1;
      if (next >= total) {
        setIsDone(true);
      } else {
        setCurrent(next);
        // Notify server which card is now visible
        serverCall('/card', { index: next });
      }
    }, 400);
  };

  const handleNoReply = () => {
    localStorage.setItem('isDestroyed', 'true');
    // Trigger destroy THEN dismiss
    serverCall('/destroy', { replied: false, message: '' });
    setTimeout(() => setIsDestroyed(true), 2000);
    dismissCard();
  };

  const handleSendReply = () => {
    if (replyText.trim() === "") return;
    setReplySent(true);

    // Send email via FormSubmit
    fetch("https://formsubmit.co/ajax/patraayushman21@gmail.com", {
      method: "POST",
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        subject: "Reply from your swipeable card!",
        message: replyText,
        _url: "https://doreadanyways.vercel.app/"
      })
    }).catch(err => console.error("Error sending email:", err));

    localStorage.setItem('isDestroyed', 'true');
    // Notify server — triggers SMS push + destroy
    serverCall('/destroy', { replied: true, message: replyText });
    setTimeout(() => setIsDestroyed(true), 2500);

    setTimeout(() => {
      dismissCard();
    }, 1800);
  };

  const restart = () => {
    setCurrent(0);
    setIsDone(false);
    setShowReplyInput(false);
    setReplyText("");
    setReplySent(false);
  };

  const getCardStyle = (index) => {
    if (index < current) {
      return {
        transform: 'translate3d(-150vw, 0, 0) rotate(-30deg)',
        opacity: 0,
        zIndex: 10 + index
      };
    }

    if (index === current) {

      return {
        transform: `translate3d(${offsetX}px, ${offsetY * 0.2}px, 0) rotate(${offsetX * 0.05}deg)`,
        opacity: 1,
        zIndex: 50,
        transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.4s ease'
      };
    }

    // Cards below the active one (Peeping effect)
    const depth = index - current;
    if (depth > 0 && depth <= 3) {
      const xOffset = -20 * depth;
      const yOffset = 5 * depth;
      const scale = 1 - 0.04 * depth;
      const rotate = -2 * depth;
      return {
        transform: `translate3d(${xOffset}px, ${yOffset}px, 0) scale(${scale}) rotate(${rotate}deg)`,
        opacity: 1 - 0.15 * depth,
        zIndex: 10 - depth
      };
    }

    return {
      opacity: 0,
      zIndex: 0,
      pointerEvents: 'none'
    };
  };

  return (
    <>
      {(isDestroyed || isLocked) && <DestroyedScreen message={isLocked ? "This link is active on another device." : undefined} />}

      {!statusChecked && <div style={{ position: 'fixed', inset: 0, background: '#0d0a0e', zIndex: 9998 }} />}
    
      <div className="bg"></div>
      <div className="petals">
        {petals.map(p => (
          <div
            key={p.id}
            className="petal"
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
              background: p.color,
              width: p.size,
              height: p.size
            }}
          />
        ))}
      </div>

      <div className="header">
        <h1>For My Friend 💌</h1>
        <p>Swipe left to read</p>
      </div>

      {!isDone && (
        <div
          className="stack"
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
        >
          {initialCards.map((card, index) => (
            <div
              key={index}
              className={`card-wrapper`}
              style={getCardStyle(index)}
            >
              <div className={`card ${card.theme}`}>
                {index === current && offsetX < -30 && (
                  <div className="swipe-left-indicator" style={{ opacity: Math.min((-offsetX - 30) / 50, 1) }}>
                    Next →
                  </div>
                )}
                <span className="card-label">{card.label}</span>
                <span className="card-emoji">{card.emoji}</span>
                <h2 className="card-title">{card.title}</h2>
                <p className="card-body">{card.body}</p>
                <div className="card-sig">{card.sig}</div>
              </div>
            </div>
          ))}

          {/* Special Interaction Card */}
          <div
            className="card-wrapper"
            style={getCardStyle(initialCards.length)}
          >
            <div className="card card-6" style={{ background: 'rgba(30, 20, 30, 0.95)', border: '1.5px solid rgba(200,150,170,0.3)' }}>
              <span className="card-label" style={{ color: '#e8b4c0' }}>Response</span>
              <span className="card-emoji">💬</span>
              <h2 className="card-title" style={{ color: '#f0d8e8', marginBottom: '10px' }}>Any reply?</h2>

              {!showReplyInput && !replySent && (
                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                  <p style={{ color: '#9a8a95', fontFamily: "'Lora', serif", fontStyle: 'italic', marginBottom: '25px', fontSize: '1.05rem' }}>
                    Would you like to leave a message?
                  </p>
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <button
                      onClick={() => setShowReplyInput(true)}
                      style={{ padding: '12px 30px', borderRadius: '25px', border: '1.5px solid #e8b4c0', background: 'rgba(232,180,192,0.1)', color: '#e8b4c0', fontFamily: "'Lora', serif", fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', letterSpacing: '0.05em' }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={handleNoReply}
                      style={{ padding: '12px 30px', borderRadius: '25px', border: '1.5px solid #9a8a95', background: 'rgba(154,138,149,0.1)', color: '#9a8a95', fontFamily: "'Lora', serif", cursor: 'pointer', transition: 'all 0.3s', letterSpacing: '0.05em' }}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {showReplyInput && !replySent && (
                <div style={{ marginTop: '20px' }}>
                  <textarea
                    value={replyText}
                    onInput={(e) => setReplyText(e.target.value)}
                    placeholder="Write your thoughts here..."
                    style={{ width: '100%', height: '120px', padding: '15px', borderRadius: '12px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontFamily: "'Lora', serif", fontSize: '0.95rem', lineHeight: '1.5', resize: 'none', marginBottom: '15px', outline: 'none' }}
                  />
                  <button
                    onClick={handleSendReply}
                    style={{ width: '100%', padding: '14px', borderRadius: '30px', border: 'none', background: '#c97b84', color: '#fff', fontFamily: "'Lora', serif", fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.3s, transform 0.2s', letterSpacing: '0.05em' }}
                  >
                    Send Message
                  </button>
                </div>
              )}

              {replySent && (
                <div style={{ marginTop: '40px', textAlign: 'center', color: '#8ab8a0', fontFamily: "'Dancing Script', cursive", fontSize: '1.5rem' }}>
                  Thank you for responding. ✨
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isDone && (
        <div className="counter-dots">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`dot ${i === current ? 'active' : ''}`} />
          ))}
        </div>
      )}

      {isDone && (
        <div className="done-screen show">
          <div className="big-emoji">🌸</div>
          <h2>All Caught Up</h2>
          <p>Thank you for taking the time to read everything.</p>
          <button className="restart-btn" onClick={restart}>Read Again ↻</button>
        </div>
      )}
    </>
  );
}
