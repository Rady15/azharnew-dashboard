import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface FloatingDropdownProps {
  open: boolean;
  trigger: HTMLElement | null;
  onClose: () => void;
  align?: 'left' | 'right' | 'center';
  width?: number;
  children: React.ReactNode;
}

// Renders the menu in a portal attached to <body> so it is never clipped by
// scrollable / overflow-hidden table containers. Position is computed from the
// trigger button's viewport rect and kept inside the window.
export function FloatingDropdown({ open, trigger, onClose, align = 'right', width = 176, children }: FloatingDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !trigger) return;
    const update = () => {
      const rect = trigger.getBoundingClientRect();
      let left = align === 'right'
        ? rect.right - width
        : align === 'center'
          ? rect.left + rect.width / 2 - width / 2
          : rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      let top = rect.bottom + 6;
      if (top + 280 > window.innerHeight) top = Math.max(8, rect.top - 280);
      setPos({ top, left });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, trigger, align, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current && menuRef.current.contains(t)) return;
      if (trigger && trigger.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, trigger]);

  if (!open) return null;
  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width, zIndex: 9999 }}
      onMouseLeave={onClose}
    >
      {children}
    </div>,
    document.body
  );
}
