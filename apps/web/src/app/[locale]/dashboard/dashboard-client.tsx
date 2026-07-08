'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { QuotaStatus } from '@audio-to-text/core';
import type { TranscriptionDTO } from '@/lib/serializers';
import { useApiErrorMessage } from '@/lib/api-error';
import { QuotaBar } from './quota-bar';
import { UploadDropzone } from './upload-dropzone';
import { TranscriptionItem } from './transcription-item';

interface DashboardClientProps {
  initialQuota: QuotaStatus;
  initialTranscriptions: TranscriptionDTO[];
  initialNextCursor: string | null;
}

const PENDING_PREFIX = 'pending-';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000; // stop polling after 3 minutes either way

export type PollNotice = 'auth' | 'network' | 'timeout';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function DashboardClient({
  initialQuota,
  initialTranscriptions,
  initialNextCursor,
}: DashboardClientProps) {
  const t = useTranslations('dashboard');
  const translateApiError = useApiErrorMessage();
  const [quota, setQuota] = useState(initialQuota);
  const [items, setItems] = useState(initialTranscriptions);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-item note when polling for a still-in-flight job stops without ever
  // reaching a final status — without this, a 401 (session expired
  // mid-upload), a network hiccup, or hitting POLL_TIMEOUT_MS all look
  // identical to the user: the item just silently stays on "processing"
  // forever with no indication anything went wrong.
  const [pollNotices, setPollNotices] = useState<Record<string, PollNotice>>({});

  async function handleLoadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/transcriptions?cursor=${encodeURIComponent(nextCursor)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { items: TranscriptionDTO[]; nextCursor: string | null };
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  // The worker processes jobs asynchronously, so after the upload responds
  // with a `pending` record we poll its status until it reaches a final state.
  async function pollTranscription(id: string) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);

      let res: Response;
      try {
        res = await fetch(`/api/transcriptions/${id}`);
      } catch {
        setPollNotices((prev) => ({ ...prev, [id]: 'network' }));
        return;
      }

      if (!res.ok) {
        setPollNotices((prev) => ({ ...prev, [id]: res.status === 401 ? 'auth' : 'network' }));
        return;
      }

      const data = (await res.json()) as TranscriptionDTO;
      setItems((prev) => prev.map((t) => (t.id === id ? data : t)));

      if (data.status === 'done' || data.status === 'failed') {
        const usageRes = await fetch('/api/usage');
        if (usageRes.ok) setQuota(await usageRes.json());
        return;
      }
    }

    setPollNotices((prev) => ({ ...prev, [id]: 'timeout' }));
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);

    const tempId = `${PENDING_PREFIX}${Date.now()}`;
    const optimisticItem: TranscriptionDTO = {
      id: tempId,
      status: 'pending',
      fileName: file.name,
      fileSizeBytes: file.size,
      durationSeconds: null,
      language: null,
      text: null,
      errorMessage: null,
      costUsd: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    setItems((prev) => [optimisticItem, ...prev]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/transcriptions', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(translateApiError(data?.error, t('uploadFailed')));
      }

      const record = data as TranscriptionDTO;
      setItems((prev) => [record, ...prev.filter((t) => t.id !== tempId)]);
      setUploading(false);

      void pollTranscription(record.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadFailed'));
      setItems((prev) => prev.filter((t) => t.id !== tempId));
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <QuotaBar quota={quota} />
      <UploadDropzone onUpload={handleUpload} disabled={uploading} />
      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-center text-sm text-ink/70">{t('noTranscriptions')}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <TranscriptionItem key={item.id} item={item} pollNotice={pollNotices[item.id]} />
            ))}
          </ul>
          {nextCursor && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="self-center text-sm font-medium text-ink/60 underline hover:text-ink disabled:opacity-50"
            >
              {loadingMore ? t('loadingMore') : t('loadMore')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
