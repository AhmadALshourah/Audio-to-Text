'use client';

import { useTranslations } from 'next-intl';
import type { QuotaStatus } from '@audio-to-text/core';

export function QuotaBar({ quota }: { quota: QuotaStatus }) {
  const t = useTranslations('dashboard');
  const pctUsed = quota.limitMinutes > 0 ? (quota.usedMinutes / quota.limitMinutes) * 100 : 0;
  const isLow = quota.remainingMinutes <= quota.limitMinutes * 0.1;
  const planLabel = quota.plan === 'pro' ? t('planPro') : t('planFree');

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 font-mono text-xs font-medium uppercase tracking-wide text-accent-dark">
          {planLabel} {t('planSuffix')}
        </span>
        <span className="font-mono text-sm text-ink/70">
          {t('quotaUsed', {
            used: quota.usedMinutes.toFixed(1),
            limit: quota.limitMinutes,
          })}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-soft">
        <div
          className={`h-full rounded-full transition-all ${isLow ? 'bg-danger' : 'bg-accent'}`}
          style={{ width: `${Math.min(100, Math.max(2, pctUsed))}%` }}
        />
      </div>
      <p className={`mt-2.5 text-xs ${isLow ? 'text-danger' : 'text-ink/55'}`}>
        {t('quotaRemaining', { minutes: quota.remainingMinutes.toFixed(1) })}
      </p>
    </div>
  );
}
