import fs from "node:fs/promises";
import path from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import { isImageMime } from "@sigram/shared";
import { renderInformeVisitaHtml } from "../templates/informe-visita.js";
import type { adjuntos, obras, puntos, visitas } from "../db/schema.js";
import { env } from "../env.js";
import { buildOAuthClient, downloadFromDrive } from "./driveService.js";
import type { AuthUser } from "../auth/passport.js";

type ObraRow = typeof obras.$inferSelect;
type VisitaRow = typeof visitas.$inferSelect;
type AdjuntoRow = typeof adjuntos.$inferSelect;
type PuntoRow = typeof puntos.$inferSelect;

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      // Necesario en contenedores Docker: el sandbox de Chrome requiere
      // capacidades del kernel que no suele haber en contenedores, y el
      // tamaño por defecto de /dev/shm ahí es demasiado pequeño.
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

// Chrome bloquea cargar recursos file:// desde un documento inyectado con
// page.setContent() (origen opaco), así que las fotos se incrustan como
// base64 en el propio HTML en vez de referenciarse por ruta de disco.
async function toDataUriLocal(rutaRelativa: string, mimeType: string): Promise<string | undefined> {
  try {
    const absolute = path.join(env.uploadsDir, ...rutaRelativa.split("/"));
    const buffer = await fs.readFile(absolute);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function toDataUriDrive(auth: ReturnType<typeof buildOAuthClient>, fileId: string): Promise<string | undefined> {
  try {
    const { buffer, mimeType } = await downloadFromDrive(auth, fileId);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function generateInformeVisitaPdf(params: {
  obra: ObraRow;
  visita: VisitaRow;
  adjuntos: AdjuntoRow[];
  puntos: PuntoRow[];
  numeroVisita: number;
  user?: AuthUser;
}): Promise<Buffer> {
  const auth = params.user ? buildOAuthClient(params.user) : undefined;
  const adjuntosConDataUri = await Promise.all(
    params.adjuntos.map(async (adjunto) => {
      if (!isImageMime(adjunto.mimeType)) return adjunto;
      let dataUri: string | undefined;
      if (adjunto.driveThumbnailId || adjunto.driveFileId) {
        if (auth) {
          dataUri = await toDataUriDrive(auth, adjunto.driveThumbnailId ?? adjunto.driveFileId!);
        }
      } else if (adjunto.rutaThumbnail || adjunto.rutaServidor) {
        const rutaImagen = (adjunto.rutaThumbnail ?? adjunto.rutaServidor)!;
        const mimeThumb = adjunto.rutaThumbnail ? "image/jpeg" : adjunto.mimeType;
        dataUri = await toDataUriLocal(rutaImagen, mimeThumb);
      }
      return { ...adjunto, dataUri };
    })
  );

  const html = renderInformeVisitaHtml({ ...params, adjuntos: adjuntosConDataUri });
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "16mm", right: "16mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
