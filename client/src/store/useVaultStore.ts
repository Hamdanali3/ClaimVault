import { create } from 'zustand';
import type {
  ConfirmVaultItemInput,
  DashboardResponseDTO,
  IngestExtractResponseDTO,
  ResolveVaultItemInput,
  VaultItemDTO,
} from '@claimvault/shared';
import {
  confirmVaultItemApi,
  deleteVaultItemApi,
  fetchCurrentSession,
  fetchDashboard,
  ingestReceipt,
  resetDemoWorkspaceApi,
  resolveVaultItemApi,
  restoreVaultItemApi,
  type AuthSessionUser,
} from '../services/api';
import {
  loadDashboardOfflineSnapshot,
  saveDashboardOfflineSnapshot,
} from '../services/offlineCache';

export type LedgerTab = 'ACTION_NEEDED' | 'VAULT' | 'SAVED_MONEY';
export type IngestionStage = 'IDLE' | 'HASHING' | 'READING' | 'DATES_VERIFIED';

export interface VelocityComparison {
  visit1Seconds: number;
  visit2Seconds: number;
  merchantName: string;
  savedSeconds: number;
}

interface VaultStoreState {
  dashboard: DashboardResponseDTO | null;
  sessionUser: AuthSessionUser | null;
  activeTab: LedgerTab;
  isLoading: boolean;
  isOfflineFallback: boolean;
  ingestionStage: IngestionStage;
  isIngesting: boolean;
  captureStartedAtMs: number | null;
  pendingReview: IngestExtractResponseDTO | null;
  selectedItemId: string | null;
  commandPaletteOpen: boolean;
  authModalOpen: boolean;
  velocityBanner: VelocityComparison | null;
  globalDragActive: boolean;

