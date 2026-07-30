// mimeType: "image/jpeg" comprime mucho más, pero rellena de negro las zonas
// transparentes. Para un logo hay que pasar "image/png" y conservarlas.
export async function compressImage(
  file: File,
  maxDimension = 1920,
  quality = 0.8,
  mimeType = "image/jpeg"
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    ctx.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la imagen"))),
        mimeType,
        quality
      );
    });
  } finally {
    bitmap.close();
  }
}

// Convierte un Blob en data URI ("data:image/png;base64,..."), el formato en
// el que se guarda el logo de la obra (viaja como texto dentro de la fila y
// se incrusta tal cual en el HTML del informe).
export function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}
