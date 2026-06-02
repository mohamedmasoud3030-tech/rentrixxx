import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveReviewEntry,
  archiveLand,
  archiveProspect,
  createContactRecord,
  createReviewEntry,
  createLand,
  createProspect,
  getOperationsSnapshot,
  listChangeHistory,
  listContactRecords,
  listReviewEntries,
  listLands,
  listPropertyDirectory,
  listProspects,
  updateProspectStatus,
  type ContactRecordInput,
  type ReviewEntryInput,
  type LandInput,
  type ProspectInput,
} from './operations-service';

const keys = {
  prospects: ['operations', 'prospects'] as const,
  reviews: ['operations', 'reviews'] as const,
  lands: ['operations', 'lands'] as const,
  contacts: ['operations', 'contacts'] as const,
  changes: ['operations', 'changes'] as const,
  directory: ['operations', 'directory'] as const,
  snapshot: ['operations', 'snapshot'] as const,
};

function useRefreshMutation<T>(mutationFn: (payload: T) => Promise<unknown>, queryKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: keys.changes }),
        queryClient.invalidateQueries({ queryKey: keys.snapshot }),
      ]);
    },
  });
}

export const useProspects = () => useQuery({ queryKey: keys.prospects, queryFn: listProspects });
export const useCreateProspect = () => useRefreshMutation<ProspectInput>(createProspect, keys.prospects);
export const useUpdateProspectStatus = () => useRefreshMutation<{ prospectId: string; status: string }>(({ prospectId, status }) => updateProspectStatus(prospectId, status), keys.prospects);
export const useArchiveProspect = () => useRefreshMutation<string>(archiveProspect, keys.prospects);
export const useReviewEntries = () => useQuery({ queryKey: keys.reviews, queryFn: listReviewEntries });
export const useCreateReviewEntry = () => useRefreshMutation<ReviewEntryInput>(createReviewEntry, keys.reviews);
export const useArchiveReviewEntry = () => useRefreshMutation<string>(archiveReviewEntry, keys.reviews);
export const useLands = () => useQuery({ queryKey: keys.lands, queryFn: listLands });
export const useCreateLand = () => useRefreshMutation<LandInput>(createLand, keys.lands);
export const useArchiveLand = () => useRefreshMutation<string>(archiveLand, keys.lands);
export const useContactRecords = () => useQuery({ queryKey: keys.contacts, queryFn: listContactRecords });
export const useCreateContactRecord = () => useRefreshMutation<ContactRecordInput>(createContactRecord, keys.contacts);
export const useChangeHistory = () => useQuery({ queryKey: keys.changes, queryFn: listChangeHistory });
export const usePropertyDirectory = () => useQuery({ queryKey: keys.directory, queryFn: listPropertyDirectory });
export const useOperationsSnapshot = () => useQuery({ queryKey: keys.snapshot, queryFn: getOperationsSnapshot });
