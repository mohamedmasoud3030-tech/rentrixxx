import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { sanitizePhoneNumber } from '../../utils/helpers';
import { Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipientName: string;
    recipientPhone: string;
}

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, recipientName, recipientPhone }) => {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (!recipientPhone || !message) {
            toast.error("الرجاء إدخال رسالة.");
            return;
        }

        const sanitizedPhone = sanitizePhoneNumber(recipientPhone);
        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/${sanitizedPhone}?text=${encodedMessage}`;

        window.open(url, '_blank');
        onClose();
        setMessage('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`إرسال رسالة واتساب إلى ${recipientName}`}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="whatsapp-message" className="block text-sm font-medium text-text-muted mb-1">
                        نص الرسالة
                    </label>
                    <textarea
                        id="whatsapp-message"
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full rounded-md border-border bg-background p-2"
                        placeholder="اكتب رسالتك هنا..."
                    />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-border">
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleSend}
                        className="px-4 py-2 rounded-md bg-green-600 text-white flex items-center gap-2"
                    >
                        <Send size={16} />
                        إرسال عبر واتساب
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default WhatsAppModal;