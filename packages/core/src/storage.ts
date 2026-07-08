import { mkdir, writeFile, readFile, unlink, statfs } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '@audio-to-text/shared/logger';
import { ValidationError } from './errors.js';

/**
 * Local-filesystem audio storage (replaces cloud object storage). Audio is
 * transient — written on upload, read once by the worker, then deleted; only
 * the transcribed text is kept long-term.
 */

/**
 * Both apps (web, worker) validate UPLOADS_DIR as a required absolute path at
 * startup (see their env.ts) before either ever calls into this module, so by
 * the time we get here it's always set. No cwd-relative fallback: web and
 * worker run as separate processes with different working directories, and a
 * relative default would silently resolve to two different folders.
 */
function uploadsDir(): string {
  const dir = process.env.UPLOADS_DIR;
  if (!dir) {
    throw new Error('UPLOADS_DIR is not set. It must be validated at process startup.');
  }
  return dir;
}

function pathFor(id: string, extension: string): string {
  const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return path.join(uploadsDir(), `${id}.${safeExt}`);
}

// Safety margin beyond the incoming file itself, so a write doesn't land
// exactly at 0 bytes free and take the rest of the filesystem down with it.
const MIN_FREE_BYTES_MARGIN = 10 * 1024 * 1024; // 10 MB

/**
 * Best-effort free-space check before writing `incomingBytes` more to `dir`.
 * Throws a clear {@link ValidationError} instead of letting a raw ENOSPC
 * surface as a generic 500 later. If the check itself can't be performed
 * (unsupported platform, permission issue reading fs stats), we don't block
 * the upload over a check we can't reliably make — the write itself is still
 * the real source of truth.
 */
async function assertEnoughDiskSpace(dir: string, incomingBytes: number): Promise<void> {
  let freeBytes: number;
  try {
    const stats = await statfs(dir);
    freeBytes = stats.bavail * stats.bsize;
  } catch {
    return;
  }

  if (freeBytes < incomingBytes + MIN_FREE_BYTES_MARGIN) {
    throw new ValidationError(
      'Not enough storage space available to accept this upload. Please try again later.',
      'upload/insufficient_storage',
    );
  }
}

/** Persist audio bytes for a transcription; returns the absolute file path. */
export async function saveAudio(id: string, extension: string, data: Buffer): Promise<string> {
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  await assertEnoughDiskSpace(dir, data.byteLength);
  const filePath = pathFor(id, extension);
  await writeFile(filePath, data);
  return filePath;
}

/** Read the stored audio bytes for a job (worker side). */
export async function readAudio(filePath: string): Promise<Buffer> {
  return readFile(filePath);
}

/**
 * Delete a stored audio file. Never throws — callers rely on that to run this
 * unconditionally after updating a transcription's DB row. A missing file
 * (ENOENT) is fine and silent; any other error (permissions, disk issue) is a
 * real problem — the DB row will show `audioPath: null` regardless, so
 * without logging it here the file would be silently orphaned on disk with
 * nothing left pointing at it.
 */
export async function deleteAudio(filePath: string | null | undefined): Promise<void> {
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    logger.error('Failed to delete audio file', {
      filePath,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
