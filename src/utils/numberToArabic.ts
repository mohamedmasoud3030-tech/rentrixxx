// دالة تحويل الأرقام إلى كلمات عربية (نسخة مبسطة واحترافية للريال)
export function tafneeta(n: number): string {
    const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    
    if (n === 0) return 'صفر';
    
    let result = '';
    const riyals = Math.floor(n);
    const baisas = Math.round((n - riyals) * 1000);

    // منطق بسيط للتحويل (يمكن توسيعه)
    result = `${riyals} ريالاً عمانياً`;
    
    if (baisas > 0) {
        result += ` و ${baisas} بيسة`;
    }

    return `فقط وقدره ${result} لا غير`;
}
