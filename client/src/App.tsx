import { useCallback, useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Upload, AlertTriangle, RotateCcw } from 'lucide-react';
import type {
  ConfirmVaultItemInput,
  ResolveVaultItemInput,
  VaultItemDTO,
} from '@claimvault/shared';
import { findVaultItemInState, useVaultStore } from './store/useVaultStore';
import { useGlobalClipboardPaste } from './hooks/useGlobalClipboardPaste';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { downloadClaimDossierPdfFile } from './services/api';
import { formatMoney, formatShortDate } from './utils/formatters';
import { TopLedgerHeader } from './components/organisms/TopLedgerHeader';
import { GlobalDropzone } from './components/organisms/GlobalDropzone';
import { VelocityComparisonBanner } from './components/molecules/VelocityComparisonBanner';
import { ActionNeededView } from './pages/ActionNeededView';
import { VaultLedgerView } from './pages/VaultLedgerView';
import { SavedMoneyAnalyticsView } from './pages/SavedMoneyAnalyticsView';
import { MixedInitiativeDrawer } from './components/organisms/MixedInitiativeDrawer';
import { ItemDetailDrawer } from './components/organisms/ItemDetailDrawer';
import { CommandPalette } from './components/organisms/CommandPalette';
import { HouseholdAuthModal } from './components/organisms/HouseholdAuthModal';
import { PublicVerifyPage } from './components/organisms/PublicVerifyPage';

