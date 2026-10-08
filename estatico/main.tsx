/**
 * Entrada del SITIO ESTÁTICO (GitHub Pages). Sin TanStack Start ni servidor:
 * React + las mismas vistas (Tesorería Bitcoin, Banca, APY Fast).
 * Navegación con "#/..." (src/lib/rutas.ts) para que funcione al recargar.
 * Se construye con:  npm run build:pages   →  carpeta sitio/
 */
import { StrictMode, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NexusApp } from "@/components/nexus/shell";
import "@/styles.css";

function Proveedores({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <Proveedores>
      <NexusApp />
    </Proveedores>
  </StrictMode>,
);
