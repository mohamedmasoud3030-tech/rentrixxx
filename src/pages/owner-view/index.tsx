import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency } from '../../utils/helpers';
import Card from '../../components/ui/Card';

const OwnerView: React.FC = () => {
    const { ownerId } = useParams<{ ownerId: string }>();
    const [searchParams] = useSearchParams();
    const authToken = searchParams.get('auth');
    const { db, settings, ownerBalances } = useApp();
    
    const owner = (db.owners || []).find(o => o.id === ownerId);

    // --- Authentication and Validation ---
    let isValid = false;
    if (authToken && ownerId) {
        try {
            const decodedToken = atob(authToken);
            const [tokenOwnerId, timestampStr] = decodedToken.split(':');
            const timestamp = parseInt(timestampStr, 10);
            
            // Link is valid for 24 hours (24 * 60 * 60 * 1000 milliseconds)
            const isExpired = (Date.now() - timestamp) > 86400000;

            if (tokenOwnerId === ownerId && !isExpired) {
                isValid = true;
            }
        } catch (e) {
            console.error("Invalid auth token", e);
            isValid = false;
        }
    }
    
    const ownerStats = ownerId ? ownerBalances[ownerId] : null;

    if (!isValid || !owner || !ownerStats || !settings) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                 <Card className="w-full max-w-2xl text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">خطأ في الوصول</h1>
                    <p className="text-text">الرابط الذي تحاول الوصول إليه غير صالح أو منتهي الصلاحية.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto bg-background min-h-screen" dir="rtl">
            <header className="text-center mb-8 pb-4 border-b-2 border-border">
                <h1 className="text-3xl font-bold text-text">بوابة تقارير المالك</h1>
                <p className="text-lg text-text-muted">{owner.name}</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="p-5 bg-card rounded-lg shadow-md border-t-4 border-blue-500">
                    <p className="text-sm text-text-muted">إجمالي التحصيلات</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">{formatCurrency(ownerStats.collections, settings.operational?.currency ?? 'OMR')}</p>
                </div>
                <div className="p-5 bg-card rounded-lg shadow-md border-t-4 border-red-500">
                    <p className="text-sm text-text-muted">إجمالي المصاريف والعمولة</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-2">{formatCurrency(ownerStats.expenses + ownerStats.officeShare, settings.operational?.currency ?? 'OMR')}</p>
                </div>
                <div className="p-5 bg-card rounded-lg shadow-md border-t-4 border-green-500">
                    <p className="text-sm text-text-muted">صافي المستحق لك</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-2">{formatCurrency(ownerStats.net, settings.operational?.currency ?? 'OMR')}</p>
                </div>
            </div>
            
            <div className="mt-10">
                <h2 className="text-xl font-bold mb-4">الوحدات التابعة للمالك وحالتها</h2>
                <p className="text-text-muted">سيتم عرض تفاصيل الوحدات هنا في التحديثات القادمة.</p>
            </div>
        </div>
    );
};

export default OwnerView;