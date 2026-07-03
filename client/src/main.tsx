import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { initSyncEngine } from "./sync/syncEngine";
import { initNativeAuth } from "./native/auth";
import { NativeAuthGate } from "./native/NativeAuthGate";
import "./index.css";

const queryClient = new QueryClient();

// En el APK, el token de sesión se lee de disco antes de arrancar nada:
// el motor de sync y el gate de login dependen de él. En web,
// initNativeAuth() no hace nada y el arranque es el de siempre.
void initNativeAuth().then(() => {
  initSyncEngine();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <NativeAuthGate>
          <App />
        </NativeAuthGate>
      </QueryClientProvider>
    </StrictMode>
  );
});
