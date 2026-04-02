import { sanitizePhoneNumber } from '../utils/helpers';
import { toast } from 'react-hot-toast';
import { createOwnerAccessToken } from './edgeFunctions';
import { logger } from './logger';

export const IntegrationService = {
    sendWhatsApp: (phone: string, message: string) => {
        const cleanPhone = sanitizePhoneNumber(phone);
        if (!cleanPhone) {
            toast.error('رقم الهاتف غير صحيح');
            return;
        }
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    },

    syncToCloud: async (data: unknown, fileName: string) => {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        logger.info('Cloud sync simulation started', { fileName, bytes: blob.size });
        toast('تم بدء المزامنة السحابية (محاكاة).');
    },

    generateOwnerLink: async (ownerId: string) => {
        const baseUrl = window.location.href.split('#')[0];
        const token = await createOwnerAccessToken(ownerId);
        return `${baseUrl}#/owner-view/${ownerId}?auth=${encodeURIComponent(token)}`;
    },
};
