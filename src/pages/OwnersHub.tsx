import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Card from '../components/ui/Card';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, getStatusBadgeClass } from '../utils/helpers';
import { AR_LABELS } from '../config/labels.ar';

const UNIT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'شاغرة',
  RENTED: 'مؤجرة',
  MAINTENANCE: 'صيانة',
  ON_HOLD: 'موقوفة',
};

const OwnersHub: React.FC = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const { db, ownerBalances, generateOwnerPortalLink } = useApp();
  const [portalLink, setPortalLink] = useState('');
  const [isGeneratingPortalLink, setIsGeneratingPortalLink] = useState(false);

  const owner = useMemo(() => db.owners.find(item => item.id === ownerId), [db.owners, ownerId]);

  const ownerProperties = useMemo(() => db.properties.filter(property => property.ownerId === ownerId), [db.properties, ownerId]);
  const propertyIds = useMemo(() => new Set(ownerProperties.map(property => property.id)), [ownerProperties]);

  const ownerUnits = useMemo(
    () => db.units.filter(unit => propertyIds.has(unit.propertyId)),
    [db.units, propertyIds],
  );
  const unitIds = useMemo(() => new Set(ownerUnits.map(unit => unit.id)), [ownerUnits]);

  const contracts = useMemo(() => db.contracts.filter(contract => unitIds.has(contract.unitId)), [db.contracts, unitIds]);
  const activeContracts = useMemo(
    () => contracts.filter(contract => contract.status === 'ACTIVE'),
    [contracts],
  );

  const unitToActiveContractMap = useMemo(
    () => new Map(activeContracts.map(contract => [contract.unitId, contract])),
    [activeContracts],
  );

  const propertyMap = useMemo(
    () => new Map(ownerProperties.map(property => [property.id, property])),
    [ownerProperties],
  );

  const unitMap = useMemo(
    () => new Map(ownerUnits.map(unit => [unit.id, unit])),
    [ownerUnits],
  );

  const tenantMap = useMemo(
    () => new Map(db.tenants.map(tenant => [tenant.id, tenant])),
    [db.tenants],
  );

  const ownerBalance = ownerId ? ownerBalances[ownerId] : undefined;

  const financialSummary = useMemo(
    () => [
      { label: 'إجمالي الإيجارات المحصلة', value: ownerBalance?.collections ?? 0, className: '' },
      { label: 'صافي المالك', value: ownerBalance?.net ?? 0, className: 'text-primary' },
      { label: 'العمولات المستحقة', value: ownerBalance?.officeShare ?? 0, className: '' },
      { label: 'التسويات المدفوعة', value: ownerBalance?.settlements ?? 0, className: '' },
    ],
    [ownerBalance],
  );

  const handleCreatePortalLink = async () => {
    if (!ownerId) return;
    setIsGeneratingPortalLink(true);
    try {
      const link = await generateOwnerPortalLink(ownerId);
      if (!link) {
        toast.error('تعذر إنشاء رابط البوابة حالياً.');
        return;
      }
      setPortalLink(link);
      toast.success('تم إنشاء رابط البوابة.');
    } catch {
      toast.error('تعذر إنشاء رابط البوابة حالياً.');
    } finally {
      setIsGeneratingPortalLink(false);
    }
  };

  const handleCopyPortalLink = async () => {
    if (!portalLink) return;
    await navigator.clipboard.writeText(portalLink);
    toast.success('تم نسخ رابط البوابة.');
  };

  if (!owner) {
    return <Card><p className="text-danger-text">المالك غير موجود.</p></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-2xl font-black text-primary">{AR_LABELS.ownersHub} — {owner.name}</h1>
        <p className="text-sm text-text-muted mt-1">لوحة المالك تشمل المؤشرات المالية، العقارات، والوحدات والعقود النشطة.</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {financialSummary.map(item => (
          <Card key={item.label}>
            <p className="text-xs text-text-muted">{item.label}</p>
            <p className={`font-black text-lg ${item.className}`}>{formatCurrency(item.value)}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="font-black">بوابة المالك</h2>
          <button
            onClick={handleCreatePortalLink}
            className="btn btn-primary"
            disabled={isGeneratingPortalLink}
          >
            {isGeneratingPortalLink ? 'جاري الإنشاء...' : 'إنشاء رابط البوابة'}
          </button>
        </div>
        {portalLink && (
          <div className="flex flex-col md:flex-row gap-2">
            <input
              value={portalLink}
              readOnly
              className="flex-1"
              onFocus={event => event.currentTarget.select()}
            />
            <button className="btn" onClick={handleCopyPortalLink}>نسخ الرابط</button>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-black mb-3">عقارات ووحدات المالك ({ownerProperties.length})</h2>
        <div className="space-y-4">
          {ownerProperties.map(property => {
            const propertyUnits = ownerUnits.filter(unit => unit.propertyId === property.id);
            return (
              <div key={property.id} className="border border-border rounded-lg p-3">
                <p className="font-semibold">{property.name}</p>
                <p className="text-xs text-text-muted mb-3">{property.location}</p>
                {propertyUnits.length === 0 ? (
                  <p className="text-sm text-text-muted">لا توجد وحدات لهذا العقار.</p>
                ) : (
                  <div className="space-y-2">
                    {propertyUnits.map(unit => {
                      const activeContract = unitToActiveContractMap.get(unit.id);
                      return (
                        <div key={unit.id} className="flex items-center justify-between gap-3 text-sm">
                          <p>{unit.name}</p>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(unit.status)}`}>
                              {UNIT_STATUS_LABELS[unit.status] || unit.status}
                            </span>
                            {activeContract && <span className="text-xs text-primary">عقد نشط: {activeContract.no || activeContract.id}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {ownerProperties.length === 0 && <p className="text-text-muted text-sm">لا توجد عقارات.</p>}
        </div>
      </Card>

      <Card>
        <h2 className="font-black mb-3">العقود النشطة ({activeContracts.length})</h2>
        <div className="space-y-2">
          {activeContracts.map(contract => {
            const unit = unitMap.get(contract.unitId);
            const property = unit ? propertyMap.get(unit.propertyId) : undefined;
            const tenant = tenantMap.get(contract.tenantId);
            return (
              <div key={contract.id} className="text-sm border border-border rounded-lg p-3">
                <p className="font-semibold">{contract.no || contract.id}</p>
                <p className="text-text-muted">{property?.name || '—'} / {unit?.name || '—'} / {tenant?.name || '—'}</p>
                <p className="text-xs text-text-muted mt-1">{contract.start} → {contract.end}</p>
              </div>
            );
          })}
          {activeContracts.length === 0 && <p className="text-text-muted text-sm">لا توجد عقود نشطة.</p>}
        </div>
      </Card>
    </div>
  );
};

export default OwnersHub;
