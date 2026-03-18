import { useState, useCallback } from 'react';
import './RippleEffect.css';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

let rippleCounter = 0;

export function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const triggerRipple = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++rippleCounter;

    setRipples((prev) => [...prev, { id, x, y }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  }, []);

  const rippleElements = ripples.map((r) => (
    <span
      key={r.id}
      className="ripple"
      style={{ left: r.x, top: r.y }}
    />
  ));

  return { triggerRipple, rippleElements };
}
