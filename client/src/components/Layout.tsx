import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SyncBadge } from "./SyncBadge";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className="app-header">
        <Link to="/">SIGRAM VISITAS</Link>
        <SyncBadge />
      </header>
      <main className="page">{children}</main>
    </div>
  );
}
