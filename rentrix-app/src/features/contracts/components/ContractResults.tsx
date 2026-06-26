import { ContractCardList } from './ContractCardList';
import { ContractTable } from './ContractTable';
import type { CompanySettingsContract } from '@/lib/companySettings';
import type { ContractListItem } from '../services/contractService';

export function ContractResults({
  companySettings,
  contracts,
  expandedId,
  isError,
  isLoading,
  onDelete,
  onEdit,
  setExpandedId,
}: {
  companySettings: CompanySettingsContract;
  contracts: ContractListItem[];
  expandedId: string | null;
  isError: boolean;
  isLoading: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  setExpandedId: (updater: (value: string | null) => string | null) => void;
}) {
  if (isLoading || isError || contracts.length === 0) return null;

  return (
    <>
      <ContractCardList
        companySettings={companySettings}
        contracts={contracts}
        onDelete={onDelete}
        onEdit={onEdit}
      />
      <ContractTable
        companySettings={companySettings}
        contracts={contracts}
        expandedId={expandedId}
        onDelete={onDelete}
        onEdit={onEdit}
        setExpandedId={setExpandedId}
      />
    </>
  );
}
