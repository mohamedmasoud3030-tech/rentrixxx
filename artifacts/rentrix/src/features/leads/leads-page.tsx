import { useState } from 'react';
import { LeadsView } from './components/leads-view';
import type { LeadFilters, LeadFormValues, LeadRecord } from './types';
import { useArchiveLead, useLeads, useSaveLead } from './use-leads';

const emptyForm: LeadFormValues = { name: '', phone: '', email: '', source: 'walk_in', status: 'new', desired_unit_type: '', min_budget: '', max_budget: '', notes: '' };

function formFromLead(lead: LeadRecord): LeadFormValues {
  return {
    name: lead.name ?? '',
    phone: lead.phone ?? '',
    email: lead.email ?? '',
    source: lead.source ?? 'walk_in',
    status: lead.status ?? 'new',
    desired_unit_type: lead.desired_unit_type ?? '',
    min_budget: lead.min_budget?.toString() ?? '',
    max_budget: lead.max_budget?.toString() ?? '',
    notes: lead.notes ?? '',
  };
}

export function LeadsPage() {
  const [filters, setFilters] = useState<LeadFilters>({ query: '', status: 'all', source: 'all' });
  const [editingLead, setEditingLead] = useState<LeadRecord | null>(null);
  const [draft, setDraft] = useState<LeadFormValues>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const leadsQuery = useLeads(filters);
  const saveLead = useSaveLead();
  const archiveLead = useArchiveLead();

  return (
    <LeadsView
      rows={leadsQuery.data ?? []}
      filters={filters}
      draft={draft}
      editingLead={editingLead}
      formOpen={formOpen}
      isLoading={leadsQuery.isLoading}
      isSaving={saveLead.isPending}
      isArchiving={archiveLead.isPending}
      error={leadsQuery.error}
      onFiltersChange={setFilters}
      onDraftChange={setDraft}
      onCreate={() => { setEditingLead(null); setDraft(emptyForm); setFormOpen(true); }}
      onEdit={(lead) => { setEditingLead(lead); setDraft(formFromLead(lead)); setFormOpen(true); }}
      onFormOpenChange={setFormOpen}
      onSubmit={(values) => saveLead.mutate({ id: editingLead?.id, values }, { onSuccess: () => setFormOpen(false) })}
      onArchive={(id) => archiveLead.mutate(id)}
      onRetry={() => void leadsQuery.refetch()}
    />
  );
}
