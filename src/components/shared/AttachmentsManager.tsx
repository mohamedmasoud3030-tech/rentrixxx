import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Attachment as AttachmentType } from '../../types';
import { Paperclip, Eye, Trash2, Loader2 } from 'lucide-react';
import { toArabicDigits } from '../../utils/helpers';
import { toast } from 'react-hot-toast';
import { deleteAttachment, getAttachmentUrl, uploadAttachment } from '../../services/attachmentService';

interface AttachmentsManagerProps {
    entityType: AttachmentType['entityType'];
    entityId: string;
}

const MAX_FILE_MB = 10;
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const AttachmentsManager: React.FC<AttachmentsManagerProps> = ({ entityType, entityId }) => {
    const { db, dataService } = useApp();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = React.useState(false);
    const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'uploading' | 'done' | 'error'>('idle');

    const attachments = useMemo(() => {
        return (db.attachments || []).filter(att => att.entityType === entityType && att.entityId === entityId);
    }, [db.attachments, entityType, entityId]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        setUploadStatus('uploading');
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                    toast.error(`نوع الملف غير مسموح: ${file.name}. المسموح PDF/JPG/PNG/WEBP فقط.`);
                    continue;
                }
                if (file.size > MAX_FILE_MB * 1024 * 1024) {
                    toast.error(`الملف "${file.name}" أكبر من ${MAX_FILE_MB} ميجابايت.`);
                    continue;
                }

                try {
                    const { path } = await uploadAttachment(file, { entityType, entityId });
                    await dataService.add('attachments', {
                        entityType,
                        entityId,
                        fileName: file.name,
                        mimeType: file.type || 'application/octet-stream',
                        fileSize: file.size,
                        storagePath: path,
                    });
                } catch (error) {
                    console.error('Error uploading file', error);
                    setUploadStatus('error');
                    toast.error(`حدث خطأ أثناء رفع الملف "${file.name}".`);
                }
            }
            setUploadStatus('done');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleView = async (path?: string, fallbackDataUrl?: string) => {
        try {
            const url = path ? await getAttachmentUrl(path) : fallbackDataUrl;
            if (!url) {
                toast.error('تعذر فتح الملف.');
                return;
            }
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.error('Error opening attachment', error);
            toast.error('تعذر فتح المرفق.');
        }
    };

    const handleDelete = async (attachment: AttachmentType) => {
        try {
            if (attachment.storagePath) {
                await deleteAttachment(attachment.storagePath);
            }
            await dataService.remove('attachments', attachment.id);
            toast.success('تم حذف المرفق.');
        } catch (error) {
            console.error('Error deleting attachment', error);
            toast.error('تعذر حذف المرفق.');
        }
    };

    return (
        <div className="pt-4 border-t border-border mt-4">
            <h4 className="text-md font-bold mb-3 flex items-center gap-2">
                <Paperclip size={18} />
                المرفقات ({toArabicDigits(attachments.length)})
            </h4>
            <div className="space-y-2 mb-4">
                {attachments.map(att => {
                    const name = att.fileName || att.name || 'ملف';
                    const size = att.fileSize || att.size || 0;
                    return (
                        <div key={att.id} className="flex justify-between items-center p-2 bg-background rounded-md text-sm">
                            <div className="flex flex-col min-w-0">
                                <span className="truncate font-medium" title={name}>{name}</span>
                                {size > 0 && (
                                    <span className="text-xs text-text-muted">{formatBytes(size)}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 mr-2">
                                <button type="button" onClick={() => handleView(att.storagePath, att.dataUrl)} className="text-primary hover:text-opacity-80" title="عرض"><Eye size={16} /></button>
                                <button type="button" onClick={() => handleDelete(att)} className="text-red-500 hover:text-red-700" title="حذف"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <label className={`w-full text-center cursor-pointer bg-background hover:bg-opacity-80 text-text font-bold py-2 px-4 rounded-md inline-flex items-center justify-center gap-2 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                {uploading
                    ? <><Loader2 size={16} className="animate-spin" /> جاري الرفع...</>
                    : <span>إضافة مرفق</span>
                }
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                />
            </label>
            <p className="text-xs text-text-muted text-center mt-1">
                {uploadStatus === 'uploading' && 'الحالة: جاري الرفع...'}
                {uploadStatus === 'done' && 'الحالة: تم الرفع بنجاح'}
                {uploadStatus === 'error' && 'الحالة: حدث خطأ أثناء رفع بعض الملفات'}
                {uploadStatus === 'idle' && `الحد الأقصى للملف ${MAX_FILE_MB} MB`}
            </p>
        </div>
    );
};

export default AttachmentsManager;
