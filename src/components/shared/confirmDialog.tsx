import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Modal from '../ui/Modal';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

const ConfirmDialogHost: React.FC<ConfirmDialogOptions & { onResolve: (value: boolean) => void }> = ({
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  tone = 'danger',
  onResolve,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const closeWith = useCallback((value: boolean) => {
    setIsOpen(false);
    onResolve(value);
  }, [onResolve]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeWith(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeWith]);

  return (
    <Modal isOpen={isOpen} onClose={() => closeWith(false)} title={title} size="sm">
      <div className="modal-content">
        <p className="text-sm leading-7 text-text">{message}</p>
        <div className="modal-actions">
          <button type="button" onClick={() => closeWith(false)} className="btn btn-ghost">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => closeWith(true)}
            className={tone === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const confirmDialog = (options: ConfirmDialogOptions): Promise<boolean> => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);

  return new Promise<boolean>((resolve) => {
    const finalize = (value: boolean) => {
      resolve(value);
      setTimeout(() => {
        root.unmount();
        host.remove();
      }, 0);
    };

    root.render(<ConfirmDialogHost {...options} onResolve={finalize} />);
  });
};

export type { ConfirmDialogOptions };
