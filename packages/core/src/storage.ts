import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';

/**
 * Local-filesystem audio storage (replaces cloud object storage). Audio is
 * transient — written on upload, read once by the worker, then deleted; only
 * the transcribed text is kept long-term.
 */

function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.resolve(process.cwd(), 'data', 'uploads');
}

function pathFor(id: string, extension: string): string {
  const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return path.join(uploadsDir(), `${id}.${safeExt}`);
}

/** Persist audio bytes for a transcription; returns the absolute file path. */
export async function saveAudio(id: string, extension: string, data: Buffer): Promise<string> {
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  const filePath = pathFor(id, extension);
  await writeFile(filePath, data);
  return filePath;
}

/** Read the stored audio bytes for a job (worker side). */
export async function readAudio(filePath: string): Promise<Buffer> {
  return readFile(filePath);
}

/** Delete a stored audio file. Never throws — a missing file is fine. */
export async function deleteAudio(filePath: string | null | undefined): Promise<void> {
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch {
    // already gone — nothing to do
  }
}
