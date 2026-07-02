import { useQuery } from "@tanstack/react-query";
import { fetchAuthStatus, logout } from "../api/auth";

export function AuthStatus() {
  const { data } = useQuery({
    queryKey: ["auth-status"],
    queryFn: fetchAuthStatus,
    retry: false,
  });

  if (!data?.authenticated) return null;

  return (
    <div className="row" style={{ gap: "0.4rem", fontSize: "0.8rem" }}>
      <span className="muted" style={{ color: "#cbd5e1" }}>
        {data.email}
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
        onClick={() => logout()}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
