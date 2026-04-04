import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Lead } from '../types';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { TableShell, Table, TableHead, TableBody, TableRow, TableHeadCell, TableCell } from '../components/ui/Table';
import ActionsMenu, { EditAction, DeleteAction } from '../components/shared/ActionsMenu';
import { getStatusBadgeVariant, normalizeArabicNumerals, exportToCsv } from '../utils/helpers';
import { UserPlus, MessageCircle, Download } from 'lucide-react';
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

    const handleExportLeads = () => {
        const data = db.leads.map(l => ({
            'الاسم': l.name,
            'الهاتف': l.phone || '—',
            'البريد الإلكتروني': l.email || '—',
            'الحالة': getStatusLabel(l.status),
            'ميزانية': l.minBudget || l.maxBudget ? `${l.minBudget || 0} - ${l.maxBudget || 0}` : '—',
            'نوع الوحدة المطلوبة': l.desiredUnitType || '—',
            'تاريخ الإضافة': new Date(l.createdAt).toLocaleDateString('ar')
        }));
        exportToCsv('عملاء_محتملين_rentrix', data);
    };

    return (
        <Card variant="elevated">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><UserPlus /> العملاء المحتملين</h2>
                <div className="flex gap-2">
                    <Button onClick={handleExportLeads} variant="secondary">
                        <Download size={14} />
                        تصدير CSV
                    </Button>
                    <Button onClick={() => handleOpenFormModal()}>إضافة عميل محتمل</Button>
                </div>
            </div>
            <TableShell>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeadCell scope="col">الاسم</TableHeadCell>
                            <TableHeadCell scope="col">الهاتف</TableHeadCell>
                            <TableHeadCell scope="col">البريد الإلكتروني</TableHeadCell>
                            <TableHeadCell scope="col">الحالة</TableHeadCell>
                            <TableHeadCell scope="col">إجراءات</TableHeadCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {db.leads.map(lead => (
                            <TableRow key={lead.id}>
                                <TableCell className="font-medium">{lead.name}</TableCell>
                                <TableCell>{lead.phone}</TableCell>
                                <TableCell>{lead.email || '—'}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusBadgeVariant(lead.status)}>
                                        {getStatusLabel(lead.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <ActionsMenu items={[
                                        EditAction(() => handleOpenFormModal(lead)),
                                        { label: 'مراسلة واتساب', icon: <MessageCircle size={16} />, onClick: () => handleOpenWhatsAppModal(lead) },
                                        // FIX: Use dataService for data manipulation
                                        DeleteAction(async () => await dataService.remove('leads', lead.id)),
                                    ]} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableShell>
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
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSavingRef.current) return;
        if (!name || !phone) {
            toast.error("الاسم والهاتف مطلوبان.");
            return;
        }

        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data = { name, phone, email, desiredUnitType, minBudget, maxBudget, status, notes };
            if (lead) {
                await dataService.update('leads', lead.id, data);
            } else {
                await dataService.add('leads', data);
            }
            onClose();
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={lead ? 'تعديل عميل محتمل' : 'إضافة عميل محتمل'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="lead-name" className="block text-sm font-medium mb-1">الاسم</label>
                        <Input id="lead-name" type="text" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="lead-phone" className="block text-sm font-medium mb-1">الهاتف</label>
                        <Input id="lead-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="lead-email" className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                        <Input id="lead-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="lead-unittype" className="block text-sm font-medium mb-1">نوع الوحدة المطلوبة</label>
                        <Input id="lead-unittype" type="text" value={desiredUnitType} onChange={e => setDesiredUnitType(e.target.value)} placeholder="مثال: شقة غرفتين"/>
                    </div>
                    <div>
                        <label htmlFor="lead-minbudget" className="block text-sm font-medium mb-1">أقل ميزانية ({settings.operational?.currency ?? 'OMR'})</label>
                        <Input id="lead-minbudget" type="number" value={minBudget || ''} onChange={e => setMinBudget(Number(normalizeArabicNumerals(e.target.value)) || undefined)} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">أعلى ميزانية ({settings.operational?.currency ?? 'OMR'})</label>
                        <Input type="number" value={maxBudget || ''} onChange={e => setMaxBudget(Number(normalizeArabicNumerals(e.target.value)) || undefined)} />
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
                    <Button type="button" onClick={onClose} variant="ghost" disabled={isSaving}>إلغاء</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default Leads;
