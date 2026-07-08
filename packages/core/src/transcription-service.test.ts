import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { prisma } from '@audio-to-text/db';

// Mock the Whisper call so tests never hit the real OpenAI API (no cost,
// no network) while still exercising all of our own orchestration logic.
vi.mock('./whisper.js', () => ({
  transcribeAudio: vi.fn(),
}));

import { transcribeAudio } from './whisper.js';
import {
  createTranscription,
  claimNextTranscription,
  processTranscription,
  getSubtitles,
  reclaimStaleProcessingJobs,
  listTranscriptions,
} from './transcription-service.js';
import { ValidationError } from './errors.js';
import { STALE_PROCESSING_MS, MAX_TRANSCRIPTION_ATTEMPTS } from '@audio-to-text/shared';

const mockTranscribe = vi.mocked(transcribeAudio);

// A minimal but valid WAV header — passes the magic-bytes sniff in validation.ts.
function wavBuffer(): Buffer {
  const buf = Buffer.alloc(44);
  buf.write('RIFF', 0);
  buf.write('WAVE', 8);
  return buf;
}

describe('transcription-service', () => {
  let userId: string;

  beforeAll(async () => {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const user = await prisma.user.create({
      data: {
        email: `transcription-test-${Date.now()}@example.com`,
        passwordHash: 'unused',
        subscription: {
          create: {
            plan: 'free',
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        },
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
  });

  // claimNextTranscription() picks the globally-oldest pending job, so a
  // leftover row from a previous test would break these ordering-sensitive
  // assertions. Reset the whole queue before each test for a clean slate.
  beforeEach(async () => {
    await prisma.transcription.deleteMany({});
  });

  it('creates a pending record with the audio saved to disk', async () => {
    const record = await createTranscription(
      userId,
      { fileName: 'clip.wav', sizeBytes: 44 },
      wavBuffer(),
    );

    expect(record.status).toBe('pending');
    expect(record.audioPath).toBeTruthy();
    expect(existsSync(record.audioPath!)).toBe(true);
  });

  it('rejects content that does not look like audio', async () => {
    await expect(
      createTranscription(
        userId,
        { fileName: 'fake.wav', sizeBytes: 10 },
        Buffer.from('not audio'),
      ),
    ).rejects.toThrow(ValidationError);
  });

  it('claims the oldest pending job and marks it processing', async () => {
    const record = await createTranscription(
      userId,
      { fileName: 'claim-me.wav', sizeBytes: 44 },
      wavBuffer(),
    );

    const claimed = await claimNextTranscription();
    expect(claimed?.id).toBe(record.id);
    expect(claimed?.status).toBe('processing');
    expect(claimed?.attempts).toBe(1);

    // A second claim attempt must not pick up the same (now `processing`) job.
    const reclaimed = await claimNextTranscription();
    expect(reclaimed).toBeNull();
  });

  it('returns null when there is nothing pending', async () => {
    expect(await claimNextTranscription()).toBeNull();
  });

  it('processes a claimed job to completion, deletes the audio, and logs usage', async () => {
    mockTranscribe.mockResolvedValueOnce({
      text: 'hello world',
      durationSeconds: 12,
      language: 'english',
      costUsd: 0.0012,
      segments: [{ start: 0, end: 12, text: 'hello world' }],
    });

    const record = await createTranscription(
      userId,
      { fileName: 'success.wav', sizeBytes: 44 },
      wavBuffer(),
    );
    const claimed = await claimNextTranscription();
    expect(claimed?.id).toBe(record.id);

    await processTranscription(claimed!);

    const final = await prisma.transcription.findUniqueOrThrow({ where: { id: record.id } });
    expect(final.status).toBe('done');
    expect(final.text).toBe('hello world');
    expect(final.durationSeconds).toBe(12);
    expect(final.audioPath).toBeNull();
    expect(existsSync(record.audioPath!)).toBe(false);
    expect(JSON.parse(final.segmentsJson!)).toEqual([{ start: 0, end: 12, text: 'hello world' }]);

    const usage = await prisma.usageLog.findUnique({ where: { transcriptionId: record.id } });
    expect(usage?.seconds).toBe(12);
  });

  it('requeues to pending on failure while attempts remain', async () => {
    mockTranscribe.mockRejectedValueOnce(new Error('transient failure'));

    const record = await createTranscription(
      userId,
      { fileName: 'retry-me.wav', sizeBytes: 44 },
      wavBuffer(),
    );
    const claimed = await claimNextTranscription(); // attempts -> 1
    expect(claimed?.attempts).toBe(1);

    await processTranscription(claimed!);

    const after = await prisma.transcription.findUniqueOrThrow({ where: { id: record.id } });
    expect(after.status).toBe('pending');
    expect(after.errorMessage).toBe('transient failure');
    // Still on disk — a future attempt needs it.
    expect(existsSync(record.audioPath!)).toBe(true);
  });

  it('gives up (fails permanently) once attempts are exhausted', async () => {
    mockTranscribe.mockRejectedValueOnce(new Error('permanent failure'));

    const record = await createTranscription(
      userId,
      { fileName: 'give-up.wav', sizeBytes: 44 },
      wavBuffer(),
    );

    // First attempt: fails, requeued (attempts=1 < MAX_TRANSCRIPTION_ATTEMPTS=2).
    let claimed = await claimNextTranscription();
    await processTranscription(claimed!);

    // Second attempt: fails again, attempts=2 >= max -> permanently failed.
    mockTranscribe.mockRejectedValueOnce(new Error('permanent failure'));
    claimed = await claimNextTranscription();
    expect(claimed?.attempts).toBe(2);
    await processTranscription(claimed!);

    const final = await prisma.transcription.findUniqueOrThrow({ where: { id: record.id } });
    expect(final.status).toBe('failed');
    expect(final.audioPath).toBeNull();
    expect(existsSync(record.audioPath!)).toBe(false);
  });

  it('getSubtitles renders SRT/VTT for a done job and rejects one still pending', async () => {
    mockTranscribe.mockResolvedValueOnce({
      text: 'hello world',
      durationSeconds: 2,
      language: 'english',
      costUsd: 0.0002,
      segments: [{ start: 0, end: 2, text: 'hello world' }],
    });

    const record = await createTranscription(
      userId,
      { fileName: 'subs.wav', sizeBytes: 44 },
      wavBuffer(),
    );
    const pendingSubs = getSubtitles(userId, record.id, 'srt');
    await expect(pendingSubs).rejects.toThrow(ValidationError);

    const claimed = await claimNextTranscription();
    await processTranscription(claimed!);

    const srt = await getSubtitles(userId, record.id, 'srt');
    expect(srt).toContain('00:00:00,000 --> 00:00:02,000');
    expect(srt).toContain('hello world');

    const vtt = await getSubtitles(userId, record.id, 'vtt');
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('00:00:00.000 --> 00:00:02.000');
  });

  describe('reclaimStaleProcessingJobs', () => {
    const staleTimestamp = () => new Date(Date.now() - STALE_PROCESSING_MS - 60_000);

    it('requeues a stuck processing job back to pending when attempts remain', async () => {
      const record = await createTranscription(
        userId,
        { fileName: 'stuck-retry.wav', sizeBytes: 44 },
        wavBuffer(),
      );
      await prisma.transcription.update({
        where: { id: record.id },
        data: { status: 'processing', attempts: 1, updatedAt: staleTimestamp() },
      });

      const count = await reclaimStaleProcessingJobs();
      expect(count).toBe(1);

      const after = await prisma.transcription.findUniqueOrThrow({ where: { id: record.id } });
      expect(after.status).toBe('pending');
      expect(after.errorMessage).toContain('Reclaimed');
      // Audio must survive — a future attempt still needs it.
      expect(existsSync(record.audioPath!)).toBe(true);
    });

    it('permanently fails and deletes audio for a stuck job that already exhausted attempts', async () => {
      const record = await createTranscription(
        userId,
        { fileName: 'stuck-giveup.wav', sizeBytes: 44 },
        wavBuffer(),
      );
      await prisma.transcription.update({
        where: { id: record.id },
        data: {
          status: 'processing',
          attempts: MAX_TRANSCRIPTION_ATTEMPTS,
          updatedAt: staleTimestamp(),
        },
      });

      const count = await reclaimStaleProcessingJobs();
      expect(count).toBe(1);

      const after = await prisma.transcription.findUniqueOrThrow({ where: { id: record.id } });
      expect(after.status).toBe('failed');
      expect(after.audioPath).toBeNull();
      expect(existsSync(record.audioPath!)).toBe(false);
    });

    it('leaves a recently-updated processing job alone', async () => {
      const record = await createTranscription(
        userId,
        { fileName: 'fresh.wav', sizeBytes: 44 },
        wavBuffer(),
      );
      await prisma.transcription.update({
        where: { id: record.id },
        data: { status: 'processing', attempts: 1 }, // updatedAt bumps to "now"
      });

      const count = await reclaimStaleProcessingJobs();
      expect(count).toBe(0);

      const after = await prisma.transcription.findUniqueOrThrow({ where: { id: record.id } });
      expect(after.status).toBe('processing');
    });
  });

  describe('listTranscriptions', () => {
    it('pages through results newest-first with a cursor, and reports no next page at the end', async () => {
      // Deliberately out of creation order — createdAt is set explicitly so
      // the "newest first" ordering is actually exercised, not just creation order.
      const base = Date.now();
      for (let i = 0; i < 5; i++) {
        await prisma.transcription.create({
          data: {
            userId,
            status: 'done',
            fileName: `page-${i}.wav`,
            fileSizeBytes: 44,
            createdAt: new Date(base + i * 1000),
          },
        });
      }

      const firstPage = await listTranscriptions(userId, { limit: 2 });
      expect(firstPage.items.map((t) => t.fileName)).toEqual(['page-4.wav', 'page-3.wav']);
      expect(firstPage.nextCursor).toBeTruthy();

      const secondPage = await listTranscriptions(userId, {
        limit: 2,
        cursor: firstPage.nextCursor!,
      });
      expect(secondPage.items.map((t) => t.fileName)).toEqual(['page-2.wav', 'page-1.wav']);
      expect(secondPage.nextCursor).toBeTruthy();

      const thirdPage = await listTranscriptions(userId, {
        limit: 2,
        cursor: secondPage.nextCursor!,
      });
      expect(thirdPage.items.map((t) => t.fileName)).toEqual(['page-0.wav']);
      expect(thirdPage.nextCursor).toBeNull();
    });

    it('reports no next page when everything fits in one page', async () => {
      await prisma.transcription.create({
        data: { userId, status: 'done', fileName: 'only-one.wav', fileSizeBytes: 44 },
      });

      const page = await listTranscriptions(userId, { limit: 50 });
      expect(page.items).toHaveLength(1);
      expect(page.nextCursor).toBeNull();
    });
  });
});
