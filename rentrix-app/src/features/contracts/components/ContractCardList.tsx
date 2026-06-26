import { useNavigate } from '@tanstack/react-router';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContractCard } from '@/components/ui/contract-card';
import type { CompanySettingsContract } from '@/lib/companySettings';
import { getContractNumber } from '../contractListExport';
import { formatContractDate, formatContractMoney } from '../contractDisplayFormatters';
import type { ContractListItem } from '../services/contractService';
import { getDaysUntilEnd, isExpiringSoon } from '../hooks/useContractFilters';

export function ContractCardList({
  companySettings,
  contracts,
  onDelete,
  onEdit,
}: {
  companySettings: CompanySettingsContract;
  contracts: ContractListItem[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:hidden">
      {contracts.map((contract) => {
        const expiringSoon = isExpiringSoon(contract);
        const daysUntilEnd = getDaysUntilEnd(contract);

        return (
          <div key={contract.id} className="space-y-1.5">
            <ContractCard
              id={contract.id}
              contractNumber={getContractNumber(contract)}
              tenantName={contract.people?.full_name ?? '—'}
              location={contract.units?.unit_number ?? contract.properties?.title ?? '—'}
              endDate={contract.end_date}
              daysRemaining={daysUntilEnd ?? 0}
              monthlyRent={contract.rent_amount}
              status={contract.status.toUpperCase()}
              onClick={() => navigate({ to: '/contracts/$contractId', params: { contractId: contract.id } })}
              formatMoney={(value) => formatContractMoney(companySettings, value)}
              formatDate={(value) => formatContractDate(companySettings, value)}
            />
            {expiringSoon && (
              <p className="px-1 text-xs font-bold text-amber-700">ينتهي خلال {daysUntilEnd} يوم</p>
            )}
            <div className="flex items-center justify-end gap-2 px-1">
              <Button variant="secondary" size="sm" className="h-9" onClick={() => onEdit(contract.id)}>
                <Edit className="size-3.5 me-1" />تعديل
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="h-9"
                aria-label={`حذف العقد ${getContractNumber(contract)}`}
                onClick={() => onDelete(contract.id)}
              >
                <Trash2 className="size-3.5 me-1" />حذف
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
