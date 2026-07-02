import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SyncBadge } from "./SyncBadge";
import { AuthStatus } from "./AuthStatus";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className="app-header">
        <Link to="/">SIGRAM VISITAS</Link>
        <div className="stack" style={{ gap: "0.3rem", alignItems: "flex-end" }}>
          <AuthStatus />
          <SyncBadge />
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
