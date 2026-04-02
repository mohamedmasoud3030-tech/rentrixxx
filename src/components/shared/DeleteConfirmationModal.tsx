import React from 'react';
import Modal from '../ui/Modal';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-4">
        <div className="flex gap-3 items-start bg-rose-50 border border-rose-200 rounded-lg p-3">
          <AlertTriangle className="text-rose-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-rose-800">{message}</p>
        </div>
        
        <p className="text-xs text-text-muted">هذا الإجراء لا يمكن التراجع عنه.</p>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading || isLoading}
            className="btn btn-ghost"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || isLoading}
            className="btn bg-rose-600 text-white hover:bg-rose-700"
          >
            {loading || isLoading ? 'جاري الحذف...' : 'حذف'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmationModal;
