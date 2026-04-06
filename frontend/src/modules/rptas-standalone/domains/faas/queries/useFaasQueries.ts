import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as faasService from '../../../shared/services/faasService';

export const useFaasRecords = (params?: any) => {
  return useQuery({
    queryKey: ['faasRecords', params],
    queryFn: () => faasService.listFaasRecords(params),
  });
};

export const useSubmitFaas = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => faasService.submitForReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faasRecords'] });
    },
  });
};
