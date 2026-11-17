import { env } from '../../config/env.js';
import type { NotificationPayload } from './emailDispatcher.js';

export async function dispatchWhatsappAlert(payload: NotificationPayload): Promise<{
  delivered: boolean;
  transport: string;
}> {
  if (!env.WHATSAPP_WEBHOOK_URL) {
    return {
      delivered: true,
      transport: 'audit-log-simulated-whatsapp',
    };
  }

  try {
    const res = await fetch(env.WHATSAPP_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'CLAIMVAULT_DEADLINE_ALERT',
        window: payload.windowLabel,
        message: `[ClaimVault ${payload.windowLabel}] ${payload.title} (${payload.merchantName}) — ${payload.currency} ${payload.amount} deadline on ${payload.deadlineDateISO.slice(0, 10)}.`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return {
      delivered: res.ok,
      transport: 'whatsapp-webhook',
    };
  } catch {
    return {
      delivered: false,
      transport: 'whatsapp-webhook-error',
    };
  }
}
