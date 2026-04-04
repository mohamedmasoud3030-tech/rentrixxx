import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'sm:max-w-xl',
  md: 'sm:max-w-3xl',
  lg: 'sm:max-w-4xl',
  xl: 'sm:max-w-6xl',
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end p-0 sm:items-center sm:justify-center sm:p-4 md:p-6 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={modalRef}
        className={`
          bg-surface-container-low text-on-surface w-full flex flex-col border border-outline-variant/60
          rounded-t-3xl sm:rounded-xl
          max-h-[96vh] sm:max-h-[92vh]
          sm:w-[min(100%,_96vw)]
          ${sizeMap[size]}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-outline-variant/50 flex-shrink-0">
          <h3 className="text-base sm:text-lg font-extrabold text-on-surface">{title}</h3>
          <button onClick={onClose} className="flex items-center justify-center w-10 h-10 rounded-xl border border-outline-variant/60 bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors active:scale-95">
            <X size={19} />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
