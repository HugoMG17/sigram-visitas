const COMBINING_MARKS = /[̀-ͯ]/g;

// Convierte un texto libre (p. ej. el nombre de una obra) en algo apto para
// un nombre de fichero: sin acentos, sin espacios y sin caracteres que den
// problemas al descargar. Lo usan el informe PDF y el ZIP de fotos.
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
