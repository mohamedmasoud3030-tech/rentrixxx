
import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Attachment as AttachmentType } from '../../types';
import { Paperclip, Eye, Trash2, Loader2 } from 'lucide-react';
import { toArabicDigits } from '../../utils/helpers';
import { toast } from 'react-hot-toast';

interface AttachmentsManagerProps {
    entityType: AttachmentType['entityType'];
    entityId: string;
}

const MAX_IMAGE_WIDTH = 1200;
const JPEG_QUALITY = 0.72;
const MAX_FILE_MB = 10;

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const scale = Math.min(1, MAX_IMAGE_WIDTH / img.width);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('canvas context unavailable'));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const mime = file.type === 'image/png' && file.size < 200_000 ? 'image/png' : 'image/jpeg';
            resolve(canvas.toDataURL(mime, JPEG_QUALITY));
        };
        img.onerror = reject;
        img.src = objectUrl;
    });
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const AttachmentsManager: React.FC<AttachmentsManagerProps> = ({ entityType, entityId }) => {
    const { db, dataService } = useApp();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = React.useState(false);

    const attachments = useMemo(() => {
        return db.attachments.filter(att => att.entityType === entityType && att.entityId === entityId);
    }, [db.attachments, entityType, entityId]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.size > MAX_FILE_MB * 1024 * 1024) {
                toast.error(`الملف "${file.name}" أكبر من ${MAX_FILE_MB} ميجابايت.`);
                continue;
            }
            try {
                let dataUrl: string;
                let finalSize = file.size;

                if (file.type.startsWith('image/')) {
                    dataUrl = await compressImage(file);
                    const approxBytes = Math.round((dataUrl.length * 3) / 4);
                    const savedPct = Math.round((1 - approxBytes / file.size) * 100);
                    finalSize = approxBytes;
                    if (savedPct > 5) {
                        toast.success(`تم ضغط الصورة — وُفِّر ${savedPct}% من الحجم`);
                    }
                } else {
                    dataUrl = await fileToBase64(file);
                }

                await dataService.add('attachments', {
                    entityType,
                    entityId,
                    name: file.name,
                    mime: file.type.startsWith('image/') ? 'image/jpeg' : file.type,
                    size: finalSize,
                    dataUrl,
                });
            } catch (error) {
                console.error('Error processing file', error);
                toast.error(`حدث خطأ أثناء رفع الملف "${file.name}".`);
            }
        }

        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleView = (dataUrl: string, mime: string) => {
        const newWindow = window.open();
        if (newWindow) {
            if (mime.startsWith('image/')) {
                newWindow.document.write(`<img src="${dataUrl}" style="max-width:100%;display:block;margin:auto;background:#111;" />`);
            } else {
                newWindow.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0;top:0;left:0;bottom:0;right:0;width:100%;height:100%;" allowfullscreen></iframe>`);
            }
        }
    };

    return (
        <div className="pt-4 border-t border-border mt-4">
            <h4 className="text-md font-bold mb-3 flex items-center gap-2">
                <Paperclip size={18} />
                المرفقات ({toArabicDigits(attachments.length)})
            </h4>
            <div className="space-y-2 mb-4">
                {attachments.map(att => (
                    <div key={att.id} className="flex justify-between items-center p-2 bg-background rounded-md text-sm">
                        <div className="flex flex-col min-w-0">
                            <span className="truncate font-medium" title={att.name}>{att.name}</span>
                            {att.size > 0 && (
                                <span className="text-xs text-text-muted">{formatBytes(att.size)}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 mr-2">
                            <button type="button" onClick={() => handleView(att.dataUrl, att.mime)} className="text-primary hover:text-opacity-80" title="عرض"><Eye size={16} /></button>
                            <button type="button" onClick={() => dataService.remove('attachments', att.id)} className="text-red-500 hover:text-red-700" title="حذف"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
            <label className={`w-full text-center cursor-pointer bg-background hover:bg-opacity-80 text-text font-bold py-2 px-4 rounded-md inline-flex items-center justify-center gap-2 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                {uploading
                    ? <><Loader2 size={16} className="animate-spin" /> جاري الرفع والضغط...</>
                    : <span>إضافة مرفق</span>
                }
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
            </label>
            <p className="text-xs text-text-muted text-center mt-1">
                الصور تُضغط تلقائياً بجودة عالية • الحد الأقصى للملف {MAX_FILE_MB} MB
            </p>
        </div>
    );
};

export default AttachmentsManager;
