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
    <div className="row" style={{ gap: "8px" }}>
      <span className="app-bar-email">{data.email}</span>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => logout()}>
        Salir
      </button>
    </div>
  );
}
