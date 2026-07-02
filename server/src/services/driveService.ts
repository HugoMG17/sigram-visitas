import { Readable } from "node:stream";
import { google } from "googleapis";
import { env } from "../env.js";
import type { AuthUser } from "../auth/passport.js";
import { generateThumbnail } from "./fileService.js";

// Tipo derivado del propio "google" importado arriba (en vez de importarlo
// de google-auth-library) para evitar que TypeScript vea dos declaraciones
// distintas de OAuth2Client si acaban instaladas dos copias del paquete.
type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

// La carpeta "SIGRAM VISITAS" vive en el Drive de cada usuario, así que el
// caché de su id tiene que estar indexado por usuario -- una única variable
// de módulo compartida haría que la carpeta encontrada para el usuario A se
// reutilizara (con el token de B) para el usuario B.
const folderIdPromises = new Map<string, Promise<string>>();

export function buildOAuthClient(user: AuthUser): OAuth2Client {
  const client = new google.auth.OAuth2(env.googleClientId, env.googleClientSecret);
  client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });
  return client;
}

async function getOrCreateAppFolder(auth: OAuth2Client, userEmail: string): Promise<string> {
  const cached = folderIdPromises.get(userEmail);
  if (cached) return cached;

  const promise = (async () => {
    const drive = google.drive({ version: "v3", auth });
    const existing = await drive.files.list({
      q: "name='SIGRAM VISITAS' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: "files(id)",
      spaces: "drive",
    });
    const found = existing.data.files?.[0]?.id;
    if (found) return found;

    const created = await drive.files.create({
      requestBody: { name: "SIGRAM VISITAS", mimeType: "application/vnd.google-apps.folder" },
      fields: "id",
    });
    if (!created.data.id) throw new Error("No se pudo crear la carpeta de Drive");
    return created.data.id;
  })().catch((err) => {
    // Si falla, no se deja la promesa (ni el fallo) cacheada para siempre:
    // se limpia para que el próximo intento vuelva a consultar Drive de cero.
    folderIdPromises.delete(userEmail);
    throw err;
  });

  folderIdPromises.set(userEmail, promise);
  return promise;
}

export async function uploadToDrive(params: {
  auth: OAuth2Client;
  userEmail: string;
  name: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<string> {
  const drive = google.drive({ version: "v3", auth: params.auth });
  const folderId = await getOrCreateAppFolder(params.auth, params.userEmail);
  const res = await drive.files.create({
    requestBody: { name: params.name, parents: [folderId] },
    media: { mimeType: params.mimeType, body: Readable.from(params.buffer) },
    fields: "id",
  });
  if (!res.data.id) throw new Error("Drive no devolvió un id de fichero");
  return res.data.id;
}

export async function downloadFromDrive(
  auth: OAuth2Client,
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const drive = google.drive({ version: "v3", auth });
  const [content, metadata] = await Promise.all([
    drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" }),
    drive.files.get({ fileId, fields: "mimeType" }),
  ]);
  return {
    buffer: Buffer.from(content.data as ArrayBuffer),
    mimeType: metadata.data.mimeType ?? "application/octet-stream",
  };
}

export async function deleteFromDrive(auth: OAuth2Client, fileId: string): Promise<void> {
  const drive = google.drive({ version: "v3", auth });
  await drive.files.delete({ fileId }).catch(() => undefined);
}

export interface SavedDriveAttachment {
  driveFileId: string;
  driveThumbnailId?: string;
  width?: number;
  height?: number;
}

export async function saveAttachmentToDrive(params: {
  auth: OAuth2Client;
  userEmail: string;
  adjuntoId: string;
  mimeType: string;
  originalName: string;
  buffer: Buffer;
}): Promise<SavedDriveAttachment> {
  const driveFileId = await uploadToDrive({
    auth: params.auth,
    userEmail: params.userEmail,
    name: `${params.adjuntoId}_${params.originalName}`,
    mimeType: params.mimeType,
    buffer: params.buffer,
  });

  if (!isImageMime(params.mimeType)) {
    return { driveFileId };
  }

  const thumb = await generateThumbnail(params.buffer);
  const driveThumbnailId = await uploadToDrive({
    auth: params.auth,
    userEmail: params.userEmail,
    name: `${params.adjuntoId}_thumb.jpg`,
    mimeType: "image/jpeg",
    buffer: thumb.buffer,
  });

  return { driveFileId, driveThumbnailId, width: thumb.width, height: thumb.height };
}
