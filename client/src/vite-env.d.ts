/// <reference types="vite/client" />

// Importación con ?inline: Vite incrusta el fichero como data URI base64 en
// el propio bundle (sin petición ni descodificación de asset aparte).
declare module "*.png?inline" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_NATIVE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
