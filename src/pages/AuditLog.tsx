import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Snapshot } from '../types';
import { exportAuditCsv } from '../services/auditEngine';
import Card from '../components/ui/Card';
import ConfirmActionModal from '../components/shared/ConfirmActionModal';
import { PlusCircle, RotateCcw, XCircle, Search, Download } from 'lucide-react';
import { formatDateTime } from '../utils/helpers';
import { toast } from 'react-hot-toast';

const ACTION_FILTER_OPTIONS = ['CREATE', 'UPDATE', 'DELETE', 'VOID', 'LOGIN', 'LOGOUT'];
const ENTITY_FILTER_OPTIONS = ['contracts', 'receipts', 'invoices', 'users', 'settings'];

// Helper function for styling actions
const getActionClass = (action: string) => {
    if (action.includes('CREATE') || action.includes('LOGIN')) return 'text-green-600 dark:text-green-400';
    if (action.includes('UPDATE') || action.includes('SNAPSHOT')) return 'text-blue-600 dark:text-blue-400';
    if (action.includes('DELETE') || action.includes('VOID') || action.includes('WIPE')) return 'text-red-600 dark:text-red-400';
    if (action.includes('LOCK') || action.includes('READ_ONLY')) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-text-muted';
};

const AuditLog: React.FC = () => {
    const { db, createSnapshot, restoreBackup } = useApp();
    
    // State for filtering the audit log
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState('all');
    const [selectedAction, setSelectedAction] = useState('all');
    const [selectedEntity, setSelectedEntity] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [snapshotToRestore, setSnapshotToRestore] = useState<Snapshot | null>(null);

    const handleCreateSnapshot = () => {
        const note = prompt("يرجى إدخال ملاحظة لنقطة الاستعادة (مثال: 'قبل تعديلات نهاية الشهر'):");
        if (note) {
            createSnapshot(note);
        }
    };

    const handleRestore = (snapshot: Snapshot) => {
        setSnapshotToRestore(snapshot);
    };

    const handleConfirmRestore = () => {
        if (!snapshotToRestore) return;
        const snapshotDataString = JSON.stringify(snapshotToRestore.data);
        restoreBackup(snapshotDataString);
        setSnapshotToRestore(null);
    };

    const uniqueUsers = useMemo(() => ['all', ...Array.from(new Set((db.auditLog || []).map(log => log.username)))], [db.auditLog]);

    const filteredLog = useMemo(() => {
        const auditLog = db.auditLog || [];
        return auditLog.filter(log => {
            const matchesSearch =
                searchTerm === '' ||
                log.entityId.includes(searchTerm) ||
                log.note.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesUser = selectedUser === 'all' || log.username === selectedUser;
            const matchesAction = selectedAction === 'all' || log.action === selectedAction;
            const matchesEntity = selectedEntity === 'all' || log.entity === selectedEntity;

            const logDate = new Date(log.ts);
            const startDateObj = startDate ? new Date(`${startDate}T00:00:00`) : null;
            const endDateObj = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
            const matchesStartDate = !startDateObj || logDate >= startDateObj;
            const matchesEndDate = !endDateObj || logDate <= endDateObj;

            return matchesSearch && matchesUser && matchesAction && matchesEntity && matchesStartDate && matchesEndDate;
        });
    }, [db.auditLog, searchTerm, selectedUser, selectedAction, selectedEntity, startDate, endDate]);

    const handleExportCsv = () => {
        if (filteredLog.length === 0) {
            toast.error('لا توجد بيانات لتصديرها.');
            return;
        }

        const csv = exportAuditCsv(filteredLog);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const resetFilters = () => {
        setSearchTerm('');
        setSelectedUser('all');
        setSelectedAction('all');
        setSelectedEntity('all');
        setStartDate('');
        setEndDate('');
    };

    return (
        <>
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">نقاط استعادة النظام (Snapshots)</h2>
                    <button onClick={handleCreateSnapshot} className="btn btn-primary flex items-center gap-2">
                        <PlusCircle size={16} />
                        إنشاء نقطة استعادة
                    </button>
                </div>
                <p className="text-sm text-text-muted mb-4">
                    هذه الأداة بمثابة "زر تراجع كبير" للنظام. استخدمها قبل العمليات الكبيرة للتمكن من استعادة النظام بالكامل إلى حالة سابقة عند حدوث خطأ كبير.
                </p>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {(db.snapshots || []).length > 0 ? (
                        (db.snapshots || []).map(snapshot => (
                            <div key={snapshot.id} className="bg-background rounded-md p-3 flex justify-between items-center">
                                <div>
                                    <p className="font-bold">{snapshot.note}</p>
                                    <p className="text-xs text-text-muted">{formatDateTime(new Date(snapshot.ts).toISOString())}</p>
                                </div>
                                <button onClick={() => handleRestore(snapshot)} className="btn btn-danger flex items-center gap-2">
                                    <RotateCcw size={16} />
                                    استعادة لهذه النقطة
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-text-muted py-4">لا توجد نقاط استعادة محفوظة.</p>
                    )}
                </div>
            </Card>

            <Card>
                <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="text-xl font-bold">سجل تدقيق العمليات</h2>
                    <button onClick={handleExportCsv} className="btn btn-secondary flex items-center gap-2">
                        <Download size={16} />
                        تصدير CSV
                    </button>
                </div>
                <p className="text-sm text-text-muted mb-6">هنا يمكنك مراقبة جميع العمليات التي تحدث في النظام بدقة (إنشاء، تعديل، حذف، ...إلخ). استخدم الفلاتر للبحث عن حركات معينة.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 border border-border rounded-md">
                    <div className="md:col-span-2 relative">
                         <label className="text-xs text-text-muted">بحث بالمعرّف أو الملاحظات</label>
                        <input
                            type="text"
                            placeholder="بحث..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pr-10"
                        />
                         <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted mt-2.5" />
                    </div>
                    <div>
                         <label className="text-xs text-text-muted">من تاريخ</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full" />
                    </div>
                    <div>
                         <label className="text-xs text-text-muted">إلى تاريخ</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full" />
                    </div>
                    <div>
                         <label className="text-xs text-text-muted">فلترة بالمستخدم</label>
                        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                            {uniqueUsers.map((user: string) => <option key={user} value={user}>{user === 'all' ? 'كل المستخدمين' : user}</option>)}
                        </select>
                    </div>
                    <div>
                         <label className="text-xs text-text-muted">فلترة بالإجراء</label>
                        <select value={selectedAction} onChange={e => setSelectedAction(e.target.value)}>
                            <option value="all">كل الإجراءات</option>
                            {ACTION_FILTER_OPTIONS.map(action => <option key={action} value={action}>{action}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-text-muted">فلترة بالكيان</label>
                        <select value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)}>
                            <option value="all">كل الكيانات</option>
                            {ENTITY_FILTER_OPTIONS.map(entity => <option key={entity} value={entity}>{entity}</option>)}
                        </select>
                    </div>
                    {(searchTerm || selectedUser !== 'all' || selectedAction !== 'all' || selectedEntity !== 'all' || startDate || endDate) && (
                        <div className="md:col-span-4">
                            <button onClick={resetFilters} className="w-full md:w-auto btn btn-ghost flex items-center justify-center gap-2 text-sm">
                                <XCircle size={16} /> تصفية الفلاتر
                            </button>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right border-collapse border border-border">
                        <thead className="text-xs uppercase bg-background text-text">
                            <tr>
                                <th scope="col" className="px-6 py-3 border border-border">الوقت</th>
                                <th scope="col" className="px-6 py-3 border border-border">المستخدم</th>
                                <th scope="col" className="px-6 py-3 border border-border">الإجراء</th>
                                <th scope="col" className="px-6 py-3 border border-border">الكيان</th>
                                <th scope="col" className="px-6 py-3 border border-border">معرّف الكيان</th>
                                <th scope="col" className="px-6 py-3 border border-border">ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLog.slice(0, 200).map(log => (
                                <tr key={log.id} className="bg-card hover:bg-background">
                                    <td className="px-6 py-4 whitespace-nowrap border border-border">{formatDateTime(new Date(log.ts).toISOString())}</td>
                                    <td className="px-6 py-4 border border-border">{log.username}</td>
                                    <td className={`px-6 py-4 font-mono font-bold border border-border ${getActionClass(log.action)}`}>{log.action}</td>
                                    <td className="px-6 py-4 border border-border">{log.entity}</td>
                                    <td className="px-6 py-4 text-xs font-mono border border-border" title={log.entityId}>{log.entityId.slice(0, 8)}...</td>
                                    <td className="px-6 py-4 border border-border">{log.note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredLog.length === 0 && (
                        <div className="text-center py-8 text-text-muted">
                            <p>لا توجد نتائج تطابق بحثك.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
        <ConfirmActionModal
            isOpen={!!snapshotToRestore}
            onClose={() => setSnapshotToRestore(null)}
            onConfirm={handleConfirmRestore}
            title="تأكيد استعادة النظام"
            message={snapshotToRestore
                ? `تحذير! هل أنت متأكد من أنك تريد استعادة النظام إلى الحالة التي كان عليها في "${formatDateTime(new Date(snapshotToRestore.ts).toISOString())}"؟ سيتم فقدان جميع التغييرات التي تمت بعد هذا التاريخ. لا يمكن التراجع عن هذا الإجراء.`
                : ''}
            confirmLabel="استعادة الآن"
            tone="danger"
        />
        </>
    );
};

export default AuditLog;
