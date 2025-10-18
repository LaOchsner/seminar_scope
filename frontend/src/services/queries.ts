import { useQuery } from '@tanstack/react-query';
import { getAdvancedCN, getConnectedComponentsCN, getOcpt, getTraditionalCN } from '~/services/api';
import { getOcel } from '~/services/api';

export const useGetOcpt = (fileId: string | null) => {
    return useQuery({
        queryKey: ['getOcpt', fileId],
        queryFn: () => getOcpt(fileId!),
        refetchOnWindowFocus: false,
        enabled: Boolean(fileId),
    });
};

export const useGetOcel = (fileId: string | null) => {
    return useQuery({
        queryKey: ['getOcel', fileId],
        queryFn: () => getOcel(fileId!),
        refetchOnWindowFocus: false,
        enabled: Boolean(fileId),
    });
};


export const useGetTraditionalCN = (fileId: string | null) => {
  return useQuery({
    queryKey: ["traditionalCN", fileId],
    queryFn: () => getTraditionalCN(fileId!),
    enabled: Boolean(fileId),
    refetchOnWindowFocus: false,
  });
};

export const useGetConnectedComponentsCN = (fileId: string | null) => {
  return useQuery({
    queryKey: ["connectedComponentsCN", fileId],
    queryFn: () => getConnectedComponentsCN(fileId!),
    enabled: Boolean(fileId),
    refetchOnWindowFocus: false,
  });
};

export const useGetAdvancedCN = (fileId: string | null) => {
  return useQuery({
    queryKey: ["advancedCN", fileId],
    queryFn: () => getAdvancedCN(fileId!),
    enabled: Boolean(fileId),
    refetchOnWindowFocus: false,
  });
};