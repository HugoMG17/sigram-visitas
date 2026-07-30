import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SyncBadge } from "./SyncBadge";
import { AuthStatus } from "./AuthStatus";
import { etiquetaEntorno } from "../utils/entorno";
import { ActualizacionApp } from "./ActualizacionApp";

export function Layout({ children }: { children: ReactNode }) {
  // Solo se pinta fuera de producción, para saber de un vistazo que lo que
  // se está usando no es la app real.
  const entorno = etiquetaEntorno();

  return (
    <div>
      <header className="app-header">
        <Link to="/">SIGRAM VISITAS</Link>
        {entorno && (
          <span
            className="badge"
            title="Este NO es el sitio real: los datos que metas aquí son de prueba"
            style={{ background: entorno.color, color: "white", marginLeft: "0.5rem" }}
          >
            {entorno.texto}
          </span>
        )}
        <div className="header-right">
          <AuthStatus />
          <SyncBadge />
        </div>
      </header>
      <main className="page">{children}</main>
      <ActualizacionApp />
    </div>
  );
}
