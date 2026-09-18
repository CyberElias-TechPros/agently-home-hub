import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Delay in ms before the reveal transition starts. */
  delay?: number;
  /** Direction of entry. */
  from?: 'up' | 'down' | 'left' | 'right' | 'none';
  as?: keyof JSX.IntrinsicElements;
}

const offsetMap = {
  up: 'translateY(28px)',
  down: 'translateY(-28px)',
  left: 'translateX(-32px)',
  right: 'translateX(32px)',
  none: 'none',
};

/**
 * Scroll-triggered reveal with IntersectionObserver — fires once when the
 * element enters the viewport, then stays visible.
 */
export default function Reveal({ children, className, delay = 0, from = 'up', as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as as any;

  return (
    <Tag
      ref={ref}
      className={cn('reveal-base', visible && 'reveal-in', className)}
      style={{
        transitionDelay: `${delay}ms`,
        // Set initial transform direction via inline style, overriding the base
        ...(from !== 'up' ? { transform: visible ? 'translateY(0)' : offsetMap[from] } : {}),
      }}
    >
      {children}
    </Tag>
  );
}
