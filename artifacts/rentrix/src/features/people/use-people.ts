import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PersonPayload } from './person-schema';
import { createPerson, getPerson, listPeople, listPeopleByIds, softDeletePerson, updatePerson, type PeopleListParams } from './people-service';

export const peopleKeys = {
  all: ['people'] as const,
  lists: () => [...peopleKeys.all, 'list'] as const,
  list: (params: PeopleListParams) => [...peopleKeys.lists(), params] as const,
  detail: (personId: string) => [...peopleKeys.all, 'detail', personId] as const,
  byIds: (ids: string[]) => [...peopleKeys.all, 'by-ids', ...ids] as const,
};

export function usePeople(params: PeopleListParams) {
  return useQuery({
    queryKey: peopleKeys.list(params),
    queryFn: () => listPeople(params),
  });
}


export function usePeopleByIds(ids: string[]) {
  return useQuery({
    queryKey: peopleKeys.byIds(ids),
    queryFn: () => listPeopleByIds(ids),
    enabled: ids.length > 0,
  });
}

export function usePerson(personId: string) {
  return useQuery({
    queryKey: peopleKeys.detail(personId),
    queryFn: () => getPerson(personId),
    enabled: Boolean(personId),
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PersonPayload) => createPerson(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: peopleKeys.lists() });
      toast.success('تم إنشاء الشخص بنجاح');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر إنشاء الشخص'),
  });
}

export function useUpdatePerson(personId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PersonPayload) => updatePerson(personId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: peopleKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: peopleKeys.detail(personId) }),
      ]);
      toast.success('تم تحديث الشخص بنجاح');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر تحديث الشخص'),
  });
}

export function useSoftDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (personId: string) => softDeletePerson(personId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: peopleKeys.all });
      toast.success('تم حذف الشخص أرشيفياً');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'تعذر حذف الشخص'),
  });
}
