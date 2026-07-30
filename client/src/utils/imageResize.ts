// Dibuja la imagen en un canvas, reducida para que su lado mayor no pase de
// maxDimension. Base común de la compresión de fotos y de logos.
async function dibujarEnCanvas(file: File, maxDimension: number): Promise<HTMLCanvasElement> {
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
    return canvas;
  } finally {
    bitmap.close();
  }
}

function canvasABlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la imagen"))),
      mimeType,
      quality
    );
  });
}

// ¿Todos los píxeles son opacos? Si lo son, la imagen se puede guardar en
// JPEG (mucho más ligero); si hay transparencia hace falta PNG para no
// rellenarla de negro.
function esTotalmenteOpaca(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  try {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return false;
    }
    return true;
  } catch {
    // Si no se puede leer el canvas, se asume que puede haber transparencia
    // (PNG): es la opción segura, solo pesa más.
    return false;
  }
}

export async function compressImage(
  file: File,
  maxDimension = 1920,
  quality = 0.8,
  mimeType = "image/jpeg"
): Promise<Blob> {
  const canvas = await dibujarEnCanvas(file, maxDimension);
  return canvasABlob(canvas, mimeType, quality);
}

// El logo de la obra viaja como texto (data URI) dentro de la propia fila, y
// esa fila se reenvía completa en cada sincronización: cuanto más ligero,
// mejor. Por eso se elige el formato según la imagen — JPEG si es opaca
// (el caso típico de un logo sobre fondo blanco, muchísimo más pequeño que
// PNG cuando hay degradados), y PNG solo si tiene transparencia real.
export async function compressLogo(file: File, maxDimension = 400): Promise<Blob> {
  const canvas = await dibujarEnCanvas(file, maxDimension);
  const mimeType = esTotalmenteOpaca(canvas) ? "image/jpeg" : "image/png";
  return canvasABlob(canvas, mimeType, 0.85);
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
