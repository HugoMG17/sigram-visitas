import { Directory, Filesystem } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import { apiClient } from "../api/client";
import { musaatPdfUrl } from "../api/musaat";
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
  await bajarYAbrir(pdfUrl(visitaId), `informe-visita-${visitaId}.pdf`);
}

// La lista de Musaat, con el filtro y la búsqueda que se estén viendo.
export async function descargarYAbrirListaMusaat(opciones: {
  estado?: string;
  busqueda?: string;
}): Promise<void> {
  const fecha = new Date().toISOString().slice(0, 10);
  await bajarYAbrir(musaatPdfUrl(opciones), `${fecha}-musaat.pdf`);
}

async function bajarYAbrir(url: string, nombre: string): Promise<void> {
  const res = await apiClient.get<Blob>(url, { responseType: "blob" });
  const base64 = await blobToBase64(res.data);
  await Filesystem.writeFile({ path: nombre, data: base64, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: nombre, directory: Directory.Cache });
  await FileOpener.open({ filePath: uri, contentType: "application/pdf" });
}
