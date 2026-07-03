import { Directory, Filesystem } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import { apiClient } from "../api/client";
import { pdfUrl } from "../api/visitas";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      // reader.result es un data URI ("data:application/pdf;base64,....");
      // Filesystem espera solo la parte base64.
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

// En el APK un <a href> al PDF no sirve: no lleva el token Bearer y el
// WebView tampoco gestiona descargas. Se baja el PDF vía axios (que sí va
// autenticado), se escribe en la caché de la app y se abre con el visor de
// PDF del sistema.
export async function descargarYAbrirPdf(visitaId: string): Promise<void> {
  const res = await apiClient.get<Blob>(pdfUrl(visitaId), { responseType: "blob" });
  const base64 = await blobToBase64(res.data);
  const path = `informe-visita-${visitaId}.pdf`;
  await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
  await FileOpener.open({ filePath: uri, contentType: "application/pdf" });
}
