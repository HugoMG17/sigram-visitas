import { Directory, Filesystem } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import { apiClient } from "../api/client";
import { isNative } from "../native/platform";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      // reader.result es un data URI ("data:image/jpeg;base64,...."); a
      // Filesystem solo le interesa la parte de después de la coma.
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function downloadBlobWeb(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

async function saveBlobNative(blob: Blob, fileName: string): Promise<void> {
  const base64 = await blobToBase64(blob);
  await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
  await FileOpener.open({ filePath: uri, contentType: blob.type || "application/octet-stream" });
}

// En web dispara la descarga normal del navegador. En el APK, un <a
// download> no sirve (el WebView no gestiona descargas): se guarda en la
// caché de la app y se abre con el visor del sistema, desde el que el
// usuario puede guardarlo en Galería/Archivos con el propio botón de
// compartir/guardar del visor.
export async function downloadBlob(blob: Blob, fileName: string): Promise<void> {
  if (isNative) {
    await saveBlobNative(blob, fileName);
    return;
  }
  downloadBlobWeb(blob, fileName);
}

// Para ficheros que aún no tenemos en el dispositivo (ya sincronizados,
// solo existen en el servidor/Drive): los pide primero y reutiliza la
// misma lógica de guardado de arriba.
export async function downloadFromUrl(url: string, fileName: string): Promise<void> {
  const res = await apiClient.get<Blob>(url, { responseType: "blob" });
  await downloadBlob(res.data, fileName);
}
