import React, { useRef, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { createBackupFile, importFromJson, validateBackupFile } from '../../services/backupService';
import { confirmDialog } from '../shared/confirmDialog';
import { toast } from 'react-hot-toast';
import { Download } from 'lucide-react';

const BackupSettings: React.FC = () => {
    const { restoreBackup } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const handleBackup = async () => {
        try {
            await createBackupFile();
            toast.success("تم إنشاء النسخة الاحتياطية وتنزيلها بنجاح.");
        } catch (error) {
            toast.error("فشل إنشاء النسخة الاحتياطية.");
            console.error(error);
        }
    };
    
    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const parsedData = await importFromJson(file);
            const validation = validateBackupFile(parsedData);

            if (!validation.valid) {
                setValidationErrors(validation.errors);
                toast.error('الملف غير صالح للاستعادة.');
                return;
            }

            setValidationErrors([]);

            const confirmed = await confirmDialog({
                title: 'تأكيد استعادة النسخة الاحتياطية',
                message: 'تحذير! سيؤدي استعادة نسخة احتياطية إلى استبدال جميع البيانات الحالية. هل أنت متأكد من المتابعة؟',
                confirmLabel: 'استعادة الآن',
                tone: 'danger',
            });
            if (!confirmed) return;

            const payload = parsedData as { data: unknown };
            const dataString = JSON.stringify(payload.data);
            await restoreBackup(dataString);
            // The app will reload automatically after restore
        } catch (error) {
            toast.error("فشل استعادة النسخة الاحتياطية. تأكد من أن الملف صحيح.");
            console.error(error);
        } finally {
            if(event.target) event.target.value = '';
        }
    };

    return (
        <div className="space-y-6">
             <h2 className="text-2xl font-bold">النسخ الاحتياطي والاستعادة</h2>

             <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                 <h3 className="text-lg font-bold text-text">تصدير نسخة احتياطية</h3>
                 <p className="text-sm text-text-muted">
                    قم بتنزيل نسخة كاملة من قاعدة بياناتك بصيغة JSON. احتفظ بهذا الملف في مكان آمن لاستعادة النظام عند الحاجة.
                 </p>
                 <button onClick={handleBackup} className="btn btn-primary flex items-center gap-2">
                    <Download size={16}/> إنشاء نسخة احتياطية
                </button>
             </div>

             <div className="bg-background rounded-lg border border-red-500/50 p-6 space-y-4">
                 <h3 className="text-lg font-bold text-red-600">استعادة من نسخة احتياطية</h3>
                 <p className="text-sm text-text-muted">
                    تحذير: هذه العملية ستقوم بحذف جميع البيانات الحالية واستبدالها بالبيانات من الملف الذي تختاره. لا يمكن التراجع عن هذا الإجراء.
                 </p>
                  <button onClick={handleFileSelect} className="btn btn-danger">
                    اختيار ملف للاستعادة...
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={handleRestore}
                />
                {validationErrors.length > 0 && (
                    <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-600">
                        <p className="font-bold mb-1">أخطاء التحقق من الملف:</p>
                        <ul className="list-disc pr-5 space-y-1">
                            {validationErrors.map(err => (
                                <li key={err}>{err}</li>
                            ))}
                        </ul>
                    </div>
                )}
             </div>
        </div>
    );
};

export default BackupSettings;
