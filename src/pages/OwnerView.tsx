import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { formatCurrency } from '../utils/helpers';
import Card from '../components/ui/Card';
import { OwnerPortalPayload, verifyOwnerAccessToken } from '../services/edgeFunctions';

const OwnerView: React.FC = () => {
    const { ownerId } = useParams<{ ownerId: string }>();
    const [searchParams] = useSearchParams();
    const authToken = searchParams.get('auth') || '';
    const [payload, setPayload] = useState<OwnerPortalPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;
        const run = async () => {
            if (!ownerId || !authToken) {
                if (isMounted) {
                    setError('الرابط غير صالح أو منتهي الصلاحية.');
                    setLoading(false);
                }
                return;
            }

            setLoading(true);
            setError('');
            try {
                const result = await verifyOwnerAccessToken(ownerId, authToken);
                if (!isMounted) return;
                setPayload(result);
            } catch (e) {
                if (isMounted) {
                    setError(e instanceof Error ? e.message : 'تعذر التحقق من الرابط.');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        run();
        return () => {
            isMounted = false;
        };
    }, [ownerId, authToken]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl text-center">
                    <h1 className="text-xl font-bold mb-3">جاري التحقق من الرابط الآمن...</h1>
                </Card>
            </div>
        );
    }

    if (error || !payload) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                 <Card className="w-full max-w-2xl text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">خطأ في الوصول</h1>
                    <p className="text-text">{error || 'الرابط الذي تحاول الوصول إليه غير صالح أو منتهي الصلاحية.'}</p>
                </Card>
            </div>
        );
    }

    const { owner, stats, currency } = payload;

    return (
        <div className="p-6 max-w-4xl mx-auto bg-background min-h-screen" dir="rtl">
            <header className="text-center mb-8 pb-4 border-b-2 border-border">
                <h1 className="text-3xl font-bold text-text">بوابة تقارير المالك</h1>
                <p className="text-lg text-text-muted">{owner.name}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="p-5 bg-card rounded-lg shadow-md border-t-4 border-blue-500">
                    <p className="text-sm text-text-muted">إجمالي التحصيلات</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">{formatCurrency(stats.collections, currency || 'OMR')}</p>
                </div>
                <div className="p-5 bg-card rounded-lg shadow-md border-t-4 border-red-500">
                    <p className="text-sm text-text-muted">إجمالي المصاريف والعمولة</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-2">{formatCurrency(stats.expenses + stats.officeShare, currency || 'OMR')}</p>
                </div>
                <div className="p-5 bg-card rounded-lg shadow-md border-t-4 border-green-500">
                    <p className="text-sm text-text-muted">صافي المستحق لك</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-2">{formatCurrency(stats.net, currency || 'OMR')}</p>
                </div>
            </div>
        </div>
    );
};

export default OwnerView;
