import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';

const OwnerPortal: React.FC = () => {
    const { ownerId } = useParams();
    const [searchParams] = useSearchParams();
    const { db, settings, ownerBalances } = useApp();
    
    const owner = (db.owners || []).find(o => o.id === ownerId);

    if (!owner || owner.portalToken !== searchParams.get('auth')) {
        return <div className="p-10 text-center">عذراً، الرابط غير صالح أو منتهي الصلاحية.</div>;
    }

    const stats = ownerId ? ownerBalances[ownerId] : null;

    if (!stats || !settings) return null; // Wait for data

    return (
        <div className="p-6 max-w-lg mx-auto bg-white shadow-xl rounded-2xl mt-10" dir="rtl">
            <div className="text-center mb-8">
                {settings.appearance.logoDataUrl && <img src={settings.appearance.logoDataUrl} alt="Company Logo" className="h-16 mx-auto mb-4" />}
                <h1 className="text-xl font-black">مرحباً، {owner.name}</h1>
                <p className="text-sm text-gray-500">تقرير ملخص العقارات - {new Date().toLocaleDateString('ar-EG')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-xl text-center">
                    <p className="text-xs text-green-600 mb-1">صافي مستحقاتك</p>
                    <p className="text-lg font-bold">{stats.net} ر.ع.</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <p className="text-xs text-blue-600 mb-1">التحصيل الكلي</p>
                    <p className="text-lg font-bold">{stats.collections} ر.ع.</p>
                </div>
            </div>
            {/* أضف هنا قائمة بالوحدات الشاغرة لهذا المالك فقط */}
        </div>
    );
};
export default OwnerPortal;