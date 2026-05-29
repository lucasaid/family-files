import React, { useEffect, useRef } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number | string;
  height?: string;
  maxHeight?: string;
}

export default function Modal({
  title,
  onClose,
  children,
  width = 'auto',
  height,
  maxHeight = '90vh',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();
    return () => { previousFocusRef.current?.focus(); };
  }, []);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    modal.addEventListener('keydown', onKeyDown);
    return () => modal.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const widthStyle = typeof width === 'number' ? `${width}px` : width;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          width: widthStyle,
          ...(height ? { height } : { maxHeight }),
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 'var(--font-size-title)', fontWeight: 600,
            color: 'var(--text-1)', letterSpacing: 'var(--tracking-tight)',
          }}>
            {title}
          </span>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            className="btn-ghost-hover"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-4)', fontSize: 18, lineHeight: 1, padding: '2px 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflow: height ? 'hidden' : 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
