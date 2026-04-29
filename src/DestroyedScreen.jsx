import { useEffect } from 'preact/hooks';

export function DestroyedScreen() {
  // Block all keyboard shortcuts and right-click
  useEffect(() => {
    const block = (e) => e.preventDefault();
    document.addEventListener('keydown', block);
    document.addEventListener('contextmenu', block);
    return () => {
      document.removeEventListener('keydown', block);
      document.removeEventListener('contextmenu', block);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }}>
      <p style={{
        fontFamily: "'Lora', serif",
        fontSize: 'clamp(1rem, 4vw, 1.2rem)',
        color: 'rgba(200, 170, 180, 0.4)',
        letterSpacing: '0.12em',
        textAlign: 'center',
        padding: '0 32px',
        fontStyle: 'italic',
      }}>
        This message has expired.
      </p>
    </div>
  );
}
