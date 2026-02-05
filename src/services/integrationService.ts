import { sanitizePhoneNumber } from '../utils/helpers';
import { toast } from 'react-hot-toast';

export const IntegrationService = {
    /**
     * يرسل رسالة واتساب بعد تنظيف رقم الهاتف.
     * @param phone رقم الهاتف.
     * @param message نص الرسالة.
     */
    sendWhatsApp: (phone: string, message: string) => {
        const cleanPhone = sanitizePhoneNumber(phone);
        if (!cleanPhone) {
            toast.error("رقم الهاتف غير صحيح");
            return;
        }
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    },

    /**
     * محاكاة لعملية النسخ الاحتياطي السحابي إلى Google Drive.
     * @param data البيانات المراد مزامنتها.
     * @param fileName اسم الملف.
     */
    syncToCloud: async (data: any, fileName: string) => {
        console.log("جاري رفع النسخة الاحتياطية سحابياً...");
        // في التطبيق الفعلي، هنا يتم استدعاء API جوجل.
        // للتبسيط في هذه المرحلة، سنقوم بمحاكاة العملية.
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        console.log("محاكاة: تم إنشاء Blob للنسخ الاحتياطي بحجم", blob.size);
        // FIX: Replaced toast.info with a standard toast() call.
        toast("تم بدء المزامنة السحابية (محاكاة). انظر وحدة التحكم للمزيد من التفاصيل.");
    },

    /**
     * يولد رابطًا فريدًا وآمنًا لبوابة المالك.
     * @param ownerId معرّف المالك.
     * @returns رابط URL كامل لبوابة المالك.
     */
    generateOwnerLink: (ownerId: string) => {
        // بناء الرابط بشكل آمن ليعمل بشكل صحيح سواء كان التطبيق في جذر الخادم أو في مجلد فرعي.
        const baseUrl = window.location.href.split('#')[0];
        const token = btoa(ownerId + ":" + Date.now()); // تشفير بسيط للمعرف والوقت كرمز وصول.
        return `${baseUrl}#/owner-view/${ownerId}?auth=${token}`;
    }
};
