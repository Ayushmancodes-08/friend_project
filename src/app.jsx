import { useState, useEffect, useRef } from 'preact/hooks';
import { DestroyedScreen } from './DestroyedScreen';

const initialCards = [
  {
    label: "External Noise",
    emoji: "🚗💀",
    title: "A Friendly Warning",
    body: "Listen, if all this drama is your own masterpiece, I'll take it. But if some 'well-wisher' is feeding your brain these weird ideas about me... I genuinely hope they trip and find themselves under a speeding car. 😂 Just kidding (mostly). But seriously, stop letting NPCs write the script for us. If someone's putting things in your mind, they better have good insurance.",
    sig: "Protect your peace (and them) 🕵️‍♀️",
    theme: "card-1"
  },
  {
    label: "Inner Chaos",
    emoji: "🧠🌪️",
    title: "The Silent Treatment?",
    body: "Maybe I'm just running a marathon in my own head again, but since we last talked (mostly 1 month ago), I've had this nagging feeling that you don't actually want to talk to me anymore. Is it just my overthinking hitting peak performance levels, or are you actually in airplane mode? Either way, it sucks. Wake up, bro! ",
    sig: "Stop making me overthink, it's exhausting 🧘‍♂️",
    theme: "card-2"
  },
  {
    label: "Ignoring Pro Max",
    emoji: "🎭🏆",
    title: "Award-Winning Performance",
    body: "And haan, beautifully ignoring me, perfectly avoiding conversations... maybe I do understand the reason, but honestly? I really don't want to. Keep up the silent treatment though, it's truly a masterpiece. 💅✨<br/><br/>But don't worry... things will be perfectly fine very, very soon. 😌",
    sig: "Your favorite overthinker 💭",
    theme: "card-3"
  },
  {
    label: "The Roast Session",
    emoji: "💅🧟‍♀️",
    title: "Honest Feedback (No Filter)",
    body: "<div style=\"display: flex; gap: 10px; height: 100%; text-align: left; font-size: 0.85rem;\"><div style=\"flex: 1; border-right: 1px dashed rgba(200, 120, 140, 0.3); padding-right: 8px;\"><strong>THE LIST:</strong><br/>Tu literally Andhi hai, Behri hai, aur upar se super Rude.<br/><br/>Like, how do you manage to ignore everything so perfectly? 🙄</div><div style=\"flex: 1; padding-left: 5px;\"><strong>THE REST:</strong><br/>Arrogant toh blood group hai tera. Certified <b>CHUDAIL</b> vibes. 🧹✨<br/><br/>But hey, at least you're consistent in being a headache.</div></div>",
    sig: "Don't get mad, get better (impossible) 😂",
    theme: "card-4"
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
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);

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
        // Don't re-call /destroy — just sync state quietly from server
        serverCall('/status');
        return;
      }

      // 2. Setup Device ID for session lock
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('deviceId', deviceId);
      }

      // 3. Connect to backend (Non-blocking for UI)
      serverCall('/open', { deviceId }).then(res => {
        if (res) {
          if (res.destroyed) {
            setIsDestroyed(true);
            localStorage.setItem('isDestroyed', 'true');
          } else if (res.locked) {
            setIsLocked(true);
          }
        }
      });
      
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
    }, 250);
  };

  const handleNoReply = () => {
    localStorage.setItem('isDestroyed', 'true');
    // Trigger destroy on backend, then immediately show destroyed screen
    serverCall('/destroy', { replied: false, message: '' });
    // Show destroyed screen right away — don't let the done screen flash
    setTimeout(() => setIsDestroyed(true), 600);
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
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease'
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

      {!acceptedDisclaimer && statusChecked && !isDestroyed && !isLocked && (
        <div className="disclaimer-screen">
          <div className="disclaimer-content">
            <h2 className="disclaimer-title">DISCLAIMER</h2>
            <div className="disclaimer-line"></div>
            <p className="disclaimer-text">
              This digital envelope is strictly intended for <span>Venali Sahoo</span> (my friend before 12th April 2026).
            </p>
            <p className="disclaimer-subtext">
              If you are not the intended recipient, your presence here is a violation of privacy. Please close this tab and ignore its existence immediately.
            </p>
            <button className="enter-btn" onClick={() => {
              serverCall('/disclaimer');
              setAcceptedDisclaimer(true);
            }}>
              ENTER WITH CAUTION
            </button>
          </div>
        </div>
      )}

      {acceptedDisclaimer && (
        <>
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
                <p className="card-body" dangerouslySetInnerHTML={{ __html: card.body.replace(/\n/g, '<br/>') }} />
                <div className="card-sig">{card.sig}</div>
              </div>
            </div>
          ))}

          {/* Special Interaction Card */}
          <div
            className="card-wrapper"
            style={getCardStyle(initialCards.length)}
          >
            <div className="card card-interaction" style={{ background: 'rgba(30, 20, 30, 0.95)', border: '1.5px solid rgba(200,150,170,0.3)' }}>
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
      )}
    </>
  );
}
