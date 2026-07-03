import { useState, type ReactNode } from "react";
import { getNativeToken, loginNativo } from "./auth";
import { isNative } from "./platform";

// En el APK, sin token guardado no hay sesión posible: se muestra la
// pantalla de login en vez de la app. Tras el primer login el token queda
// en el dispositivo y la app entra directa, con o sin conexión (los datos
// offline viven en Dexie). En web este gate no interviene.
export function NativeAuthGate({ children }: { children: ReactNode }) {
  const [opening, setOpening] = useState(false);

  if (!isNative || getNativeToken()) return <>{children}</>;

  async function handleLogin() {
    setOpening(true);
    try {
      await loginNativo();
    } finally {
      setOpening(false);
    }
  }

  return (
    <div
      className="stack"
      style={{
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      {/* Sin border-radius: en el WebView de Android, redondear una imagen
          directamente suele provocar parpadeos de repintado. */}
      <img src="/icons/icon-512.png" alt="" width={96} height={96} />
      <h1 style={{ margin: 0 }}>SIGRAM VISITAS</h1>
      <p className="muted" style={{ maxWidth: 320 }}>
        Inicia sesión con tu cuenta de Google para empezar. Solo hace falta la
        primera vez: después la app funciona también sin conexión.
      </p>
      <button type="button" className="btn" onClick={handleLogin} disabled={opening}>
        {opening ? "Abriendo Google…" : "Iniciar sesión con Google"}
      </button>
    </div>
  );
}
