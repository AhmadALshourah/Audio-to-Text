'use client';

import type { QuotaStatus } from '@audio-to-text/core';

export function QuotaBar({ quota }: { quota: QuotaStatus }) {
  const pctUsed = quota.limitMinutes > 0 ? (quota.usedMinutes / quota.limitMinutes) * 100 : 0;
  const isLow = quota.remainingMinutes <= quota.limitMinutes * 0.1;

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium capitalize">{quota.plan} plan</span>
        <span className="text-gray-500">
          {quota.usedMinutes.toFixed(1)} / {quota.limitMinutes} min used
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${isLow ? 'bg-red-500' : 'bg-black'}`}
          style={{ width: `${Math.min(100, pctUsed)}%` }}
        />
      </div>
      {isLow && (
        <p className="mt-2 text-xs text-red-600">
          {quota.remainingMinutes.toFixed(1)} minutes remaining this month.
        </p>
      )}
    </div>
  );
}
