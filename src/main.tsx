import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { AuthProvider } from "@/lib/auth";
import { RoleProvider } from "@/lib/roles";
import { AppDataProvider } from "@/lib/appData";
import { UIProvider } from "@/lib/ui";
import { initTheme } from "@/lib/theme";

/* Ionic base styles */
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/flex-utils.css";

/* CK design system */
import "@/theme/variables.css";
import "@/theme/index.css";
import "@/theme/ck-look.css";

initTheme();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoleProvider>
          <AppDataProvider>
            <UIProvider>
              <App />
            </UIProvider>
          </AppDataProvider>
        </RoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