  setActiveTab: (tab: LedgerTab) => void;
  setSelectedItemId: (id: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  setGlobalDragActive: (active: boolean) => void;
  clearPendingReview: () => void;
  dismissVelocityBanner: () => void;

  loadDashboard: () => Promise<void>;
  processIngestion: (params: {
    file?: File;
    rawText?: string;
    demoType?: 'VISIT_1' | 'VISIT_2';
  }) => Promise<IngestExtractResponseDTO>;
  confirmReviewItem: (id: string, input: ConfirmVaultItemInput) => Promise<VaultItemDTO>;
  optimisticResolveItem: (
    id: string,
    payload: ResolveVaultItemInput,
  ) => Promise<VaultItemDTO | null>;
  optimisticRestoreItem: (id: string) => Promise<void>;
  optimisticDeleteItem: (id: string) => Promise<void>;
  resetDemo: () => Promise<void>;
}

function getAllKnownItems(dash: DashboardResponseDTO | null): VaultItemDTO[] {
  if (!dash) return [];
  const map = new Map<string, VaultItemDTO>();
  for (const item of [
    ...dash.urgentItems,
    ...dash.allActiveItems,
    ...dash.resolvedItems,
  ]) {
    map.set(item._id, item);
  }
  return Array.from(map.values());
}

export function findVaultItemInState(
  dash: DashboardResponseDTO | null,
  id: string | null,
): VaultItemDTO | null {
  if (!dash || !id) return null;
  return getAllKnownItems(dash).find((i) => i._id === id) ?? null;
}

export const useVaultStore = create<VaultStoreState>((set, get) => ({
  dashboard: null,
  sessionUser: null,
  activeTab: 'ACTION_NEEDED',
  isLoading: true,
  isOfflineFallback: false,
  ingestionStage: 'IDLE',
  isIngesting: false,
  captureStartedAtMs: null,
  pendingReview: null,
  selectedItemId: null,
  commandPaletteOpen: false,
  authModalOpen: false,
  velocityBanner: null,
  globalDragActive: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedItemId: (id) => set({ selectedItemId: id }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setAuthModalOpen: (open) => set({ authModalOpen: open }),
  setGlobalDragActive: (active) => set({ globalDragActive: active }),
  clearPendingReview: () => set({ pendingReview: null, captureStartedAtMs: null }),
  dismissVelocityBanner: () => set({ velocityBanner: null }),

  loadDashboard: async () => {
    try {
      const [dash, session] = await Promise.all([
        fetchDashboard(),
        fetchCurrentSession().catch(() => null),
      ]);
      set({
        dashboard: dash,
        sessionUser: session?.user ?? get().sessionUser,
        isLoading: false,
        isOfflineFallback: false,
      });
      void saveDashboardOfflineSnapshot(dash);
    } catch {
      const cached = await loadDashboardOfflineSnapshot();
      set({
        dashboard: cached ?? get().dashboard,
        isLoading: false,
        isOfflineFallback: true,
      });
    }
  },

  processIngestion: async (params) => {
    const startedAt = Date.now();
    set({
      isIngesting: true,
      ingestionStage: 'HASHING',
      captureStartedAtMs: startedAt,
    });

    const stageTimer1 = window.setTimeout(() => {
      if (get().isIngesting) set({ ingestionStage: 'READING' });
    }, 180);
    const stageTimer2 = window.setTimeout(() => {
      if (get().isIngesting) set({ ingestionStage: 'DATES_VERIFIED' });
    }, 450);

    try {
      const simulatedSeconds =
        params.demoType === 'VISIT_2' ? 18 : params.demoType === 'VISIT_1' ? undefined : undefined;
      const result = await ingestReceipt({
        file: params.file,
        rawText: params.rawText,
        captureDurationSeconds: simulatedSeconds,
      });

      window.clearTimeout(stageTimer1);
      window.clearTimeout(stageTimer2);

      set({
        ingestionStage: 'DATES_VERIFIED',
        isIngesting: false,
      });

      if (result.duplicateDetected) {
        set({ selectedItemId: result.item._id });
        return result;
      }

      if (result.autoCommitted) {
        // Optimistically prepend item & refresh authoritative $facet dashboard
        const prev = get().dashboard;
        if (prev) {
          set({
            dashboard: {
              ...prev,
              allActiveItems: [result.item, ...prev.allActiveItems],
              urgentItems:
                result.item.urgencyLevel === 'CRITICAL' ||
                result.item.urgencyLevel === 'UPCOMING'
                  ? [result.item, ...prev.urgentItems]
                  : prev.urgentItems,
            },
            velocityBanner: {
              visit1Seconds: prev.metrics.firstVisitAvgSeconds || 58,
              visit2Seconds: 18,
              merchantName: result.item.merchantName,
              savedSeconds: (prev.metrics.firstVisitAvgSeconds || 58) - 18,
            },
          });
        }
        void get().loadDashboard();
      } else {
        set({ pendingReview: result });
      }

      return result;
    } catch (err) {
      window.clearTimeout(stageTimer1);
      window.clearTimeout(stageTimer2);
      set({ isIngesting: false, ingestionStage: 'IDLE' });
      throw err;
    }
  },

  confirmReviewItem: async (id, input) => {
    const startedAt = get().captureStartedAtMs;
    const elapsedSec = startedAt
      ? Math.max(12, Math.round((Date.now() - startedAt) / 1000))
      : undefined;

    const { item } = await confirmVaultItemApi(id, {
      ...input,
      captureDurationSeconds: input.captureDurationSeconds ?? elapsedSec,
    });

    set({ pendingReview: null, captureStartedAtMs: null });
    await get().loadDashboard();
    return item;
  },

  optimisticResolveItem: async (id, payload) => {
    const prevDash = get().dashboard;
    const targetItem = findVaultItemInState(prevDash, id);

    // Optimistic <16ms mutation
    if (prevDash && targetItem) {
      const recovered =
        payload.moneySavedOrRecovered !== undefined
          ? payload.moneySavedOrRecovered
          : targetItem.financials.amount;
      const updatedItem: VaultItemDTO = {
        ...targetItem,
        status: payload.status,
        urgencyLevel: payload.status === 'RETURN_INITIATED' ? targetItem.urgencyLevel : 'RESOLVED',
        outcome: {
          moneySavedOrRecovered: payload.status === 'RETURN_INITIATED' ? 0 : recovered,
          resolvedAt: new Date().toISOString(),
          resolutionNotes: payload.resolutionNotes ?? null,
        },
      };

      const isFinalResolved = payload.status !== 'RETURN_INITIATED';
      set({
        dashboard: {
          ...prevDash,
          urgentItems: isFinalResolved
            ? prevDash.urgentItems.filter((i) => i._id !== id)
            : prevDash.urgentItems.map((i) => (i._id === id ? updatedItem : i)),
          allActiveItems: isFinalResolved
            ? prevDash.allActiveItems.filter((i) => i._id !== id)
            : prevDash.allActiveItems.map((i) => (i._id === id ? updatedItem : i)),
          resolvedItems: isFinalResolved
            ? [updatedItem, ...prevDash.resolvedItems]
            : prevDash.resolvedItems,
        },
      });
    }

    try {
      const { item } = await resolveVaultItemApi(id, payload);
      void get().loadDashboard();
      return item;
    } catch {
      if (prevDash) set({ dashboard: prevDash });
      return null;
    }
  },

  optimisticRestoreItem: async (id) => {
    await restoreVaultItemApi(id);
    await get().loadDashboard();
  },

  optimisticDeleteItem: async (id) => {
    const prevDash = get().dashboard;
    if (prevDash) {
      set({
        dashboard: {
          ...prevDash,
          urgentItems: prevDash.urgentItems.filter((i) => i._id !== id),
          allActiveItems: prevDash.allActiveItems.filter((i) => i._id !== id),
          resolvedItems: prevDash.resolvedItems.filter((i) => i._id !== id),
        },
        selectedItemId: get().selectedItemId === id ? null : get().selectedItemId,
      });
    }
    try {
      await deleteVaultItemApi(id);
      void get().loadDashboard();
    } catch {
      if (prevDash) set({ dashboard: prevDash });
    }
  },

  resetDemo: async () => {
    await resetDemoWorkspaceApi();
    set({
      pendingReview: null,
      selectedItemId: null,
      velocityBanner: null,
      activeTab: 'ACTION_NEEDED',
    });
    await get().loadDashboard();
  },
}));
