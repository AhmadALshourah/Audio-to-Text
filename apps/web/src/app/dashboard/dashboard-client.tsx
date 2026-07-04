'use client';

import { useState } from 'react';
import type { QuotaStatus } from '@audio-to-text/core';
import type { TranscriptionDTO } from '@/lib/serializers';
import { QuotaBar } from './quota-bar';
import { UploadDropzone } from './upload-dropzone';
import { TranscriptionItem } from './transcription-item';

interface DashboardClientProps {
  initialQuota: QuotaStatus;
  initialTranscriptions: TranscriptionDTO[];
}

const PENDING_PREFIX = 'pending-';

export function DashboardClient({ initialQuota, initialTranscriptions }: DashboardClientProps) {
  const [quota, setQuota] = useState(initialQuota);
  const [items, setItems] = useState(initialTranscriptions);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);

    const tempId = `${PENDING_PREFIX}${Date.now()}`;
    const optimisticItem: TranscriptionDTO = {
      id: tempId,
      status: 'processing',
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
        throw new Error(data?.error?.message ?? 'Upload failed.');
      }

      setItems((prev) => [data as TranscriptionDTO, ...prev.filter((t) => t.id !== tempId)]);

      const usageRes = await fetch('/api/usage');
      if (usageRes.ok) setQuota(await usageRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setItems((prev) => prev.filter((t) => t.id !== tempId));
    } finally {
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
        <p className="text-center text-sm text-gray-500">
          No transcriptions yet — upload one above.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <TranscriptionItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
