import { useEffect, useState } from 'react';
import { X, Copy, Check, LogOut, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchHouseholdMembers,
  inviteHouseholdMemberApi,
  loginAccount,
  registerAccount,
  setStoredTokens,
  type AuthSessionUser,
} from '../../services/api';

interface HouseholdAuthModalProps {
  open: boolean;
  onClose: () => void;
  sessionUser: AuthSessionUser | null;
  onAuthChanged: () => Promise<void>;
}

export function HouseholdAuthModal({
  open,
  onClose,
  sessionUser,
  onAuthChanged,
}: HouseholdAuthModalProps) {
  const [mode, setMode] = useState<'HOUSEHOLD' | 'LOGIN' | 'REGISTER'>('HOUSEHOLD');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [household, setHousehold] = useState<{
    name: string;
    planTier: string;
    inboundForwardingAlias: string;
    members: Array<{ userId: string; fullName: string; email: string; role: string }>;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchHouseholdMembers()
      .then(setHousehold)
      .catch(() => setHousehold(null));
  }, [open, sessionUser]);

  if (!open) return null;

  const isDemo = sessionUser?.isDemoWorkspace !== false;

  const copyAlias = async () => {
    if (!household?.inboundForwardingAlias) return;
    await navigator.clipboard.writeText(household.inboundForwardingAlias);
    setCopiedAlias(true);
    setTimeout(() => setCopiedAlias(false), 1600);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await loginAccount({ email, password });
      await onAuthChanged();
      toast.success('Signed in to your ClaimVault household.');
      setMode('HOUSEHOLD');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message ?? 'Sign-in failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await registerAccount({
        fullName,
        email,
        password,
        defaultCurrency: currency,
      });
      await onAuthChanged();
      toast.success('Household account created with Argon2id encryption.');
      setMode('HOUSEHOLD');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message ?? 'Registration failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSubmitting(true);
    try {
      await inviteHouseholdMemberApi(inviteEmail.trim(), 'EDITOR');
      setInviteEmail('');
      const updated = await fetchHouseholdMembers();
      setHousehold(updated);
      toast.success('Household member added.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message ?? 'Could not add member';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const signOutToDemo = async () => {
    setStoredTokens(null, null);
    await onAuthChanged();
    toast.success('Returned to Demo Household Workspace.');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/35 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#E6E4DD] bg-[#FFFFFF] px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold text-[#141413]">
              Household & Account Workspace
            </h2>
            <p className="text-xs text-[#615F59]">
              {isDemo
                ? 'Active in Demo Workspace — create an account anytime to isolate your own vault.'
                : `Signed in as ${sessionUser?.fullName} (${sessionUser?.email})`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#E6E4DD] text-[#615F59] hover:text-[#141413]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-[#E6E4DD] bg-[#FFFFFF] px-5 py-2 text-xs">
          {(['HOUSEHOLD', 'LOGIN', 'REGISTER'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMode(tab)}
              className={`rounded px-2.5 py-1.5 font-medium ${
                mode === tab
                  ? 'bg-[#141413] text-[#FAF9F6]'
                  : 'text-[#615F59] hover:bg-[#F3F1EC]'
              }`}
            >
              {tab === 'HOUSEHOLD'
                ? 'Shared Household'
                : tab === 'LOGIN'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {mode === 'HOUSEHOLD' && (
            <div className="space-y-4 text-xs">
              {household && (
                <>
                  <div className="rounded-md border border-[#E6E4DD] bg-[#FFFFFF] p-3">
                    <div className="text-[11px] font-medium uppercase text-[#615F59]">
                      Dedicated Inbound Receipt Forwarding Alias
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <code className="text-xs font-semibold text-[#141413] tabular-ledger">
                        {household.inboundForwardingAlias}
                      </code>
                      <button
                        type="button"
                        onClick={() => void copyAlias()}
                        className="inline-flex items-center gap-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2 py-1 text-[11px] font-medium hover:bg-[#F3F1EC]"
                      >
                        {copiedAlias ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedAlias ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-md border border-[#E6E4DD] bg-[#FFFFFF] p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase text-[#615F59]">
                      <Users className="h-3.5 w-3.5" />
                      <span>Household Members ({household.members.length})</span>
                    </div>
                    <ul className="space-y-1.5">
                      {household.members.map((m) => (
                        <li
                          key={m.userId}
                          className="flex items-center justify-between rounded bg-[#FAF9F6] px-2.5 py-1.5"
                        >
                          <div>
                            <span className="font-medium text-[#141413]">{m.fullName}</span>
                            <span className="ml-2 text-[#615F59]">{m.email}</span>
                          </div>
                          <span className="rounded border border-[#E6E4DD] bg-[#FFFFFF] px-1.5 py-0.5 text-[10px] font-medium tabular-ledger">
                            {m.role}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <form onSubmit={handleInvite} className="mt-3 flex gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Partner or teammate email..."
                        className="flex-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] px-2.5 py-1.5 text-xs focus:border-[#141413] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded bg-[#141413] px-3 py-1.5 text-xs font-medium text-[#FAF9F6]"
                      >
                        Invite
                      </button>
                    </form>
                  </div>
                </>
              )}

              {!isDemo && (
                <button
                  type="button"
                  onClick={() => void signOutToDemo()}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded border border-[#E6E4DD] bg-[#FFFFFF] px-3 text-xs font-medium text-[#141413] hover:bg-[#F3F1EC]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out to Demo Workspace</span>
                </button>
              )}
            </div>
          )}

          {mode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium text-[#141413]">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded border border-[#E6E4DD] bg-[#FFFFFF] px-3 text-sm focus:border-[#141413] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-[#141413]">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded border border-[#E6E4DD] bg-[#FFFFFF] px-3 text-sm focus:border-[#141413] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[42px] w-full rounded-md bg-[#141413] text-xs font-semibold text-[#FAF9F6]"
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {mode === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium text-[#141413]">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 w-full rounded border border-[#E6E4DD] bg-[#FFFFFF] px-3 text-sm focus:border-[#141413] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-[#141413]">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded border border-[#E6E4DD] bg-[#FFFFFF] px-3 text-sm focus:border-[#141413] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-[#141413]">
                    Password (8+ chars)
                  </label>
                  <input
                    type="password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded border border-[#E6E4DD] bg-[#FFFFFF] px-3 text-sm focus:border-[#141413] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[#141413]">
                    Default Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'PKR' | 'USD')}
                    className="h-10 w-full rounded border border-[#E6E4DD] bg-[#FFFFFF] px-3 text-sm"
                  >
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[42px] w-full rounded-md bg-[#141413] text-xs font-semibold text-[#FAF9F6]"
              >
                {submitting ? 'Creating Household...' : 'Create Private Household Vault'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
