'use client';

import { useTranslations } from 'next-intl';
import type { QuotaStatus } from '@audio-to-text/core';

export function QuotaBar({ quota }: { quota: QuotaStatus }) {
  const t = useTranslations('dashboard');
  const pctUsed = quota.limitMinutes > 0 ? (quota.usedMinutes / quota.limitMinutes) * 100 : 0;
  const isLow = quota.remainingMinutes <= quota.limitMinutes * 0.1;
  const planLabel = quota.plan === 'pro' ? t('planPro') : t('planFree');

  return (
    <div className="rounded-lg border border-ink/10 bg-paper-soft p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">
          {planLabel} {t('planSuffix')}
        </span>
        <span className="text-ink/70">
          {t('quotaUsed', {
            used: quota.usedMinutes.toFixed(1),
            limit: quota.limitMinutes,
          })}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-accent'}`}
          style={{ width: `${Math.min(100, pctUsed)}%` }}
        />
      </div>
      {isLow && (
        <p className="mt-2 text-xs text-red-600">
          {t('quotaRemaining', { minutes: quota.remainingMinutes.toFixed(1) })}
        </p>
      )}
    </div>
  );
}
