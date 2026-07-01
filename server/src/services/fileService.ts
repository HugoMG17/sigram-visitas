import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env } from "../env.js";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function resolveExtension(mimeType: string, originalName: string): string {
  const fromName = path.extname(originalName);
  if (fromName) return fromName;
  return EXT_BY_MIME[mimeType] ?? "";
}

export interface SavedAttachment {
  rutaServidor: string;
  rutaThumbnail?: string;
  width?: number;
  height?: number;
}

export async function saveAttachmentFile(params: {
  obraId: string;
  visitaId: string;
  adjuntoId: string;
  mimeType: string;
  originalName: string;
  buffer: Buffer;
}): Promise<SavedAttachment> {
  const dir = path.join(env.uploadsDir, params.obraId, params.visitaId);
  await fs.mkdir(dir, { recursive: true });

  const ext = resolveExtension(params.mimeType, params.originalName);
  const fileName = `${params.adjuntoId}${ext}`;
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, params.buffer);
  const rutaServidor = toPublicPath(filePath);

  if (!isImageMime(params.mimeType)) {
    return { rutaServidor };
  }

  const metadata = await sharp(params.buffer).metadata();
  const thumbPath = path.join(dir, `${params.adjuntoId}_thumb.jpg`);
  await sharp(params.buffer)
    .rotate()
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  return {
    rutaServidor,
    rutaThumbnail: toPublicPath(thumbPath),
    width: metadata.width,
    height: metadata.height,
  };
}

export async function deleteAttachmentFiles(relativePaths: (string | null | undefined)[]) {
  await Promise.all(
    relativePaths
      .filter((p): p is string => Boolean(p))
      .map((relativePath) =>
        fs.rm(path.join(env.uploadsDir, relativePath), { force: true }).catch(() => undefined)
      )
  );
}

function toPublicPath(absolutePath: string): string {
  return path.relative(env.uploadsDir, absolutePath).split(path.sep).join("/");
}
