import axios, { type AxiosRequestConfig } from 'axios';
import type {
  ConfirmVaultItemInput,
  DashboardResponseDTO,
  IngestExtractResponseDTO,
  MerchantProfileDTO,
  PublicCertificateDTO,
  ResolveVaultItemInput,
  VaultItemDTO,
} from '@claimvault/shared';

const ACCESS_KEY = 'claimvault_access_token';
const REFRESH_KEY = 'claimvault_refresh_token';

export function getStoredTokens(): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  return {
    accessToken: localStorage.getItem(ACCESS_KEY),
    refreshToken: localStorage.getItem(REFRESH_KEY),
  };
}

export function setStoredTokens(accessToken: string | null, refreshToken: string | null): void {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  else localStorage.removeItem(ACCESS_KEY);

  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_KEY);
}

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 35000,
});

api.interceptors.request.use((config) => {
  const { accessToken } = getStoredTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshingPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const { refreshToken } = getStoredTokens();
      if (!refreshToken) {
        setStoredTokens(null, null);
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        if (!refreshingPromise) {
          refreshingPromise = axios
            .post<{ accessToken: string; refreshToken: string }>('/api/v1/auth/refresh', {
              refreshToken,
            })
            .then((r) => {
              setStoredTokens(r.data.accessToken, r.data.refreshToken);
              return r.data.accessToken;
            })
            .catch(() => {
              setStoredTokens(null, null);
              return null;
            })
            .finally(() => {
              refreshingPromise = null;
            });
        }
        const nextAccess = await refreshingPromise;
        if (nextAccess && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${nextAccess}`;
          return api.request(originalRequest);
        }
      } catch {
        setStoredTokens(null, null);
      }
    }
    return Promise.reject(error);
  },
);

export async function fetchDashboard(): Promise<DashboardResponseDTO> {
  const { data } = await api.get<DashboardResponseDTO>('/vault/dashboard');
  return data;
}

export async function ingestReceipt(params: {
  file?: File;
  rawText?: string;
  captureDurationSeconds?: number;
}): Promise<IngestExtractResponseDTO> {
  if (params.file) {
    const form = new FormData();
    form.append('file', params.file);
    if (params.rawText) form.append('rawText', params.rawText);
    if (params.captureDurationSeconds !== undefined) {
      form.append('captureDurationSeconds', String(params.captureDurationSeconds));
    }
    const { data } = await api.post<IngestExtractResponseDTO>('/ingest/extract', form);
    return data;
  }

  const { data } = await api.post<IngestExtractResponseDTO>('/ingest/extract', {
    rawText: params.rawText ?? '',
    captureDurationSeconds: params.captureDurationSeconds,
  });
  return data;
}

export async function confirmVaultItemApi(
  id: string,
  payload: ConfirmVaultItemInput,
): Promise<{ item: VaultItemDTO; merchantProfile: MerchantProfileDTO | null }> {
  const { data } = await api.patch<{
    item: VaultItemDTO;
    merchantProfile: MerchantProfileDTO | null;
  }>(`/vault/${id}/confirm`, payload);
  return data;
}

export async function resolveVaultItemApi(
  id: string,
  payload: ResolveVaultItemInput,
): Promise<{ item: VaultItemDTO }> {
  const { data } = await api.post<{ item: VaultItemDTO }>(`/vault/${id}/resolve`, payload);
  return data;
}

export async function restoreVaultItemApi(id: string): Promise<{ item: VaultItemDTO }> {
  const { data } = await api.post<{ item: VaultItemDTO }>(`/vault/${id}/restore`);
  return data;
}

export async function deleteVaultItemApi(id: string): Promise<void> {
  await api.delete(`/vault/${id}`);
}

export async function resetDemoWorkspaceApi(): Promise<void> {
  await api.post('/vault/reset-demo');
}

export async function downloadClaimDossierPdfFile(
  id: string,
  title: string,
  defectNotes?: string,
): Promise<void> {
  const res = await api.get<Blob>(`/vault/${id}/claim-dossier.pdf`, {
    params: defectNotes ? { defect: defectNotes } : undefined,
    responseType: 'blob',
  });
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  a.download = `${slug || 'claim'}-claim-dossier.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
}

export async function fetchPublicCertificate(token: string): Promise<PublicCertificateDTO> {
  const { data } = await api.get<{ certificate: PublicCertificateDTO }>(`/verify/${token}`);
  return data.certificate;
}

export interface AuthSessionUser {
  _id: string;
  fullName: string;
  email: string;
  isDemoWorkspace?: boolean;
  role?: string;
}

export async function fetchCurrentSession(): Promise<{
  user: AuthSessionUser;
  household: DashboardResponseDTO['household'] | null;
}> {
  const { data } = await api.get<{
    user: AuthSessionUser;
    household: DashboardResponseDTO['household'] | null;
  }>('/auth/me');
  return data;
}

export async function loginAccount(payload: { email: string; password: string }) {
  const { data } = await api.post<{
    accessToken: string;
    refreshToken: string;
    user: AuthSessionUser;
  }>('/auth/login', payload);
  setStoredTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function registerAccount(payload: {
  fullName: string;
  email: string;
  password: string;
  defaultCurrency: 'PKR' | 'USD';
  householdName?: string;
}) {
  const { data } = await api.post<{
    accessToken: string;
    refreshToken: string;
    user: AuthSessionUser;
  }>('/auth/register', payload);
  setStoredTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function fetchHouseholdMembers() {
  const { data } = await api.get<{
    household: {
      _id: string;
      name: string;
      planTier: string;
      inboundForwardingAlias: string;
      members: Array<{
        userId: string;
        fullName: string;
        email: string;
        role: string;
      }>;
    };
  }>('/household');
  return data.household;
}

export async function inviteHouseholdMemberApi(email: string, role: 'EDITOR' | 'VIEWER') {
  const { data } = await api.post('/household/members', { email, role });
  return data;
}
