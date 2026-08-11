import { useEffect, useRef } from 'react';

export default function Modal({ title, onClose, children, isOpen = true }) {
  const ref = useRef();

  // ALL hooks must come before any early return (React Rules of Hooks)
  useEffect(() => {
    if (!isOpen) return;  // condition is INSIDE the hook, not before it
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, isOpen]);

  // Early return is safe AFTER all hooks
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" ref={ref}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
