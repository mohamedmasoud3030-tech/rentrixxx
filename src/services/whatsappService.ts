export const sendWhatsAppMessage = (phone: string, message: string) => {
    // تنظيف رقم الهاتف (إزالة المسافات والرموز)
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    
    // استخدام wa.me للربط المباشر
    const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(url, '_blank');
};

export const templates = {
    latePayment: (name: string, amount: number, dueDate: string) => 
        `عزيزي المستأجر ${name}، نود تذكيركم بأن إيجاركم المستحق وقدره ${amount} كان موعده في ${dueDate}. يرجى السداد في أقرب وقت. شكراً لكم.`,
    
    welcome: (name: string, unit: string) => 
        `مرحباً بك سيد ${name} في عقاراتنا. تم تفعيل عقدك للوحدة ${unit}. نحن هنا لخدمتكم.`,
        
    receipt: (no: string, amount: number) => 
        `تم استلام مبلغ ${amount} بنجاح. رقم السند: ${no}. شكراً لثقتكم.`
};

const formatOmrAmount = (amount: number): string => `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
})} ر.ع`;

export const buildRentReminderMessage = (tenantName: string, balance: number, dueDate?: string): string => {
    const dueDatePart = dueDate ? ` بتاريخ استحقاق ${dueDate}` : '';
    return `السيد/ة ${tenantName}، يرجى العلم بوجود مبلغ مستحق بقيمة ${formatOmrAmount(balance)}${dueDatePart}. شكراً لتعاونكم.`;
};

export const buildContractExpiryMessage = (tenantName: string, expiryDate: string): string => {
    return `السيد/ة ${tenantName}، نود تذكيركم بأن عقد الإيجار الخاص بكم سينتهي بتاريخ ${expiryDate}. يرجى التواصل معنا لتجديد العقد.`;
};
