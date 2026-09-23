import { useEffect, useState, useRef } from 'react';

interface LoadingOverlayProps {
  progress: number;
  message: string;
}

export function LoadingOverlay({ progress, message }: LoadingOverlayProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => setFadeOut(true), 300);
      const timer2 = setTimeout(() => setVisible(false), 1100);
      return () => { clearTimeout(timer); clearTimeout(timer2); };
    }
  }, [progress]);

  if (!visible) return null;

  return (
    <div className="loading-overlay" style={{
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.8s ease'
    }}>
      <h1>⛪ STIFTSHÜTTE VR</h1>
      <p>{message}</p>
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p style={{ marginTop: '1rem', fontSize: '0.75rem', opacity: 0.5 }}>
        Exodus 25-40 · Bibel-Erlebnis
      </p>
    </div>
  );
}