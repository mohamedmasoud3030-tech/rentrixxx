
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/modal';
import { templates } from '../../services/whatsappService';
import { IntegrationService } from '../../services/integrationService';
import { Send } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Tenant, Receipt } from '../../types';
import { toast } from 'react-hot-toast';

interface ComposerContext {
    recipient: { name: string, phone: string };
    type: 'tenant' | 'owner' | 'receipt';
    data: {
        tenant?: Tenant;
        receipt?: Receipt;
    };
}

interface WhatsAppComposerModalProps {
    isOpen: boolean;
    onClose: () => void;
    context: ComposerContext | null;
}

export const WhatsAppComposerModal: React.FC<WhatsAppComposerModalProps> = ({ isOpen, onClose, context }) => {
    const { db, contractBalances } = useApp();
    const [templateKey, setTemplateKey] = useState('custom');
    const [message, setMessage] = useState('');

    const availableTemplates = useMemo(() => {
        const baseTemplates = [{ key: 'custom', name: 'رسالة مخصصة' }];
        if (!context) return baseTemplates;

        switch (context.type) {
            case 'tenant':
                baseTemplates.push({ key: 'welcome', name: 'رسالة ترحيب' });
                baseTemplates.push({ key: 'latePayment', name: 'تذكير بالدفع' });
                break;
            case 'receipt':
                baseTemplates.push({ key: 'receipt', name: 'تأكيد استلام' });
                break;
            case 'owner':
                // Add owner templates if any
                break;
        }
        return baseTemplates;
    }, [context]);

    // Effect to reset state when modal opens/closes or context changes
    useEffect(() => {
        if (isOpen) {
            setTemplateKey('custom');
            setMessage('');
        }
    }, [isOpen, context]);

    // Effect to generate message from template when templateKey changes
    useEffect(() => {
        if (!isOpen || !context || templateKey === 'custom' || !db) {
            return;
        }

        let generatedMessage = '';
        switch (templateKey) {
            case 'welcome':
                if (!context.data.tenant) break;
                const tenant = context.data.tenant;
                const contract = db.contracts.find(c => c.tenantId === tenant.id && c.status === 'ACTIVE');
                const unit = contract ? db.units.find(u => u.id === contract.unitId) : null;
                generatedMessage = templates.welcome(context.recipient.name, unit?.name || 'وحدتكم');
                break;
            case 'latePayment':
                if (!context.data.tenant) break;
                const tenantForLate = context.data.tenant;
                const contractForLate = db.contracts.find(c => c.tenantId === tenantForLate.id && c.status === 'ACTIVE');
                const balance = contractForLate ? contractBalances[contractForLate.id]?.balance || 0 : 0;
                if (balance > 0) {
                    generatedMessage = templates.latePayment(context.recipient.name, balance, 'الفترة الحالية');
                } else {
                    generatedMessage = `عزيزي ${context.recipient.name}, نشكر لكم التزامكم بالسداد. لا توجد عليكم متأخرات حالياً.`;
                }
                break;
            case 'receipt':
                if (!context.data.receipt) break;
                const receipt = context.data.receipt;
                generatedMessage = templates.receipt(receipt.no, receipt.amount);
                break;
        }
        setMessage(generatedMessage);

    }, [templateKey, context, isOpen, db, contractBalances]);

    const handleSend = () => {
        if (!context || !message) {
            toast.error("الرجاء إدخال رسالة.");
            return;
        }
        IntegrationService.sendWhatsApp(context.recipient.phone, message);
        onClose();
    };

    if (!context) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`إرسال واتساب إلى ${context.recipient.name}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">اختر قالب (اختياري)</label>
                    <select value={templateKey} onChange={e => setTemplateKey(e.target.value)}>
                        {availableTemplates.map(t => (
                            <option key={t.key} value={t.key}>{t.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">نص الرسالة</label>
                    <textarea
                        rows={6}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        className="w-full"
                        placeholder="اكتب رسالتك هنا..."
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button
                        type="button"
                        onClick={handleSend}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Send size={16} />
                        إرسال عبر واتساب
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// ─── Simple variant (previously WhatsAppModal.tsx) ────────────────────────────
// Used by Leads.tsx and Tenants.tsx with basic recipientName/recipientPhone props
import { sanitizePhoneNumber } from '../../utils/helpers';

interface SimpleWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientPhone: string;
}

export const WhatsAppModal: React.FC<SimpleWhatsAppModalProps> = ({
  isOpen, onClose, recipientName, recipientPhone,
}) => {
  const [simpleMsg, setSimpleMsg] = useState('');

  const handleSend = () => {
    if (!recipientPhone || !simpleMsg) { toast.error('الرجاء إدخال رسالة.'); return; }
    const url = `https://wa.me/${sanitizePhoneNumber(recipientPhone)}?text=${encodeURIComponent(simpleMsg)}`;
    globalThis.open(url, '_blank');
    onClose();
    setSimpleMsg('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`إرسال رسالة واتساب إلى ${recipientName}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">نص الرسالة</label>
          <textarea rows={5} value={simpleMsg} onChange={e => setSimpleMsg(e.target.value)}
            className="w-full rounded-md border-border bg-background p-2"
            placeholder="اكتب رسالتك هنا..." />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-border">إلغاء</button>
          <button type="button" onClick={handleSend}
            className="px-4 py-2 rounded-md bg-green-600 text-white flex items-center gap-2">
            <Send size={16} />إرسال عبر واتساب
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default WhatsAppModal;
