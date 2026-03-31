import { useQuery } from '@tanstack/react-query';
import {
    extendOcptWithIdentity,
    getAdvancedCN,
    getCaseNotions,
    getConformanceOcptOcel,
    getConformanceOcptOcpt,
    getConnectedComponentsCN,
    getHistogramEventPersp,
    getHistogramObjectPersp,
    getLogGraphs,
    getOcelCollection,
    getOcelObjectTypes,
    getOcpt,
    getTraditionalCN,
    mineIdentityOcpt,
    mineOcpt,
} from '~/services/api';
import { getOcel } from '~/services/api';
import { CaseNotionApiResponse } from '~/types/case_notion.types';

export const useGetOcpt = (fileId: string | null, shouldFetch: boolean) => {
    return useQuery({
        queryKey: ['getOcpt', fileId],
        queryFn: () => getOcpt(fileId!),
        refetchOnWindowFocus: false,
        enabled: Boolean(fileId) && shouldFetch,
    });
};

export const useGetOcelCollection = (fileId: string | null) => {
    return useQuery({
        queryKey: ['getOcelCollection', fileId],
        queryFn: () => getOcelCollection(fileId!),
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

export const useGetOcelObjectTypes = (fileId: string | null) => {
    return useQuery<CaseNotionApiResponse>({
        queryKey: ['getOcelObjectTypes', fileId],
        queryFn: () => getOcelObjectTypes(fileId!),
        enabled: Boolean(fileId),
        refetchOnWindowFocus: false,
    });
};

export const useGetHistogramEventPersp = (fileId: string | undefined) => {
    return useQuery({
        queryKey: ['getHistogram', fileId],
        queryFn: () => getHistogramEventPersp(fileId!),
        enabled: Boolean(fileId),
        refetchOnWindowFocus: false,
    });
};

export const useGetHistogramObjectPersp = (fileId: string | undefined) => {
    return useQuery({
        queryKey: ['getHistogramObjectPersp', fileId],
        queryFn: () => getHistogramObjectPersp(fileId!),
        enabled: Boolean(fileId),
        refetchOnWindowFocus: false,
    });
};

export const useMineOcpt = (nodeId: string, fileId: string | null, algorithm: string, shouldFetch: boolean) => {
    return useQuery({
        queryKey: ['mineOcpt', nodeId, fileId, algorithm],
        queryFn: () => mineOcpt(fileId!, algorithm),
        enabled: Boolean(fileId) && shouldFetch,
        refetchOnWindowFocus: false,
    });
};

export const useMineIdentityOcpt = (nodeId: string, fileId: string | null, algorithm: string, shouldFetch: boolean) => {
    return useQuery({
        queryKey: ['mineIdentityOcpt', nodeId, fileId, algorithm],
        queryFn: () => mineIdentityOcpt(fileId!, algorithm),
        enabled: Boolean(fileId) && shouldFetch,
        refetchOnWindowFocus: false,
    });
};

export const useGetIdentityOcpt = (fileId: string | null, shouldFetch: boolean) => {
    return useQuery({
        queryKey: ['getIdentityOcpt', fileId],
        queryFn: () => getIdentityOcpt(fileId!),
        enabled: Boolean(fileId) && shouldFetch,
        refetchOnWindowFocus: false,
    });
};

export const useGetConformanceOcptOcel = (ocptFileId: string | null, ocelFileId: string | null) => {
    return useQuery({
        queryKey: ['getConformanceOcptOcel', ocptFileId, ocelFileId],
        queryFn: () => getConformanceOcptOcel(ocptFileId!, ocelFileId!),
        enabled: Boolean(ocptFileId) && Boolean(ocelFileId),
        refetchOnWindowFocus: false,
    });
};

export const useGetConformanceOcptOcpt = (ocptFileId1: string | null, ocptFileId2: string | null) => {
    return useQuery({
        queryKey: ['getConformanceOcptOcpt', ocptFileId1, ocptFileId2],
        queryFn: () => getConformanceOcptOcpt(ocptFileId1!, ocptFileId2!),
        enabled: Boolean(ocptFileId1) && Boolean(ocptFileId2),
        refetchOnWindowFocus: false,
    });
};

export const useGetCaseNotions = (cnFileId: string, shouldFetch: boolean) => {
    return useQuery({
        queryKey: ['getCaseNotions', cnFileId],
        queryFn: () => getCaseNotions(cnFileId),
        enabled: cnFileId.length > 0 && shouldFetch,
        refetchOnWindowFocus: false,
    });
};

export const useGetLogGraphs = (ocelFileId: string) => {
    return useQuery({
        queryKey: ['getLogGraphs', ocelFileId],
        queryFn: () => getLogGraphs(ocelFileId),
        enabled: ocelFileId.length > 0,
        refetchOnWindowFocus: false,
    });
};

export const useExtendOcptWithIdentity = (
    nodeId: string,
    ocptFileId: string | null,
    ocelFileId: string | null,
    shouldFetch: boolean
) => {
    return useQuery({
        queryKey: ['extendOcptWithIdentity', nodeId, ocptFileId, ocelFileId],
        queryFn: () => extendOcptWithIdentity(ocptFileId!, ocelFileId!),
        enabled: Boolean(ocptFileId) && Boolean(ocelFileId) && shouldFetch,
        refetchOnWindowFocus: false,
    });
};
