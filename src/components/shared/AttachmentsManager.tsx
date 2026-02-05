
import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Attachment as AttachmentType } from '../../types';
import { Paperclip, Eye, Trash2 } from 'lucide-react';
import { toArabicDigits } from '../../utils/helpers';
import { toast } from 'react-hot-toast';

interface AttachmentsManagerProps {
    entityType: AttachmentType['entityType'];
    entityId: string;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const AttachmentsManager: React.FC<AttachmentsManagerProps> = ({ entityType, entityId }) => {
    // FIX: Use dataService for data manipulation
    const { db, dataService } = useApp();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const attachments = useMemo(() => {
        return db.attachments.filter(att => att.entityType === entityType && att.entityId === entityId);
    }, [db.attachments, entityType, entityId]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const dataUrl = await fileToBase64(file);
                const newAttachment: Omit<AttachmentType, 'id' | 'createdAt'> = {
                    entityType,
                    entityId,
                    name: file.name,
                    mime: file.type,
                    size: file.size,
                    dataUrl,
                };
                // FIX: Use dataService for data manipulation
                dataService.add('attachments', newAttachment);
            } catch (error) {
                console.error("Error converting file to base64", error);
                toast.error("حدث خطأ أثناء رفع الملف.");
            }
        }
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleView = (dataUrl: string) => {
        const newWindow = window.open();
        if(newWindow) {
            newWindow.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
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
                        <span className="truncate" title={att.name}>{att.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button type="button" onClick={() => handleView(att.dataUrl)} className="text-primary hover:text-opacity-80" title="عرض"><Eye size={16} /></button>
                            {/* FIX: Use dataService for data manipulation */}
                            <button type="button" onClick={() => dataService.remove('attachments', att.id)} className="text-red-500 hover:text-red-700" title="حذف"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
            <label className="w-full text-center cursor-pointer bg-background hover:bg-opacity-80 text-text font-bold py-2 px-4 rounded-md inline-block">
                <span>إضافة مرفق</span>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                />
            </label>
        </div>
    );
};

export default AttachmentsManager;
