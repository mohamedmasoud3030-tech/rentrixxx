import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Lead } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import { getStatusBadgeClass } from '../utils/helpers';
import { UserPlus, MessageCircle } from 'lucide-react';
import WhatsAppModal from '../components/shared/WhatsAppModal';
import { toast } from 'react-hot-toast';

const Leads: React.FC = () => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsAppRecipient, setWhatsAppRecipient] = useState<{name: string, phone: string} | null>(null);

    const handleOpenFormModal = (lead: Lead | null = null) => {
        setEditingLead(lead);
        setIsFormModalOpen(true);
    };
    
    const handleOpenWhatsAppModal = (lead: Lead) => {
        if (!lead.phone) {
            toast.error('لا يوجد رقم هاتف لهذا العميل.');
            return;
        }
        setWhatsAppRecipient({ name: lead.name, phone: lead.phone });
        setIsWhatsAppModalOpen(true);
    };

    const handleCloseAllModals = () => {
        setIsFormModalOpen(false);
        setIsWhatsAppModalOpen(false);
        setEditingLead(null);
        setWhatsAppRecipient(null);
    };

    const getStatusLabel = (status: Lead['status']) => {
        const map = {
            'NEW': 'جديد', 'CONTACTED': 'تم التواصل', 'INTERESTED': 'مهتم',
            'NOT_INTERESTED': 'غير مهتم', 'CLOSED': 'مغلق'
        };
        return map[status] || status;
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><UserPlus /> العملاء المحتملين</h2>
                <button onClick={() => handleOpenFormModal()} className="btn btn-primary">إضافة عميل محتمل</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse border border-border">
                    <thead className="text-xs uppercase bg-background text-text">
                        <tr>
                            <th scope="col" className="px-6 py-3 border border-border">الاسم</th>
                            <th scope="col" className="px-6 py-3 border border-border">الهاتف</th>
                            <th scope="col" className="px-6 py-3 border border-border">البريد الإلكتروني</th>
                            <th scope="col" className="px-6 py-3 border border-border">الحالة</th>
                            <th scope="col" className="px-6 py-3 border border-border">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {db.leads.map(lead => (
                            <tr key={lead.id} className="bg-card hover:bg-background">
                                <td className="px-6 py-4 font-medium text-text border border-border">{lead.name}</td>
                                <td className="px-6 py-4 border border-border">{lead.phone}</td>
                                <td className="px-6 py-4 border border-border">{lead.email || '—'}</td>
                                <td className="px-6 py-4 border border-border">
                                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(lead.status)}`}>
                                        {getStatusLabel(lead.status)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 border border-border">
                                    <ActionsMenu items={[
                                        EditAction(() => handleOpenFormModal(lead)),
                                        { label: 'مراسلة واتساب', icon: <MessageCircle size={16} />, onClick: () => handleOpenWhatsAppModal(lead) },
                                        // FIX: Use dataService for data manipulation
                                        DeleteAction(() => dataService.remove('leads', lead.id)),
                                    ]} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <LeadForm isOpen={isFormModalOpen} onClose={handleCloseAllModals} lead={editingLead} />
             {whatsAppRecipient && (
                <WhatsAppModal
                    isOpen={isWhatsAppModalOpen}
                    onClose={handleCloseAllModals}
                    recipientName={whatsAppRecipient.name}
                    recipientPhone={whatsAppRecipient.phone}
                />
            )}
        </Card>
    );
};


const LeadForm: React.FC<{ isOpen: boolean, onClose: () => void, lead: Lead | null }> = ({ isOpen, onClose, lead }) => {
    // FIX: Use dataService for data manipulation
    const { dataService, settings } = useApp();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [desiredUnitType, setDesiredUnitType] = useState('');
    const [minBudget, setMinBudget] = useState<number | undefined>();
    const [maxBudget, setMaxBudget] = useState<number | undefined>();
    const [status, setStatus] = useState<Lead['status']>('NEW');
    const [notes, setNotes] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (lead) {
                setName(lead.name);
                setPhone(lead.phone);
                setEmail(lead.email || '');
                setDesiredUnitType(lead.desiredUnitType || '');
                setMinBudget(lead.minBudget);
                setMaxBudget(lead.maxBudget);
                setStatus(lead.status);
                setNotes(lead.notes);
            } else {
                setName('');
                setPhone('');
                setEmail('');
                setDesiredUnitType('');
                setMinBudget(undefined);
                setMaxBudget(undefined);
                setStatus('NEW');
                setNotes('');
            }
        }
    }, [lead, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone) {
            toast.error("الاسم والهاتف مطلوبان.");
            return;
        }

        const data = { name, phone, email, desiredUnitType, minBudget, maxBudget, status, notes };
        if (lead) {
            // FIX: Use dataService for data manipulation
            dataService.update('leads', lead.id, data);
        } else {
            // FIX: Use dataService for data manipulation
            dataService.add('leads', data as any);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={lead ? 'تعديل عميل محتمل' : 'إضافة عميل محتمل'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الاسم</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الهاتف</label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">نوع الوحدة المطلوبة</label>
                        <input type="text" value={desiredUnitType} onChange={e => setDesiredUnitType(e.target.value)} placeholder="مثال: شقة غرفتين"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">أقل ميزانية ({settings.operational?.currency ?? 'OMR'})</label>
                        <input type="number" value={minBudget || ''} onChange={e => setMinBudget(Number(e.target.value) || undefined)} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">أعلى ميزانية ({settings.operational?.currency ?? 'OMR'})</label>
                        <input type="number" value={maxBudget || ''} onChange={e => setMaxBudget(Number(e.target.value) || undefined)} />
                    </div>
                </div>
                <div>
                     <label className="block text-sm font-medium mb-1">الحالة</label>
                     <select value={status} onChange={e => setStatus(e.target.value as Lead['status'])}>
                        <option value="NEW">جديد</option>
                        <option value="CONTACTED">تم التواصل</option>
                        <option value="INTERESTED">مهتم</option>
                        <option value="NOT_INTERESTED">غير مهتم</option>
                        <option value="CLOSED">مغلق</option>
                     </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">ملاحظات</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                </div>
                 <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                    <button type="button" onClick={onClose} className="btn btn-ghost">إلغاء</button>
                    <button type="submit" className="btn btn-primary">حفظ</button>
                </div>
            </form>
        </Modal>
    );
};

export default Leads;