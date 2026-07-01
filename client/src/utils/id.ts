// crypto.randomUUID() solo existe en contextos seguros (HTTPS o localhost).
// Al abrir la app desde el móvil vía http://<ip-local>:puerto no es un contexto
// seguro y esa función no existe, así que hay que construir el UUID a mano con
// crypto.getRandomValues(), que sí funciona en cualquier contexto.
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
