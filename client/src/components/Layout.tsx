import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SyncBadge, SyncErrores } from "./SyncBadge";
import { AuthStatus } from "./AuthStatus";
import { etiquetaEntorno } from "../utils/entorno";
import { ActualizacionApp } from "./ActualizacionApp";

export function Layout({ children }: { children: ReactNode }) {
  // Solo se pinta fuera de producción, para saber de un vistazo que lo que
  // se está usando no es la app real.
  const entorno = etiquetaEntorno();

  return (
    <div>
      {/* La barra va sobre el mismo fondo que la página, separada solo por una
          línea. Antes era una franja azul oscura que en el móvil se comía los
          primeros 300 px de pantalla antes de empezar a ver obras. */}
      <header className="app-bar">
        <div className="app-bar-inner">
          <div className="row" style={{ gap: "10px" }}>
            {/* La versión va debajo del nombre. Sirve para saber si una
                actualización ya ha llegado, sin adivinarlo por los cambios. */}
            <Link to="/" className="brand">
              {/* Decorativo: el nombre va justo al lado, así que repetirlo en
                  el alt solo haría que se leyera dos veces en voz alta. */}
              <img
                className="brand-marca"
                src="/brand/sigram-marca.png"
                alt=""
                width={38}
                height={27}
                fetchPriority="high"
              />
              <span className="brand-texto">
                <span className="brand-name" translate="no">
                  SIGRAM APP
                </span>
                <span className="brand-version">v{__APP_VERSION__}</span>
              </span>
            </Link>
            {entorno && (
              <span
                className="chip chip--error"
                title="Este NO es el sitio real: los datos que metas aquí son de prueba"
              >
                {entorno.texto}
              </span>
            )}
          </div>
          <div className="app-bar-right">
            <AuthStatus />
            <SyncBadge />
          </div>
        </div>
      </header>
      <SyncErrores />
      <main className="page">{children}</main>
      <ActualizacionApp />
    </div>
  );
}