function getVerifyTokenFromPath(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/verify\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function App() {
  const [verifyToken, setVerifyToken] = useState<string | null>(() =>
    getVerifyTokenFromPath(),
  );
  const uploadBtnRef = useRef<HTMLButtonElement | null>(null);

  const {
    dashboard,
    sessionUser,
    activeTab,
    isLoading,
    isOfflineFallback,
    apiError,
    ingestionStage,
    isIngesting,
    pendingReview,
    selectedItemId,
    commandPaletteOpen,
    authModalOpen,
    velocityBanner,
    globalDragActive,
    setActiveTab,
    setSelectedItemId,
    setCommandPaletteOpen,
    setAuthModalOpen,
    setGlobalDragActive,
    clearPendingReview,
    dismissVelocityBanner,
    clearSessionTransientState,
    loadDashboard,
    processIngestion,
    confirmReviewItem,
    optimisticResolveItem,
    optimisticRestoreItem,
    optimisticDeleteItem,
    updateMerchantPolicy,
    deleteMerchantPolicy,
    resetDemo,
  } = useVaultStore();

  useEffect(() => {
    const onPop = () => setVerifyToken(getVerifyTokenFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!verifyToken) {
      void loadDashboard();
    }
  }, [loadDashboard, verifyToken]);

  const openVerifyRoute = (token: string) => {
    // Close open item drawer before switching to public certificate view
    setSelectedItemId(null);
    window.history.pushState({}, '', `/verify/${encodeURIComponent(token)}`);
    setVerifyToken(token);
  };

  const closeVerifyRoute = () => {
    setSelectedItemId(null);
    window.history.pushState({}, '', '/');
    setVerifyToken(null);
  };

  const selectedItem = findVaultItemInState(dashboard, selectedItemId);

  const runIngestionWithFeedback = useCallback(
    async (params: {
      file?: File;
      rawText?: string;
      demoType?: 'VISIT_1' | 'VISIT_2';
    }) => {
      try {
        const res = await processIngestion(params);
        if (res.duplicateDetected) {
          toast('Receipt already archived (SHA-256 match)', {
            description: `${res.item.title} from ${res.item.merchantName} is already protected.`,
          });
          return;
        }

        if (res.autoCommitted) {
          const deadlineStr = res.item.dates.returnDeadline
            ? `Return by ${formatShortDate(res.item.dates.returnDeadline)}`
            : `Protected`;
          toast.success(
            `Saved ${res.item.title} (${formatMoney(res.item.financials.amount, res.item.financials.currency)}) · ${deadlineStr}`,
            {
              duration: 6000,
              action: {
                label: 'Undo',
                onClick: () => {
                  void optimisticDeleteItem(res.item._id).then((ok) => {
                    if (ok) toast('Capture undone');
                    else toast.error('Could not undo capture');
                  });
                },
              },
              cancel: {
                label: 'Edit',
                onClick: () => setSelectedItemId(res.item._id),
              },
            },
          );
        }
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { status?: number; data?: { error?: { message?: string } } };
        };
        const serverMsg = axiosErr?.response?.data?.error?.message;
        const msg =
          serverMsg && serverMsg !== 'Internal server error'
            ? serverMsg
            : axiosErr?.response?.status && axiosErr.response.status >= 500
              ? 'ClaimVault API is currently unavailable. Could not extract receipt.'
              : 'Could not extract receipt details.';
        toast.error(msg);
      }
    },
    [optimisticDeleteItem, processIngestion, setSelectedItemId],
  );

  const anyModalOrDrawerOpen = Boolean(
    verifyToken || authModalOpen || commandPaletteOpen || pendingReview,
  );

  useGlobalClipboardPaste({
    disabled: anyModalOrDrawerOpen || Boolean(selectedItemId),
    onPasteText: (text) => void runIngestionWithFeedback({ rawText: text }),
    onDropOrPasteFile: (file) => void runIngestionWithFeedback({ file }),
    onDragStateChange: setGlobalDragActive,
  });

  const handleDownloadClaimPdf = useCallback(
    (item: VaultItemDTO, defectNotes?: string) => {
      void downloadClaimDossierPdfFile(item._id, item.title, defectNotes)
        .then(() => toast.success(`Downloaded Claim Dossier PDF for ${item.title}`))
        .catch(() => toast.error('Failed to generate Claim Dossier PDF'));
    },
    [],
  );

  const handleResolveWithUndo = useCallback(
    async (item: VaultItemDTO, explicitStatus?: ResolveVaultItemInput['status']) => {
      const targetStatus: ResolveVaultItemInput['status'] =
        explicitStatus ??
        (item.kind === 'SUBSCRIPTION'
          ? 'SUBSCRIPTION_CANCELLED'
          : item.nextDeadlineType === 'RETURN'
            ? 'RETURNED_REFUNDED'
            : 'WARRANTY_CLAIMED');

      const resolved = await optimisticResolveItem(item._id, {
        status: targetStatus,
        moneySavedOrRecovered: item.financials.amount,
      });

      if (!resolved) {
        toast.error('Could not update item status. Please retry.');
        return;
      }

      const actionDesc =
        targetStatus === 'SUBSCRIPTION_CANCELLED'
          ? 'Subscription cancellation logged'
          : targetStatus === 'RETURNED_REFUNDED'
            ? 'Marked returned & refunded'
            : 'Marked warranty claimed';

      toast.success(
        `${actionDesc} · ${formatMoney(item.financials.amount, item.financials.currency)} saved`,
        {
          duration: 5000,
          action: {
            label: 'Undo',
            onClick: () => {
              void optimisticRestoreItem(item._id).then((ok) => {
                if (ok) toast('Restored back to active ledger');
                else toast.error('Could not restore item');
              });
            },
          },
        },
      );
    },
    [optimisticResolveItem, optimisticRestoreItem],
  );

  useKeyboardShortcuts({
    disabled: Boolean(verifyToken),
    singleKeyDisabled: Boolean(authModalOpen || commandPaletteOpen || pendingReview),
    onToggleCommandPalette: () => setCommandPaletteOpen(!commandPaletteOpen),
    onNewReceiptFocus: () => uploadBtnRef.current?.click(),
    onExportClaimPdf: selectedItem
      ? () => handleDownloadClaimPdf(selectedItem)
      : undefined,
    onMarkReturned:
      selectedItem && selectedItem.urgencyLevel !== 'RESOLVED'
        ? () => void handleResolveWithUndo(selectedItem)
        : undefined,
  });

  // 60s Visit 1 Speed Demo (Unseen merchant + faded thermal date -> Mixed-Initiative Drawer)
  const handleSimulateVisit1 = () => {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const sampleVisit1 = [
      'HAFEEZ CENTER LAPTOP ZONE · LAHORE',
      `Order #: HC-${suffix}`,
      'Date: ??/11/2026 [faded thermal print]',
      'Item: Logitech MX Master 3S Wireless Mouse',
      'Serial: LOGI-MX3S-88412',
      'Return Policy: 7 days check warranty',
      'Warranty: 12 months official warranty',
      'Total Paid: PKR 24,500',
    ].join('\n');
    void runIngestionWithFeedback({ rawText: sampleVisit1, demoType: 'VISIT_1' });
  };

  // 20s Visit 2+ Speed Demo (Known Merchant: Daraz -> Merchant Memory auto-match & 0-click Undo toast)
  const handleSimulateVisit2 = () => {
    const orderNum = `DZ-${Math.floor(100000 + Math.random() * 899999)}`;
    const today = new Date().toISOString().slice(0, 10);
    const sampleVisit2 = [
      'DARAZ MALL OFFICIAL ORDER CONFIRMATION',
      `Order #: ${orderNum}`,
      `Date: ${today}`,
      'Item: Samsung 27" Odyssey G5 QHD Monitor',
      'Serial: SAM-G527-4491',
      'Total Paid: PKR 64,500',
    ].join('\n');
    void runIngestionWithFeedback({ rawText: sampleVisit2, demoType: 'VISIT_2' });
  };

  const handleConfirmReview = async (id: string, input: ConfirmVaultItemInput) => {
    const saved = await confirmReviewItem(id, input);
    toast.success(
      `Saved ${saved.title} · Policy learned for ${saved.merchantName}`,
    );
  };

  const handleUpdateExistingItem = async (id: string, input: ConfirmVaultItemInput) => {
    try {
      const saved = await confirmReviewItem(id, input);
      toast.success(`Updated ${saved.title} and recalculated deadlines.`);
    } catch {
      toast.error('Could not save item changes.');
      throw new Error('Update failed');
    }
  };

  const handleDeleteWithToast = async (item: VaultItemDTO) => {
    const ok = await optimisticDeleteItem(item._id);
    if (ok) toast(`Removed ${item.title} from vault`);
    else toast.error(`Could not remove ${item.title}`);
  };

  const handleResetDemo = async () => {
    try {
      await resetDemo();
      toast.success('Demo workspace restored to default 4 records');
    } catch {
      toast.error('Could not reset demo workspace.');
    }
  };

  const handleAuthChanged = async () => {
    clearSessionTransientState();
    await loadDashboard();
  };

  const handleUpdateMerchantPolicy = async (
    id: string,
    payload: {
      defaultReturnWindowDays?: number;
      defaultWarrantyMonths?: number;
      defaultCurrency?: string;
    },
  ) => {
    try {
      const updated = await updateMerchantPolicy(id, payload);
      toast.success(`Updated default policy for ${updated.displayName}`);
    } catch {
      toast.error('Could not update merchant policy');
    }
  };

  const handleDeleteMerchantPolicy = async (id: string, displayName: string) => {
    try {
      await deleteMerchantPolicy(id);
      toast(`Removed learned policy for ${displayName}`);
    } catch {
      toast.error('Could not remove merchant policy');
    }
  };

  const toasterProps = {
    position: 'bottom-right' as const,
    toastOptions: {
      style: {
        background: '#141413',
        color: '#FAF9F6',
        border: '1px solid #3F3E3B',
        fontSize: '12px',
      },
      classNames: {
        description: '!text-[#E6E4DD]',
        actionButton: '!bg-[#FAF9F6] !text-[#141413] !font-semibold hover:!bg-[#E6E4DD]',
        cancelButton:
          '!bg-[#2A2A28] !text-[#FAF9F6] !border !border-[#52514D] !font-medium hover:!bg-[#3F3E3B]',
      },
    },
  };

  if (verifyToken) {
    return (
      <>
        <Toaster {...toasterProps} />
        <PublicVerifyPage token={verifyToken} onBackToVault={closeVerifyRoute} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#141413]">
      <Toaster {...toasterProps} />

      {/* Full-viewport drag-drop indicator */}
      {globalDragActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#FAF9F6]/90 p-6 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[#141413] bg-[#FFFFFF] px-10 py-12 text-center shadow-lg">
            <Upload className="h-8 w-8 text-[#141413]" />
            <div className="text-base font-semibold text-[#141413]">
              Drop receipt photo or PDF anywhere to archive
            </div>
            <div className="text-xs text-[#615F59]">
              Instant SHA-256 verification and Merchant Memory matching
            </div>
          </div>
        </div>
      )}

      <TopLedgerHeader
        dashboard={dashboard}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onSimulateVisit1={handleSimulateVisit1}
        onSimulateVisit2={handleSimulateVisit2}
        onResetDemo={() => void handleResetDemo()}
        isIngesting={isIngesting}
        isOfflineFallback={isOfflineFallback}
        apiError={apiError}
        isDemoWorkspace={sessionUser?.isDemoWorkspace !== false}
        userName={sessionUser?.fullName}
      />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        {apiError && isOfflineFallback && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs text-[#92400E]"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Showing cached proof snapshot — live API is unreachable ({apiError})
              </span>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded border border-[#92400E] bg-[#FFFFFF] px-2.5 text-xs font-semibold text-[#92400E] hover:bg-[#FEF3C7]"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <GlobalDropzone
          onUploadFile={(file) => void runIngestionWithFeedback({ file })}
          onSubmitText={(text) => void runIngestionWithFeedback({ rawText: text })}
          onTrySampleReceipt={handleSimulateVisit1}
          ingestionStage={ingestionStage}
          isIngesting={isIngesting}
          aiMode={dashboard?.systemStatus?.aiMode}
          inputTriggerRef={uploadBtnRef}
        />

        <VelocityComparisonBanner
          banner={velocityBanner}
          onDismiss={dismissVelocityBanner}
        />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-24 animate-pulse rounded-lg border border-[#E6E4DD] bg-[#FFFFFF]"
              />
            ))}
          </div>
        ) : activeTab === 'ACTION_NEEDED' ? (
          <ActionNeededView
            urgentItems={dashboard?.urgentItems ?? []}
            apiError={apiError && !isOfflineFallback ? apiError : null}
            onRetryConnection={() => void loadDashboard()}
            onInspect={(item) => setSelectedItemId(item._id)}
            onDownloadClaimPdf={(item) => handleDownloadClaimPdf(item)}
            onResolveOutcome={(item) => void handleResolveWithUndo(item)}
            onGoToVault={() => setActiveTab('VAULT')}
          />
        ) : activeTab === 'VAULT' ? (
          <VaultLedgerView
            items={dashboard?.allActiveItems ?? []}
            merchantProfiles={dashboard?.merchantProfiles ?? []}
            onSelectItem={(item) => setSelectedItemId(item._id)}
            onUpdateMerchantPolicy={handleUpdateMerchantPolicy}
            onDeleteMerchantPolicy={handleDeleteMerchantPolicy}
          />
        ) : (
          <SavedMoneyAnalyticsView
            resolvedItems={dashboard?.resolvedItems ?? []}
            totalSavedPkr={dashboard?.metrics.totalMoneySavedOrRecovered ?? 0}
            firstVisitAvgSeconds={dashboard?.metrics.firstVisitAvgSeconds ?? 58}
            repeatVelocityAvgSeconds={
              dashboard?.metrics.repeatVelocityAvgSeconds ?? 18
            }
            onSelectItem={(item) => setSelectedItemId(item._id)}
            onRestoreItem={(item) =>
              void optimisticRestoreItem(item._id).then((ok) => {
                if (ok) toast('Restored item to active vault');
                else toast.error('Could not restore item');
              })
            }
            onDownloadClaimPdf={(item) => handleDownloadClaimPdf(item)}
          />
        )}
      </main>

      <MixedInitiativeDrawer
        review={pendingReview}
        onClose={clearPendingReview}
        onConfirm={handleConfirmReview}
        onDiscard={optimisticDeleteItem}
      />

      <ItemDetailDrawer
        item={selectedItem}
        onClose={() => setSelectedItemId(null)}
        onDownloadClaimPdf={handleDownloadClaimPdf}
        onResolveOutcome={(item, status) => void handleResolveWithUndo(item, status)}
        onUpdateItem={handleUpdateExistingItem}
        onDelete={(item) => void handleDeleteWithToast(item)}
        onOpenVerifyRoute={openVerifyRoute}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        dashboard={dashboard}
        onSelectItem={(item) => setSelectedItemId(item._id)}
        onDownloadClaimPdf={(item) => handleDownloadClaimPdf(item)}
        onCopySerial={(serial) => {
          void navigator.clipboard.writeText(serial);
          toast.success(`Copied serial ${serial}`);
        }}
        onSwitchTab={setActiveTab}
        onSimulateVisit1={handleSimulateVisit1}
        onSimulateVisit2={handleSimulateVisit2}
      />

      <HouseholdAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        sessionUser={sessionUser}
        systemStatus={dashboard?.systemStatus}
        apiError={apiError}
        onAuthChanged={handleAuthChanged}
      />
    </div>
  );
}

export default App;
