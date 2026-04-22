import { useEffect, useRef } from 'react';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 20);

    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel?.();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => { if (!busy) onCancel?.(); }}
      />
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
        <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">{title}</h2>
        {message && (
          <div className="text-sm text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">
            {message}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-secondary"
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={danger ? 'btn-danger' : 'btn-primary'}
          >
            {busy ? 'Working...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
