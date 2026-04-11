import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AuditIssue } from '../types';
import { runDataIntegrityAudit } from '../services/auditEngine';
import Card from '../components/ui/Card';
import { AlertTriangle, AlertCircle, Info, RefreshCw, ChevronsRight, SearchCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { migrateAttachments } from '../utils/migrateAttachments';
import { toast } from 'react-hot-toast';
import { AR_LABELS } from '../config/labels.ar';

const IssueCard: React.FC<{ issue: AuditIssue }> = ({ issue }) => {
    const icons = {
        ERROR: <AlertTriangle className="h-6 w-6 text-red-500" />,
        WARNING: <AlertCircle className="h-6 w-6 text-yellow-500" />,
        INFO: <Info className="h-6 w-6 text-blue-500" />,
    };
    const colors = {
        ERROR: 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300',
        WARNING: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
        INFO: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
    };

    return (
        <div className={`p-4 border-r-4 rounded-md shadow-sm ${colors[issue.severity]}`}>
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0">{icons[issue.severity]}</div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg">{issue.title}</h3>
                    <p className="mt-1 text-sm">{issue.description}</p>
                    {issue.entityIdentifier && (
                         <p className="mt-2 text-xs font-mono bg-background p-2 rounded-md inline-block">
                           السجل المتأثر: {issue.entityIdentifier} (ID: {issue.entityId?.slice(0, 8)}...)
                        </p>
                    )}
                </div>
                {issue.resolutionPath && (
                    <Link to={issue.resolutionPath} className="btn btn-ghost text-sm flex items-center gap-1 self-center">
                        اذهب للإصلاح <ChevronsRight size={16} />
                    </Link>
                )}
            </div>
        </div>
    );
};


const DataIntegrityAudit: React.FC = () => {
    const { db, auth } = useApp();
    const [issues, setIssues] = useState<AuditIssue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isMigratingAttachments, setIsMigratingAttachments] = useState(false);
    const [lastRun, setLastRun] = useState<Date | null>(null);

    const handleRunAudit = () => {
        setIsLoading(true);
        // Simulate a short delay for better UX
        setTimeout(() => {
            const auditResults = runDataIntegrityAudit(db);
            setIssues(auditResults);
            setLastRun(new Date());
            setIsLoading(false);
        }, 500);
    };

    const errors = issues.filter(i => i.severity === 'ERROR');
    const warnings = issues.filter(i => i.severity === 'WARNING');
    const infos = issues.filter(i => i.severity === 'INFO');

    const handleMigrateAttachments = async () => {
        if (auth.currentUser?.role !== 'ADMIN') {
            toast.error('هذه العملية متاحة للمدير فقط.');
            return;
        }
        setIsMigratingAttachments(true);
        try {
            const migratedCount = await migrateAttachments();
            toast.success(`اكتملت الهجرة. عدد العناصر المعالجة: ${migratedCount}`);
        } catch (error) {
            console.error(error);
            toast.error('فشلت عملية ترحيل المرفقات.');
        } finally {
            setIsMigratingAttachments(false);
        }
    };

    return (
        <Card>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <div className="flex-grow">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <SearchCheck /> أداة تدقيق سلامة البيانات
                    </h2>
                     <p className="text-sm text-text-muted mt-1">
                        تقوم هذه الأداة بفحص النظام لكشف انقطاع تدفق البيانات، الأخطاء في العلاقات، وأسباب ظهور التقارير فارغة.
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <button onClick={handleRunAudit} disabled={isLoading} className="btn btn-primary flex items-center gap-2">
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            {isLoading ? 'جاري الفحص...' : 'بدء فحص النظام'}
                        </button>
                        <button onClick={handleMigrateAttachments} disabled={isMigratingAttachments || auth.currentUser?.role !== 'ADMIN'} className="btn btn-secondary">
                            {isMigratingAttachments ? 'جاري ترحيل المرفقات...' : AR_LABELS.migrateAttachments}
                        </button>
                    </div>
                </div>
            </div>
           
            {lastRun ? (
                <div className="space-y-6">
                    <p className="text-center text-sm text-text-muted">
                        تم العثور على {issues.length} مشكلة. آخر فحص تم في: {lastRun.toLocaleTimeString('ar-EG')}
                    </p>

                    {/* Errors Section */}
                    {errors.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold mb-3 text-red-600">أخطاء حرجة ({errors.length})</h3>
                            <div className="space-y-3">
                                {errors.map(issue => <IssueCard key={issue.id} issue={issue} />)}
                            </div>
                        </div>
                    )}
                     {/* Warnings Section */}
                    {warnings.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold mb-3 text-yellow-600">تحذيرات ({warnings.length})</h3>
                            <div className="space-y-3">
                                {warnings.map(issue => <IssueCard key={issue.id} issue={issue} />)}
                            </div>
                        </div>
                    )}
                     {/* Info Section */}
                    {infos.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold mb-3 text-blue-600">معلومات تشخيصية ({infos.length})</h3>
                            <div className="space-y-3">
                                {infos.map(issue => <IssueCard key={issue.id} issue={issue} />)}
                            </div>
                        </div>
                    )}

                    {issues.length === 0 && (
                        <div className="text-center py-10 text-green-600">
                            <p className="font-bold">✓ لم يتم العثور على أي مشاكل. تبدو بيانات النظام سليمة.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-20">
                    <p className="text-text-muted">اضغط على "بدء فحص النظام" لتشخيص أي مشاكل محتملة.</p>
                </div>
            )}
        </Card>
    );
};

export default DataIntegrityAudit;
