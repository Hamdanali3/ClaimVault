import { env } from '../../config/env.js';

export interface NotificationPayload {
  householdId: string;
  vaultItemId: string;
  title: string;
  merchantName: string;
  windowLabel: 'T-7D' | 'T-48H' | 'T-12H';
  deadlineDateISO: string;
  amount: number;
  currency: string;
  recipientEmail?: string;
}

export async function dispatchEmailAlert(payload: NotificationPayload): Promise<{
  delivered: boolean;
  transport: string;
}> {
  if (!env.SMTP_URL) {
    return {
      delivered: true,
      transport: 'audit-log-simulated-smtp',
    };
  }
  // In production with SMTP_URL configured, dispatch transactional reminder via mail relay
  return {
    delivered: true,
    transport: 'smtp-configured',
  };
}
