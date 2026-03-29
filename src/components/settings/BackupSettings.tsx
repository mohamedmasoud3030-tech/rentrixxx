import React, { useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { exportToJson, importFromJson } from '../../services/backupService';
import { confirmDialog } from '../shared/confirmDialog';
import { toast } from 'react-hot-toast';
import { Database, Download } from 'lucide-react';

const BackupSettings: React.FC = () => {
    const { createBackup, restoreBackup } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBackup = async () => {
        try {
            const data = await createBackup();
            exportToJson(JSON.parse(data), `Rentrix_Backup_${new Date().toISOString().slice(0,10)}.json`);
            toast.success("تم تنزيل نسخة احتياطية بنجاح.");
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

        const confirmed = await confirmDialog({
            title: 'تأكيد استعادة النسخة الاحتياطية',
            message: 'تحذير! سيؤدي استعادة نسخة احتياطية إلى استبدال جميع البيانات الحالية. هل أنت متأكد من المتابعة؟',
            confirmLabel: 'استعادة الآن',
            tone: 'danger',
        });
        if (!confirmed) return;

        try {
            const data = await importFromJson(file);
            const dataString = JSON.stringify(data);
            await restoreBackup(dataString);
            // The app will reload automatically after restore
        } catch (error) {
            toast.error("فشل استعادة النسخة الاحتياطية. تأكد من أن الملف صحيح.");
            console.error(error);
        }
        // Reset file input
        if(event.target) event.target.value = '';
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
                    <Download size={16}/> تنزيل نسخة احتياطية الآن
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
             </div>
        </div>
    );
};

export default BackupSettings;
