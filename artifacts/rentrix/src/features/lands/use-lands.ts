import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { archiveLand, createLand, listLands, updateLand } from '@/services/landsService';

const key = ['lands'] as const;
export const useLands = (search = '') => useQuery({ queryKey: [...key, search], queryFn: () => listLands(supabase, search) });
export function useCreateLand() { const qc = useQueryClient(); return useMutation({ mutationFn: (payload: Parameters<typeof createLand>[1]) => createLand(supabase, payload), onSuccess: () => qc.invalidateQueries({ queryKey: key }) }); }
export function useUpdateLand() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateLand>[2] }) => updateLand(supabase, id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: key }) }); }
export function useArchiveLand() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => archiveLand(supabase, id), onSuccess: () => qc.invalidateQueries({ queryKey: key }) }); }
